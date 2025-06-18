#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Enhanced environment configuration for maximum stability
const ENHANCED_ENV = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=8192 --no-deprecation --unhandled-rejections=warn',
  GENERATE_SOURCEMAP: 'false',
  FAST_REFRESH: 'true',
  CHOKIDAR_USEPOLLING: 'false',
  WATCHPACK_POLLING: 'false',
  ESLINT_NO_DEV_ERRORS: 'true',
  SKIP_PREFLIGHT_CHECK: 'true',
  BROWSER: 'none',
  HOST: '127.0.0.1',
  PORT: '3000',
  DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
  FORCE_COLOR: '1',
  CI: 'false',
  REACT_APP_STRICT_MODE: 'false',
  WDS_SOCKET_HOST: '127.0.0.1',
  WDS_SOCKET_PORT: '3000',
  NODE_ENV: 'development'
};

let restartCount = 0;
let lastStartTime = Date.now();
let healthCheckInterval;

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : '🔧';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function killExistingProcesses() {
  return new Promise((resolve) => {
    log('Cleaning up existing processes...');
    exec('pkill -f "node.*start" || pkill -f "craco start" || pkill -f "react-scripts" || true', (error) => {
      if (error) {
        log('No existing processes found to clean up');
      } else {
        log('Existing processes cleaned up');
      }
      // Wait a bit for processes to fully terminate
      setTimeout(resolve, 2000);
    });
  });
}

function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

function clearNodeModulesCache() {
  log('Clearing node_modules cache for stability...');
  try {
    exec('npm cache clean --force', { cwd: __dirname }, (error) => {
      if (error) {
        log('Cache clean failed, continuing...', 'warn');
      } else {
        log('Cache cleaned successfully');
      }
    });
  } catch (error) {
    log('Cache clean error, continuing...', 'warn');
  }
}

function startHealthMonitoring(child) {
  // Check server health every 30 seconds
  healthCheckInterval = setInterval(async () => {
    const isHealthy = await checkServerHealth();
    if (!isHealthy && child && !child.killed) {
      log('Server health check failed, restarting...', 'warn');
      child.kill('SIGTERM');
    }
  }, 30000);
}

function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

async function startServer() {
  const currentTime = Date.now();
  
  // Prevent rapid restarts (less than 10 seconds apart)
  if (currentTime - lastStartTime < 10000 && restartCount > 0) {
    log('Preventing rapid restart, waiting 10 seconds...', 'warn');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  lastStartTime = currentTime;
  restartCount++;
  
  if (restartCount > 1) {
    log(`🔄 Restart attempt #${restartCount}`);
    await killExistingProcesses();
    
    // Clear cache on multiple restarts
    if (restartCount > 2) {
      clearNodeModulesCache();
    }
  }

  log('🚀 Starting Chain Academy with enhanced stability settings...');
  
  const child = spawn('npm', ['start'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    cwd: __dirname,
    env: ENHANCED_ENV
  });

  let serverStarted = false;
  let startupOutput = '';

  // Monitor stdout for successful startup
  child.stdout.on('data', (data) => {
    const output = data.toString();
    startupOutput += output;
    process.stdout.write(output);
    
    // Detect successful startup
    if (output.includes('webpack compiled') || output.includes('Compiled successfully')) {
      if (!serverStarted) {
        serverStarted = true;
        log('✅ Server compiled successfully!', 'success');
        
        // Start health monitoring after successful startup
        setTimeout(() => {
          startHealthMonitoring(child);
        }, 5000);
        
        // Verify server is responding
        setTimeout(async () => {
          const isHealthy = await checkServerHealth();
          if (isHealthy) {
            log('✅ Server is responding to requests!', 'success');
            log('🌐 Access your application at: http://127.0.0.1:3000', 'success');
          } else {
            log('⚠️ Server compiled but not responding to requests', 'warn');
          }
        }, 3000);
      }
    }
    
    // Detect compilation errors
    if (output.includes('Failed to compile') || output.includes('Module not found')) {
      log('❌ Compilation error detected', 'error');
    }
  });

  // Monitor stderr for errors
  child.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    
    // Log critical errors
    if (output.includes('EADDRINUSE') || output.includes('EACCES')) {
      log('❌ Port or permission error detected', 'error');
    }
  });

  child.on('error', (error) => {
    log(`❌ Failed to start server: ${error.message}`, 'error');
    stopHealthMonitoring();
    
    // Retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, restartCount - 1), 30000);
    log(`🔄 Retrying in ${retryDelay / 1000} seconds...`);
    setTimeout(() => {
      startServer();
    }, retryDelay);
  });

  child.on('exit', (code, signal) => {
    stopHealthMonitoring();
    
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      log('🛑 Server stopped by user', 'info');
      process.exit(0);
    }
    
    if (code !== 0) {
      log(`⚠️ Server exited with code ${code}`, 'warn');
      
      // Check if it's a white screen issue (compilation success but server failure)
      if (serverStarted && startupOutput.includes('Compiled successfully')) {
        log('🔧 Detected white screen issue, applying fixes...', 'warn');
        clearNodeModulesCache();
      }
      
      // Exponential backoff for restarts
      const retryDelay = Math.min(3000 * Math.pow(1.5, restartCount - 1), 30000);
      log(`🔄 Restarting in ${retryDelay / 1000} seconds...`);
      setTimeout(() => {
        startServer();
      }, retryDelay);
    }
  });

  // Handle process termination gracefully
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      log(`\n🛑 Received ${signal}, stopping server...`);
      stopHealthMonitoring();
      if (child && !child.killed) {
        child.kill(signal);
      }
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    });
  });
}

// Initial cleanup and start
(async () => {
  await killExistingProcesses();
  startServer();
})();