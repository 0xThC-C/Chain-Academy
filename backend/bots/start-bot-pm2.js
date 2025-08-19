#!/usr/bin/env node

/**
 * PM2 Launcher for Chain Academy V7 Payment Bot
 * Correctly loads environment variables before starting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment from .env file
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  });
}

console.log('🚀 Starting Chain Academy V7 Payment Bot with PM2...');

// Set required environment for ts-node
process.env.TS_NODE_PROJECT = path.join(__dirname, 'tsconfig.json');

// Import and start the bot
try {
  const { MainnetBotLauncher } = require('./start-mainnet-bot.ts');
  
  async function startBot() {
    const launcher = new MainnetBotLauncher();
    await launcher.initialize();
    await launcher.start();
  }
  
  startBot().catch(error => {
    console.error('💥 Bot startup failed:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('💥 Failed to import bot:', error);
  process.exit(1);
}