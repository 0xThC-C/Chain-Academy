#!/bin/bash

# Start frontend with PM2 in daemon mode
echo "[Chain Academy] Starting frontend with PM2..."

cd frontend

# Stop any existing frontend process
pm2 stop chain-academy-frontend 2>/dev/null || true
pm2 delete chain-academy-frontend 2>/dev/null || true

# Start frontend with PM2
pm2 start npm --name "chain-academy-frontend" -- start

# Show process status
pm2 status

echo "[Chain Academy] Frontend is running in background with PM2"
echo "Use 'pm2 logs chain-academy-frontend' to see logs"
echo "Use 'pm2 stop chain-academy-frontend' to stop"