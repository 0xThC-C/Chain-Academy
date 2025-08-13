#!/bin/bash

# Script to enable tokens using Foundry Cast
# IMPORTANT: Set your private key as environment variable: export PRIVATE_KEY=your_key_here

CONTRACT="0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48"
ETH_ADDRESS="0x0000000000000000000000000000000000000000"

echo "🔧 Token Enablement Script using Foundry Cast"
echo "Contract: $CONTRACT"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ ERROR: PRIVATE_KEY environment variable not set!"
    echo "Run: export PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Function to enable a token
enable_token() {
    local network_name=$1
    local rpc_url=$2
    local token_name=$3
    local token_address=$4
    
    echo "🔄 Enabling $token_name on $network_name..."
    
    cast send $CONTRACT \
        "addSupportedToken(address)" \
        $token_address \
        --rpc-url $rpc_url \
        --private-key $PRIVATE_KEY
    
    if [ $? -eq 0 ]; then
        echo "✅ $token_name enabled on $network_name!"
    else
        echo "❌ Failed to enable $token_name on $network_name"
    fi
    echo ""
}

# Arbitrum
echo "🌐 === ARBITRUM ONE ==="
enable_token "Arbitrum" "https://arb1.arbitrum.io/rpc" "ETH" $ETH_ADDRESS
enable_token "Arbitrum" "https://arb1.arbitrum.io/rpc" "USDC" "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
enable_token "Arbitrum" "https://arb1.arbitrum.io/rpc" "USDT" "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

# Base
echo "🔵 === BASE ==="
enable_token "Base" "https://mainnet.base.org" "ETH" $ETH_ADDRESS
enable_token "Base" "https://mainnet.base.org" "USDC" "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
enable_token "Base" "https://mainnet.base.org" "USDT" "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"

# Optimism
echo "🔴 === OPTIMISM ==="
enable_token "Optimism" "https://mainnet.optimism.io" "ETH" $ETH_ADDRESS
enable_token "Optimism" "https://mainnet.optimism.io" "USDC" "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
enable_token "Optimism" "https://mainnet.optimism.io" "USDT" "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"

# Polygon
echo "🟣 === POLYGON ==="
enable_token "Polygon" "https://polygon-rpc.com" "ETH" $ETH_ADDRESS
enable_token "Polygon" "https://polygon-rpc.com" "USDC" "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
enable_token "Polygon" "https://polygon-rpc.com" "USDT" "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

echo "🎉 Script completed!"