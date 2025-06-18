#!/bin/bash

# Chain Academy Services Startup Script
# This script starts frontend and backend services in a way that survives session termination

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOGS_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep ":$port " >/dev/null
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln | grep ":$port " >/dev/null
    else
        # Fallback: try to connect to the port
        (echo >/dev/tcp/localhost/$port) >/dev/null 2>&1
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "Checking for processes on port $port..."
    
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo "Killing processes on port $port: $pids"
            echo $pids | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    else
        # Fallback method
        local pids=$(ps aux | grep -E "node.*$port|npm.*start" | grep -v grep | awk '{print $2}')
        if [ ! -z "$pids" ]; then
            echo "Killing processes: $pids"
            echo $pids | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi
}

# Function to start backend
start_backend() {
    echo "Starting backend service..."
    
    # Kill any existing backend processes
    kill_port 3001
    
    # Check if backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        echo "Backend directory not found: $BACKEND_DIR"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Start backend with nohup and setsid for complete session independence
    setsid nohup npm run dev > "$LOGS_DIR/backend.log" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$LOGS_DIR/backend.pid"
    
    echo "Backend started with PID: $backend_pid"
    echo "Backend logs: $LOGS_DIR/backend.log"
    
    # Wait a moment and check if it's still running
    sleep 3
    if kill -0 $backend_pid 2>/dev/null; then
        echo "Backend is running successfully"
        return 0
    else
        echo "Backend failed to start"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo "Starting frontend service..."
    
    # Kill any existing frontend processes
    kill_port 3000
    
    # Check if frontend directory exists
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo "Frontend directory not found: $FRONTEND_DIR"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Start frontend with nohup and setsid for complete session independence
    setsid nohup npm start > "$LOGS_DIR/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$LOGS_DIR/frontend.pid"
    
    echo "Frontend started with PID: $frontend_pid"
    echo "Frontend logs: $LOGS_DIR/frontend.log"
    
    # Wait a moment and check if it's still running
    sleep 5
    if kill -0 $frontend_pid 2>/dev/null; then
        echo "Frontend is running successfully"
        return 0
    else
        echo "Frontend failed to start"
        return 1
    fi
}

# Function to check service status
check_services() {
    echo "Checking service status..."
    
    # Check backend
    if [ -f "$LOGS_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOGS_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            echo "✓ Backend is running (PID: $backend_pid)"
            if check_port 3001; then
                echo "✓ Backend port 3001 is active"
            else
                echo "⚠ Backend process running but port 3001 not responding"
            fi
        else
            echo "✗ Backend process not running"
        fi
    else
        echo "✗ Backend PID file not found"
    fi
    
    # Check frontend
    if [ -f "$LOGS_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOGS_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            echo "✓ Frontend is running (PID: $frontend_pid)"
            if check_port 3000; then
                echo "✓ Frontend port 3000 is active"
            else
                echo "⚠ Frontend process running but port 3000 not responding"
            fi
        else
            echo "✗ Frontend process not running"
        fi
    else
        echo "✗ Frontend PID file not found"
    fi
}

# Function to stop services
stop_services() {
    echo "Stopping Chain Academy services..."
    
    # Stop backend
    if [ -f "$LOGS_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOGS_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            echo "Stopping backend (PID: $backend_pid)..."
            kill -TERM $backend_pid 2>/dev/null
            sleep 3
            if kill -0 $backend_pid 2>/dev/null; then
                echo "Force killing backend..."
                kill -9 $backend_pid 2>/dev/null
            fi
        fi
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    # Stop frontend
    if [ -f "$LOGS_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOGS_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            echo "Stopping frontend (PID: $frontend_pid)..."
            kill -TERM $frontend_pid 2>/dev/null
            sleep 3
            if kill -0 $frontend_pid 2>/dev/null; then
                echo "Force killing frontend..."
                kill -9 $frontend_pid 2>/dev/null
            fi
        fi
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    # Clean up any remaining processes on the ports
    kill_port 3000
    kill_port 3001
    
    echo "Services stopped"
}

# Function to restart services
restart_services() {
    echo "Restarting Chain Academy services..."
    stop_services
    sleep 2
    start_backend
    sleep 3
    start_frontend
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend")
            if [ -f "$LOGS_DIR/backend.log" ]; then
                echo "=== Backend Logs (last 50 lines) ==="
                tail -n 50 "$LOGS_DIR/backend.log"
            else
                echo "Backend log file not found"
            fi
            ;;
        "frontend")
            if [ -f "$LOGS_DIR/frontend.log" ]; then
                echo "=== Frontend Logs (last 50 lines) ==="
                tail -n 50 "$LOGS_DIR/frontend.log"
            else
                echo "Frontend log file not found"
            fi
            ;;
        "both"|"all"|"")
            show_logs backend
            echo ""
            show_logs frontend
            ;;
        *)
            echo "Usage: $0 logs [backend|frontend|both]"
            ;;
    esac
}

# Main script logic
case "${1:-start}" in
    "start")
        echo "Starting Chain Academy services..."
        start_backend
        sleep 3
        start_frontend
        echo ""
        check_services
        echo ""
        echo "Chain Academy is now running:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:3001"
        echo ""
        echo "Use '$0 status' to check service status"
        echo "Use '$0 logs' to view logs"
        echo "Use '$0 stop' to stop services"
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        echo ""
        check_services
        ;;
    "status")
        check_services
        ;;
    "logs")
        show_logs "${2}"
        ;;
    "help"|"-h"|"--help")
        echo "Chain Academy Service Manager"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  start     Start frontend and backend services (default)"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  status    Check service status"
        echo "  logs      Show service logs [backend|frontend|both]"
        echo "  help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Start services"
        echo "  $0 start             # Start services"
        echo "  $0 status            # Check if services are running"
        echo "  $0 logs frontend     # Show frontend logs"
        echo "  $0 restart           # Restart all services"
        echo "  $0 stop              # Stop all services"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac