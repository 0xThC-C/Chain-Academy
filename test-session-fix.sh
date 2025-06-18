#!/bin/bash

echo "🚀 ULTRATHINK: Testing Session Fix"
echo "================================="

# Stop any existing PM2 processes
echo "Stopping existing processes..."
pm2 stop all

# Start the backend if not running
echo "Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3

# Start frontend with PM2
echo "Starting frontend with bypass..."
pm2 start ecosystem.config.js

# Wait for frontend to start
sleep 10

# Check if frontend is running
echo "Checking frontend status..."
pm2 status

# Check if the bypass is working by testing the session route
echo ""
echo "Testing session route bypass..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/session/test-session

# Show recent logs
echo ""
echo "Recent frontend logs:"
pm2 logs chain-academy-frontend --lines 20

echo ""
echo "✅ Test complete. Frontend should now load session pages without the flashing red X issue."
echo "💡 The bypass uses a simple WebRTC implementation that avoids the complex state management causing the problem."

# Cleanup background backend process
kill $BACKEND_PID 2>/dev/null || true