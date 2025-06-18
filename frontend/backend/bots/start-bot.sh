#!/bin/bash

# Chain Academy Payment Bot Startup Script
# This script handles the complete setup and startup of the payment bot

set -e  # Exit on any error

echo "=== Chain Academy Payment Bot Startup ==="
echo "Starting at: $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended. Consider using a dedicated user."
fi

# Check Node.js version
print_info "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ to continue."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi
print_info "Node.js version: $(node --version) ✓"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm to continue."
    exit 1
fi

# Navigate to bot directory
BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BOT_DIR"
print_info "Working directory: $BOT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before running the bot."
        print_warning "Required variables: BOT_PRIVATE_KEY, contract addresses, RPC URLs"
        exit 1
    else
        print_error ".env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Validate critical environment variables
print_info "Validating environment configuration..."

required_vars=(
    "BOT_PRIVATE_KEY"
    "BASE_CONTRACT_ADDRESS"
    "OPTIMISM_CONTRACT_ADDRESS"
    "ARBITRUM_CONTRACT_ADDRESS"
    "POLYGON_CONTRACT_ADDRESS"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_error "Please set these variables in your .env file."
    exit 1
fi

print_info "Environment validation passed ✓"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

# Install dependencies if node_modules doesn't exist or if package.json is newer
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_info "Dependencies installed ✓"
else
    print_info "Dependencies up to date ✓"
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_info "Created logs directory"
fi

# Function to check if port is available
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -ln | grep ":$port " >/dev/null; then
            return 1
        fi
    fi
    return 0
}

# Check if the bot is already running
PORT=${PORT:-3001}
if ! check_port $PORT; then
    print_warning "Port $PORT is already in use. The bot might already be running."
    print_info "To check running processes: ps aux | grep payment-automation"
    print_info "To stop existing bot: pkill -f payment-automation"
    
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Startup cancelled."
        exit 1
    fi
fi

# Function to handle cleanup on exit
cleanup() {
    print_info "Shutting down bot..."
    if [ ! -z "$BOT_PID" ]; then
        kill $BOT_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Check if PM2 is available and preferred
if command -v pm2 &> /dev/null && [ "${USE_PM2:-true}" == "true" ]; then
    print_info "Using PM2 for process management..."
    
    # Stop existing PM2 processes for this bot
    pm2 stop chain-academy-bot 2>/dev/null || true
    pm2 delete chain-academy-bot 2>/dev/null || true
    
    # Start with PM2
    pm2 start payment-automation.js --name "chain-academy-bot" --log logs/pm2.log
    
    print_info "Bot started with PM2 ✓"
    print_info "Use 'pm2 logs chain-academy-bot' to view logs"
    print_info "Use 'pm2 stop chain-academy-bot' to stop the bot"
    print_info "Use 'pm2 restart chain-academy-bot' to restart the bot"
    
else
    print_info "Starting bot directly..."
    
    # Start the bot
    NODE_ENV=${NODE_ENV:-production} node payment-automation.js &
    BOT_PID=$!
    
    print_info "Bot started with PID: $BOT_PID ✓"
    print_info "Logs will be written to logs/ directory"
    print_info "Press Ctrl+C to stop the bot"
    
    # Wait for the bot process
    wait $BOT_PID
fi

# Health check function
health_check() {
    local max_attempts=10
    local attempt=1
    
    print_info "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
            print_info "Health check passed ✓"
            return 0
        fi
        
        print_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Wait a moment for the bot to start, then run health check
sleep 5
health_check

if [ $? -eq 0 ]; then
    print_info "=== Chain Academy Payment Bot Started Successfully ==="
    print_info "API available at: http://localhost:$PORT"
    print_info "Health endpoint: http://localhost:$PORT/health"
    print_info "Status endpoint: http://localhost:$PORT/status"
    print_info "Metrics endpoint: http://localhost:$PORT/metrics"
else
    print_error "=== Chain Academy Payment Bot Failed to Start ==="
    exit 1
fi