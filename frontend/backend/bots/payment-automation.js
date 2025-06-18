// Chain Academy Daily Payment Bot - Backend Service
// Automatically processes mentor payments after 24 hours

const express = require('express');
const cron = require('node-cron');
const { ethers } = require('ethers');
const winston = require('winston');
const prometheus = require('prom-client');
const { BOT_CONFIG, CHAIN_CONFIGS, validateConfig } = require('./config');

// Initialize metrics
const register = new prometheus.register();
const paymentCounter = new prometheus.Counter({
  name: 'bot_payments_total',
  help: 'Total number of payments processed',
  labelNames: ['chain', 'status']
});
const gasUsedGauge = new prometheus.Gauge({
  name: 'bot_gas_used_total',
  help: 'Total gas used by the bot',
  labelNames: ['chain']
});
const executionDuration = new prometheus.Histogram({
  name: 'bot_execution_duration_seconds',
  help: 'Duration of bot execution in seconds'
});

register.registerMetric(paymentCounter);
register.registerMetric(gasUsedGauge);
register.registerMetric(executionDuration);

// Setup logging
const logger = winston.createLogger({
  level: BOT_CONFIG.MONITORING.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'bot-combined.log' })
  ]
});

class PaymentAutomationService {
  constructor() {
    this.app = express();
    this.isRunning = false;
    this.isPaused = false;
    this.executionHistory = [];
    this.providers = new Map();
    this.wallets = new Map();
    this.contracts = new Map();
    this.cronJob = null;
    
    this.setupExpress();
    this.initializeChains();
  }

