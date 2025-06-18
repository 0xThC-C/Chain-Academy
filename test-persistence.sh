#!/bin/bash

# Test script to verify that services survive session termination
echo "=== Chain Academy Persistence Test ==="
echo "This script tests if services survive after task completion/session termination"
echo ""

# Check current status
echo "1. Checking current service status..."
cd "/home/mathewsl/Chain Academy V2"
./start-services.sh status
echo ""

# Test connections
echo "2. Testing HTTP connections..."
echo "Frontend (port 3000):"
if curl -s --max-time 5 http://localhost:3000 >/dev/null; then
    echo "  ✓ Frontend responding"
else
    echo "  ✗ Frontend not responding"
fi

echo "Backend (port 3001):"
if curl -s --max-time 5 http://localhost:3001 >/dev/null; then
    echo "  ✓ Backend responding"
else
    echo "  ✗ Backend not responding"
fi
echo ""

# Check process tree
echo "3. Process tree analysis..."
if [ -f "logs/frontend.pid" ]; then
    frontend_pid=$(cat logs/frontend.pid)
    echo "Frontend process tree:"
    ps --forest -p $frontend_pid -o pid,ppid,cmd 2>/dev/null || echo "  Process not found"
fi

if [ -f "logs/backend.pid" ]; then
    backend_pid=$(cat logs/backend.pid)
    echo "Backend process tree:"
    ps --forest -p $backend_pid -o pid,ppid,cmd 2>/dev/null || echo "  Process not found"
fi
echo ""

# Check if processes are detached from terminal
echo "4. Session independence check..."
echo "Checking if processes are running independently of terminal session..."

# Check if processes have PPID 1 (init) or are session leaders
if [ -f "logs/frontend.pid" ] && [ -f "logs/backend.pid" ]; then
    frontend_pid=$(cat logs/frontend.pid)
    backend_pid=$(cat logs/backend.pid)
    
    frontend_ppid=$(ps -p $frontend_pid -o ppid= 2>/dev/null | tr -d ' ')
    backend_ppid=$(ps -p $backend_pid -o ppid= 2>/dev/null | tr -d ' ')
    
    echo "Frontend PID: $frontend_pid, Parent PID: $frontend_ppid"
    echo "Backend PID: $backend_pid, Parent PID: $backend_ppid"
    
    if [ "$frontend_ppid" = "1" ] || [ "$backend_ppid" = "1" ]; then
        echo "✓ Processes are properly detached from terminal"
    else
        echo "⚠ Processes may still be attached to terminal session"
    fi
fi
echo ""

echo "=== Test Complete ==="
echo ""
echo "To simulate task completion and test persistence:"
echo "1. Note the current PIDs above"
echo "2. Refresh your browser at http://localhost:3000"
echo "3. The page should load normally even after task completion"
echo ""
echo "If you need to stop services: ./start-services.sh stop"
echo "If you need to restart services: ./start-services.sh restart"