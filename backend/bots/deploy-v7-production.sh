#!/bin/bash

# Chain Academy V7 Bot Production Deployment Script
# Usage: ./deploy-v7-production.sh

set -e  # Exit on any error

echo "🚀 Chain Academy V7 Bot Production Deployment"
echo "=============================================="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    warning "Running as root. Consider using a dedicated user for the bot."
fi

# Step 1: Environment Check
echo "1️⃣ Checking deployment environment..."

# Check if .env.production-v7 exists
if [ ! -f ".env.production-v7" ]; then
    error ".env.production-v7 file not found. Please create it first."
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18+ required. Current version: $(node --version)"
fi

# Check npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

success "Environment check passed"

# Step 2: Load production environment
echo
echo "2️⃣ Loading production environment..."

# Source the production environment
set -a  # automatically export all variables
source .env.production-v7
set +a

# Validate required variables
REQUIRED_VARS=(
    "BASE_PROGRESSIVE_ESCROW_V7"
    "OPTIMISM_PROGRESSIVE_ESCROW_V7"
    "ARBITRUM_PROGRESSIVE_ESCROW_V7"
    "POLYGON_PROGRESSIVE_ESCROW_V7"
    "BOT_PRIVATE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        error "Required environment variable $var is not set"
    fi
done

success "Production environment loaded"

# Step 3: Pre-deployment tests
echo
echo "3️⃣ Running pre-deployment tests..."

# TypeScript compilation
echo "Checking TypeScript compilation..."
npm run bot:compile

# V7 bot test
echo "Running V7 bot tests..."
npm run bot:v7:test > /tmp/bot-test.log 2>&1
if [ $? -eq 0 ]; then
    success "Bot tests passed"
else
    error "Bot tests failed. Check /tmp/bot-test.log for details"
fi

# Step 4: Stop existing bot (if running)
echo
echo "4️⃣ Stopping existing bot instance..."

if pm2 describe payment-bot > /dev/null 2>&1; then
    echo "Stopping existing payment-bot..."
    pm2 stop payment-bot
    pm2 delete payment-bot
    success "Existing bot stopped"
else
    echo "No existing bot instance found"
fi

# Step 5: Create data directory
echo
echo "5️⃣ Setting up data directory..."

mkdir -p data
mkdir -p logs
chmod 755 data logs

# Initialize session tracker if it doesn't exist
if [ ! -f "data/session-tracker.json" ]; then
    echo '{
  "sessions": [],
  "lastFullScan": 0,
  "scanInterval": 21600000,
  "migratedFrom": "v4",
  "deploymentDate": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
}' > data/session-tracker.json
    success "Session tracker initialized"
fi

# Step 6: Deploy V7 bot
echo
echo "6️⃣ Deploying V7 bot..."

# Copy production environment to .env
cp .env.production-v7 .env

# Start bot with PM2
pm2 start bots/start-mainnet-bot.ts \
    --name payment-bot-v7 \
    --interpreter ts-node \
    --restart-delay 10000 \
    --max-restarts 5 \
    --env production

success "V7 bot deployed with PM2"

# Step 7: Verify deployment
echo
echo "7️⃣ Verifying deployment..."

sleep 5  # Wait for bot to initialize

# Check if bot is running
if pm2 describe payment-bot-v7 | grep -q "online"; then
    success "Bot is running"
else
    error "Bot failed to start. Check logs: pm2 logs payment-bot-v7"
fi

# Check logs for errors
if pm2 logs payment-bot-v7 --lines 10 | grep -i error; then
    warning "Errors detected in logs. Please review."
else
    success "No immediate errors in logs"
fi

# Step 8: Final status
echo
echo "8️⃣ Deployment Summary"
echo "===================="

echo "📊 Bot Status:"
pm2 describe payment-bot-v7 | grep -E "(status|uptime|restarts)"

echo
echo "🔗 Contract Addresses:"
echo "   Base:     $BASE_PROGRESSIVE_ESCROW_V7"
echo "   Optimism: $OPTIMISM_PROGRESSIVE_ESCROW_V7"
echo "   Arbitrum: $ARBITRUM_PROGRESSIVE_ESCROW_V7"
echo "   Polygon:  $POLYGON_PROGRESSIVE_ESCROW_V7"

echo
echo "📁 Important Files:"
echo "   Configuration: .env"
echo "   Session Tracker: data/session-tracker.json"
echo "   Logs: logs/payment-bot*.log"

echo
echo "🛠️ Management Commands:"
echo "   Status:  pm2 status payment-bot-v7"
echo "   Logs:    pm2 logs payment-bot-v7"
echo "   Stop:    pm2 stop payment-bot-v7"
echo "   Restart: pm2 restart payment-bot-v7"
echo "   Health:  npm run bot:v7:health"

echo
success "🎉 V7 Bot Production Deployment Complete!"

echo
echo "⚠️ Post-Deployment Checklist:"
echo "   □ Monitor logs for the first 30 minutes"
echo "   □ Verify wallet has sufficient gas on all chains"
echo "   □ Set up monitoring alerts"
echo "   □ Schedule regular health checks"
echo "   □ Configure log rotation"
echo "   □ Backup session tracker data"

echo
echo "📞 Support: Check README.md for troubleshooting"