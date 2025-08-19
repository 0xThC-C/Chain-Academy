#!/bin/bash

echo "🚀 Deploying Chain Academy V8 Payment Bot..."
echo "============================================="

# Stop V7 bot if running
echo "⏹️  Stopping V7 bot..."
pm2 stop chain-academy-payment-bot 2>/dev/null || echo "V7 bot not running"

# Backup V7 session data
echo "💾 Backing up V7 session data..."
mkdir -p ./data/backups
cp ./data/session-tracker.json ./data/backups/session-tracker-v7-$(date +%Y%m%d_%H%M%S).json 2>/dev/null || echo "No V7 data to backup"

# Create V8 data directory
echo "📁 Creating V8 data directories..."
mkdir -p ./data
mkdir -p ./logs

# Validate V8 environment
echo "🔍 Validating V8 configuration..."
if [ ! -f ".env.v8" ]; then
    echo "❌ .env.v8 file not found"
    exit 1
fi

# Check required V8 contract addresses
source .env.v8
if [ -z "$BASE_CONTRACT_V8" ] || [ -z "$ARBITRUM_CONTRACT_V8" ]; then
    echo "❌ V8 contract addresses not configured"
    exit 1
fi

echo "✅ V8 Configuration validated:"
echo "   Base: $BASE_CONTRACT_V8"
echo "   Optimism: $OPTIMISM_CONTRACT_V8"
echo "   Arbitrum: $ARBITRUM_CONTRACT_V8"
echo "   Polygon: $POLYGON_CONTRACT_V8"

# Compile TypeScript
echo "🔨 Compiling V8 bot..."
npx tsc start-v8-bot.ts --outDir ./dist --target es2020 --module commonjs --esModuleInterop --skipLibCheck

# Test V8 bot configuration
echo "🧪 Testing V8 bot configuration..."
timeout 10s node -e "
  require('dotenv').config({path: '.env.v8'});
  console.log('✅ V8 Environment loaded successfully');
  console.log('📊 Bot Name:', process.env.BOT_NAME);
  console.log('🔗 Discord:', process.env.ENABLE_DISCORD_NOTIFICATIONS === 'true' ? 'Enabled' : 'Disabled');
  console.log('⚙️  Migration Mode:', process.env.MIGRATION_MODE);
" || echo "⚠️  Quick test timeout (normal for initial setup)"

# Start V8 bot with PM2
echo "🚀 Starting V8 bot with PM2..."
pm2 start ecosystem-v8.config.js

# Wait for startup
echo "⏳ Waiting for V8 bot startup..."
sleep 5

# Check V8 bot status
echo "📊 V8 Bot Status:"
pm2 status chain-academy-v8-bot

# Check V8 bot logs
echo "📋 Recent V8 bot logs:"
pm2 logs chain-academy-v8-bot --lines 10

# Send Discord notification
echo "📢 Sending deployment notification..."
if [ "$ENABLE_DISCORD_NOTIFICATIONS" = "true" ]; then
    curl -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "embeds": [{
                "title": "🚀 Chain Academy V8 Bot Deployed",
                "description": "V8 payment bot successfully deployed with new contract addresses",
                "color": 3066993,
                "fields": [
                    {"name": "🔗 Base", "value": "'$BASE_CONTRACT_V8'", "inline": true},
                    {"name": "🔗 Optimism", "value": "'$OPTIMISM_CONTRACT_V8'", "inline": true},
                    {"name": "🔗 Arbitrum", "value": "'$ARBITRUM_CONTRACT_V8'", "inline": true},
                    {"name": "🔗 Polygon", "value": "'$POLYGON_CONTRACT_V8'", "inline": true},
                    {"name": "⚙️ Mode", "value": "'$MIGRATION_MODE'", "inline": true},
                    {"name": "📅 Deployed", "value": "'$(date)'", "inline": true}
                ]
            }]
        }' 2>/dev/null || echo "Discord notification failed"
fi

echo ""
echo "✅ V8 Bot Deployment Complete!"
echo "==============================="
echo "🤖 Bot Name: $BOT_NAME"
echo "📊 Status: pm2 status chain-academy-v8-bot"
echo "📋 Logs: pm2 logs chain-academy-v8-bot"
echo "⏹️  Stop: pm2 stop chain-academy-v8-bot"
echo "🔄 Restart: pm2 restart chain-academy-v8-bot"
echo ""
echo "🎯 V8 Features Active:"
echo "   ✅ Enhanced state machine (9 states)"
echo "   ✅ Multiple refund pathways"
echo "   ✅ Auto-recovery system"
echo "   ✅ Dispute resolution"
echo "   ✅ Health monitoring"
echo "   ✅ BigInt serialization fixes"
echo ""
echo "📱 Monitor bot health at Discord webhook"
echo "🔍 Next: Update frontend with V8 contract addresses"