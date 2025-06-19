#!/bin/bash

echo "🤖 Starting Chain Academy Payment Bot..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.example to .env and configure your settings"
    exit 1
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Verificar se ts-node está instalado
if ! command -v ts-node &> /dev/null; then
    echo "📦 Installing ts-node..."
    npm install -g ts-node
fi

# Iniciar bot com PM2
pm2 start bots/DailyPaymentBot.ts --name "payment-bot" --interpreter ts-node

echo "✅ Payment bot started successfully!"
echo "Use 'pm2 logs payment-bot' to view logs"
echo "Use 'pm2 stop payment-bot' to stop the bot"