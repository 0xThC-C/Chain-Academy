module.exports = {
  apps: [{
    name: 'payment-bot-v7',
    script: './bots/start-mainnet-bot.ts',
    cwd: '/home/mathewsl/Chain Academy V2/backend',
    interpreter: 'ts-node',
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 10000,
    max_restarts: 5,
    min_uptime: '10s',
    error_file: './logs/payment-bot-error.log',
    out_file: './logs/payment-bot-out.log',
    log_file: './logs/payment-bot-combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      TS_NODE_PROJECT: './bots/tsconfig.json'
    }
  }]
};