/**
 * PM2 Ecosystem Configuration for ProgressiveEscrowV8 Bot
 * Enhanced payment processing with comprehensive monitoring
 */

module.exports = {
  apps: [
    {
      name: 'chain-academy-v8-bot',
      script: 'ts-node',
      args: 'start-v8-bot.ts',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      
      // V8 Environment
      env: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_TRANSPILE_ONLY: 'true'
      },
      
      // Enhanced V8 Monitoring
      monitoring: true,
      pmx: true,
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '1G',
      
      // V8 Logging configuration
      log_file: './logs/v8-bot-combined.log',
      out_file: './logs/v8-bot-out.log',
      error_file: './logs/v8-bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // V8 Performance settings
      node_args: [
        '--max-old-space-size=2048',
        '--expose-gc'
      ],
      
      // V8 Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // V8 Restart strategies
      restart_delay: 5000,
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'data',
        '.git'
      ],
      
      // V8 Error handling
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // V8 Environment variables (loaded from .env.v8)
      env_file: './.env.v8'
    }
  ],
  
  // PM2 Deploy configuration for V8
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['server1.chainacademy.io'],
      ref: 'origin/master',
      repo: 'git@github.com:chainacademy/backend.git',
      path: '/var/www/chainacademy-v8',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem-v8.config.js --env production',
      'pre-setup': 'apt update && apt install git nodejs npm -y',
      'post-setup': 'ls -la'
    }
  }
};