  setupExpress() {
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        lastExecution: this.getLastExecution(),
        uptime: process.uptime()
      });
    });
    
    // Metrics endpoint for Prometheus
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });
    
    // Status endpoint with detailed information
    this.app.get('/status', (req, res) => {
      res.json({
        config: {
          executionTime: BOT_CONFIG.EXECUTION_TIME,
          paymentDelayHours: BOT_CONFIG.PAYMENT_DELAY_HOURS,
          supportedChains: BOT_CONFIG.SUPPORTED_CHAINS
        },
        runtime: {
          isRunning: this.isRunning,
          isPaused: this.isPaused,
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage()
        },
        execution: {
          totalExecutions: this.executionHistory.length,
          successfulExecutions: this.executionHistory.filter(e => e.success).length,
          failedExecutions: this.executionHistory.filter(e => !e.success).length,
          lastExecution: this.getLastExecution(),
          recentExecutions: this.executionHistory.slice(0, 10)
        }
      });
    });
    
    // Manual execution endpoint (for testing/emergency)
    this.app.post('/execute', async (req, res) => {
      if (this.isRunning) {
        return res.status(409).json({ error: 'Bot is already running' });
      }
      
      try {
        logger.info('Manual execution triggered via API');
        const result = await this.executePaymentProcess(true);
        res.json({ success: true, result });
      } catch (error) {
        logger.error('Manual execution failed:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Pause/Resume endpoints
    this.app.post('/pause', (req, res) => {
      this.isPaused = true;
      logger.info('Bot paused via API');
      res.json({ success: true, message: 'Bot paused' });
    });
    
    this.app.post('/resume', (req, res) => {
      this.isPaused = false;
      logger.info('Bot resumed via API');
      res.json({ success: true, message: 'Bot resumed' });
    });
    
    // Execution history endpoint
    this.app.get('/history/:limit?', (req, res) => {
      const limit = parseInt(req.params.limit) || 50;
      res.json({
        executions: this.executionHistory.slice(0, limit),
        total: this.executionHistory.length
      });
    });
  }

  async initializeChains() {
    logger.info('Initializing blockchain connections...');
    
    for (const chainConfig of CHAIN_CONFIGS) {
      try {
        // Setup provider
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
        this.providers.set(chainConfig.chainId, provider);
        
        // Setup wallet
        const wallet = new ethers.Wallet(BOT_CONFIG.BOT_PRIVATE_KEY, provider);
        this.wallets.set(chainConfig.chainId, wallet);
        
        // Setup contract
        const contract = new ethers.Contract(
          chainConfig.contractAddress,
          [
            'function autoCompleteSession(uint256 sessionId) external',
            'function getSessionDetails(uint256 sessionId) external view returns (tuple(address mentor, address student, uint256 amount, address token, uint8 status, uint256 completedAt, bool manuallyConfirmed))',
            'function getAllActiveSessions() external view returns (uint256[])',
            'event SessionAutoCompleted(uint256 indexed sessionId, address indexed mentor, uint256 amount)'
          ],
          wallet
        );
        this.contracts.set(chainConfig.chainId, contract);
        
        // Test connection
        const blockNumber = await provider.getBlockNumber();
        logger.info(`Chain ${chainConfig.name} (${chainConfig.chainId}) connected. Block: ${blockNumber}`);
        
      } catch (error) {
        logger.error(`Failed to initialize chain ${chainConfig.chainId}:`, error);
        throw error;
      }
    }
    
    logger.info('All blockchain connections initialized successfully');
  }

  start() {
    try {
      // Validate configuration first
      validateConfig();
      
      // Start the cron job
      const [hour, minute] = BOT_CONFIG.EXECUTION_TIME.split(':').map(Number);
      const cronExpression = `${minute} ${hour} * * *`;
      
      this.cronJob = cron.schedule(cronExpression, async () => {
        await this.executePaymentProcess();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });
      
      this.cronJob.start();
      
      // Start the Express server
      const port = process.env.PORT || 3001;
      this.app.listen(port, () => {
        logger.info(`Payment automation service started on port ${port}`);
        logger.info(`Scheduled execution time: ${BOT_CONFIG.EXECUTION_TIME} UTC (${cronExpression})`);
      });
      
      // Setup process handlers
      this.setupProcessHandlers();
      
    } catch (error) {
      logger.error('Failed to start payment automation service:', error);
      process.exit(1);
    }
  }

  async executePaymentProcess(isManual = false) {
    if (this.isRunning) {
      logger.warn('Payment process already running, skipping');
      return;
    }
    
    if (this.isPaused && !isManual) {
      logger.info('Bot is paused, skipping execution');
      return;
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const executionId = `exec_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution = {
      id: executionId,
      startTime,
      endTime: null,
      success: false,
      isManual,
      results: [],
      error: null,
      totalProcessed: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalGasUsed: BigInt(0)
    };
    
    const timer = executionDuration.startTimer();
    
    try {
      logger.info(`Starting payment process ${executionId} (${isManual ? 'manual' : 'scheduled'})`);
      
      // Step 1: Scan for pending payments
      const pendingPayments = await this.scanPendingPayments();
      logger.info(`Found ${pendingPayments.length} pending payments`);
      
      if (pendingPayments.length === 0) {
        execution.success = true;
        logger.info('No pending payments to process');
        return execution;
      }
      
      // Step 2: Process payments by chain
      const results = [];
      for (const chainId of BOT_CONFIG.SUPPORTED_CHAINS) {
        const chainPayments = pendingPayments.filter(p => p.chainId === chainId);
        if (chainPayments.length === 0) continue;
        
        logger.info(`Processing ${chainPayments.length} payments on chain ${chainId}`);
        const chainResults = await this.processChainPayments(chainId, chainPayments);
        results.push(...chainResults);
        
        // Update metrics
        chainResults.forEach(result => {
          paymentCounter.inc({ 
            chain: chainId.toString(), 
            status: result.success ? 'success' : 'failed' 
          });
          
          if (result.gasUsed) {
            gasUsedGauge.inc({ chain: chainId.toString() }, Number(result.gasUsed));
          }
        });
      }
      
      execution.results = results;
      execution.totalProcessed = results.length;
      execution.successfulPayments = results.filter(r => r.success).length;
      execution.failedPayments = results.filter(r => !r.success).length;
      execution.totalGasUsed = results.reduce((sum, r) => sum + (r.gasUsed || BigInt(0)), BigInt(0));
      execution.success = true;
      
      logger.info(`Payment process completed. Success: ${execution.successfulPayments}, Failed: ${execution.failedPayments}`);
      
      // Send notifications for successful payments
      if (BOT_CONFIG.NOTIFICATION_ENABLED) {
        await this.sendNotifications(results.filter(r => r.success));
      }
      
    } catch (error) {
      execution.error = error.message;
      logger.error(`Payment process ${executionId} failed:`, error);
      
      // Send alert
      await this.sendAlert('Payment process failed', {
        executionId,
        error: error.message,
        stack: error.stack
      });
    } finally {
      timer();
      execution.endTime = Date.now();
      this.isRunning = false;
      
      // Add to history
      this.executionHistory.unshift(execution);
      if (this.executionHistory.length > 1000) {
        this.executionHistory = this.executionHistory.slice(0, 1000);
      }
    }
    
    return execution;
  }

  async scanPendingPayments() {
    const allPendingPayments = [];
    const cutoffTime = Math.floor((Date.now() - (BOT_CONFIG.PAYMENT_DELAY_HOURS * 60 * 60 * 1000)) / 1000);
    
    for (const [chainId, contract] of this.contracts) {
      try {
        logger.debug(`Scanning chain ${chainId} for pending payments...`);
        
        const sessionIds = await contract.getAllActiveSessions();
        logger.debug(`Found ${sessionIds.length} active sessions on chain ${chainId}`);
        
        for (const sessionId of sessionIds) {
          try {
            const sessionDetails = await contract.getSessionDetails(sessionId);
            
            // Check if session is completed but not manually confirmed and past delay period
            if (sessionDetails.status === 2 && // COMPLETED status
                !sessionDetails.manuallyConfirmed &&
                Number(sessionDetails.completedAt) < cutoffTime) {
              
              allPendingPayments.push({
                sessionId: sessionId.toString(),
                mentorAddress: sessionDetails.mentor,
                studentAddress: sessionDetails.student,
                amount: sessionDetails.amount,
                tokenAddress: sessionDetails.token,
                chainId: chainId,
                completedAt: Number(sessionDetails.completedAt)
              });
              
              logger.debug(`Found pending payment: Session ${sessionId} on chain ${chainId}`);
            }
          } catch (error) {
            logger.error(`Error checking session ${sessionId} on chain ${chainId}:`, error);
          }
        }
      } catch (error) {
        logger.error(`Error scanning chain ${chainId}:`, error);
      }
    }
    
    return allPendingPayments;
  }

  async processChainPayments(chainId, payments) {
    const contract = this.contracts.get(chainId);
    const results = [];
    
    for (const payment of payments) {
      try {
        logger.info(`Processing payment for session ${payment.sessionId} on chain ${chainId}`);
        
        // Estimate gas
        const gasEstimate = await contract.autoCompleteSession.estimateGas(payment.sessionId);
        const gasLimit = gasEstimate + (gasEstimate / BigInt(10)); // Add 10% buffer
        
        // Get current gas price
        const chainConfig = CHAIN_CONFIGS.find(c => c.chainId === chainId);
        const feeData = await contract.runner.provider.getFeeData();
        
        // Execute transaction
        const tx = await contract.autoCompleteSession(payment.sessionId, {
          gasLimit,
          maxFeePerGas: chainConfig?.maxFeePerGas || feeData.maxFeePerGas,
          maxPriorityFeePerGas: chainConfig?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas
        });
        
        logger.info(`Transaction sent: ${tx.hash} for session ${payment.sessionId}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          results.push({
            sessionId: payment.sessionId,
            success: true,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed,
            chainId: chainId,
            mentorAddress: payment.mentorAddress,
            amount: payment.amount.toString(),
            timestamp: Date.now()
          });
          
          logger.info(`Payment successful: ${tx.hash}`);
        } else {
          throw new Error('Transaction failed');
        }
        
      } catch (error) {
        logger.error(`Payment failed for session ${payment.sessionId}:`, error);
        
        results.push({
          sessionId: payment.sessionId,
          success: false,
          error: error.message,
          chainId: chainId,
          mentorAddress: payment.mentorAddress,
          amount: payment.amount.toString(),
          timestamp: Date.now()
        });
      }
      
      // Rate limiting: delay between transactions
      await this.delay(BOT_CONFIG.RATE_LIMITS.DELAY_BETWEEN_TRANSACTIONS);
    }
    
    return results;
  }

  async sendNotifications(successfulPayments) {
    logger.info(`Sending notifications for ${successfulPayments.length} successful payments`);
    
    for (const payment of successfulPayments) {
      try {
        // Here you would integrate with your notification system
        // Examples: email service, Discord webhook, Slack, etc.
        const notificationData = {
          type: 'PAYMENT_COMPLETED',
          sessionId: payment.sessionId,
          mentorAddress: payment.mentorAddress,
          amount: payment.amount,
          transactionHash: payment.transactionHash,
          chainId: payment.chainId,
          timestamp: payment.timestamp
        };
        
        // Log notification (replace with actual notification service)
        logger.info(`Notification prepared for session ${payment.sessionId}:`, notificationData);
        
      } catch (error) {
        logger.error(`Failed to send notification for session ${payment.sessionId}:`, error);
      }
    }
  }

  async sendAlert(subject, data) {
    const alertData = {
      subject,
      timestamp: new Date().toISOString(),
      service: 'Chain Academy Payment Bot',
      data
    };
    
    logger.error(`ALERT - ${subject}:`, alertData);
    
    // Here you would send to your alerting system
    // Examples: PagerDuty, Slack webhook, email, etc.
    if (BOT_CONFIG.MONITORING.ALERT_WEBHOOK_URL) {
      try {
        // Example webhook call (implement based on your alerting system)
        // await fetch(BOT_CONFIG.MONITORING.ALERT_WEBHOOK_URL, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(alertData)
        // });
      } catch (error) {
        logger.error('Failed to send alert webhook:', error);
      }
    }
  }

  setupProcessHandlers() {
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      if (this.cronJob) {
        this.cronJob.stop();
      }
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      if (this.cronJob) {
        this.cronJob.stop();
      }
      process.exit(0);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.sendAlert('Uncaught exception', { error: error.message, stack: error.stack });
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.sendAlert('Unhandled rejection', { reason, promise: promise.toString() });
    });
  }

  getLastExecution() {
    return this.executionHistory.length > 0 ? this.executionHistory[0] : null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    logger.info('Payment automation service stopped');
  }
}

// Start the service
if (require.main === module) {
  const service = new PaymentAutomationService();
  service.start();
}

module.exports = PaymentAutomationService;