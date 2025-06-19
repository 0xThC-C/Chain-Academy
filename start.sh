#!/bin/bash

# Chain Academy V2 - Auto-start script with PM2
echo "========================================="
echo "  Chain Academy V2 - Starting Services"
echo "========================================="

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found! Installing PM2..."
    npm install -g pm2
fi

# Check if we're in the right directory
if [ ! -f "ecosystem.config.cjs" ]; then
    echo "Error: ecosystem.config.cjs not found!"
    echo "Please run this script from the Chain Academy V2 root directory"
    exit 1
fi

# Stop any existing instances
echo "Stopping any existing instances..."
pm2 delete ecosystem.config.cjs 2>/dev/null || true

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the application with PM2
echo "Starting Chain Academy frontend with PM2..."
pm2 start ecosystem.config.cjs

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# Show status
echo ""
echo "========================================="
echo "  Services Status"
echo "========================================="
pm2 status

echo ""
echo "========================================="
echo "  Useful Commands:"
echo "========================================="
echo "  View logs:    pm2 logs"
echo "  Stop:         pm2 stop all"
echo "  Restart:      pm2 restart all"
echo "  Monitor:      pm2 monit"
echo "========================================="
echo ""
echo "Frontend is running at: http://localhost:3000"
echo ""