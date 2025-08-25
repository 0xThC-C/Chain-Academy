#!/bin/bash

# CHAIN ACADEMY - COMPREHENSIVE SECURITY AUDIT SCRIPT
# Run this script regularly to detect any sensitive data exposures

echo "🔒 CHAIN ACADEMY SECURITY AUDIT"
echo "==============================="
echo "Scanning all tracked files for sensitive data..."
echo ""

VIOLATIONS_FOUND=0

# Define comprehensive patterns
PRIVATE_KEY_64="[0-9a-fA-F]{64}"
PRIVATE_KEY_66="0x[0-9a-fA-F]{64}"
MNEMONIC_PHRASE="([a-z]{3,8}\s){11}[a-z]{3,8}"
DISCORD_WEBHOOK="discord\.com/api/webhooks/[0-9]+/[a-zA-Z0-9_-]+"
INFURA_API="infura\.io/v3/[0-9a-fA-F]{32}"
ALCHEMY_API="alchemy\.com.*[0-9a-fA-F]{32}"
QUICKNODE_API="quicknode\.com.*[0-9a-fA-F]{32}"
ENV_VARS="(PRIVATE_KEY|SECRET_KEY|API_KEY|WEBHOOK_URL).*=.*[0-9a-fA-F]{20,}"

# Function to check pattern and report violations
check_pattern() {
    local pattern="$1"
    local description="$2"
    local files
    
    files=$(git ls-files -z | xargs -0 grep -l -E "$pattern" 2>/dev/null || true)
    
    if [ -n "$files" ]; then
        echo "❌ $description DETECTED:"
        echo "$files" | while read -r file; do
            if [ -n "$file" ]; then
                echo "   📁 $file"
                git ls-files -z | xargs -0 grep -n -E "$pattern" "$file" 2>/dev/null | head -3
            fi
        done
        echo ""
        VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
    fi
}

# Run comprehensive checks
echo "🔍 Checking for private keys (64-char hex)..."
check_pattern "$PRIVATE_KEY_64" "PRIVATE KEY (64-char)"

echo "🔍 Checking for private keys (with 0x prefix)..."
check_pattern "$PRIVATE_KEY_66" "PRIVATE KEY (with 0x)"

echo "🔍 Checking for mnemonic phrases..."
check_pattern "$MNEMONIC_PHRASE" "MNEMONIC PHRASE"

echo "🔍 Checking for Discord webhooks..."
check_pattern "$DISCORD_WEBHOOK" "DISCORD WEBHOOK"

echo "🔍 Checking for Infura API keys..."
check_pattern "$INFURA_API" "INFURA API KEY"

echo "🔍 Checking for Alchemy API keys..."
check_pattern "$ALCHEMY_API" "ALCHEMY API KEY"

echo "🔍 Checking for QuickNode API keys..."
check_pattern "$QUICKNODE_API" "QUICKNODE API KEY"

echo "🔍 Checking for environment variables with secrets..."
check_pattern "$ENV_VARS" "HARDCODED ENV VARIABLES"

# Check for .env files in tracking
echo "🔍 Checking for .env files in git tracking..."
env_files=$(git ls-files | grep -E "\.env$|\.env\." | grep -v "\.example$" | grep -v "\.sample$" || true)
if [ -n "$env_files" ]; then
    echo "❌ .ENV FILES IN TRACKING:"
    echo "$env_files"
    echo ""
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
fi

# Final report
echo "==============================="
if [ $VIOLATIONS_FOUND -eq 0 ]; then
    echo "✅ SECURITY AUDIT PASSED"
    echo "No sensitive data exposures detected."
    echo ""
    echo "Repository is SECURE ✅"
else
    echo "🚨 SECURITY AUDIT FAILED"
    echo "$VIOLATIONS_FOUND violation(s) found!"
    echo ""
    echo "IMMEDIATE ACTION REQUIRED:"
    echo "1. Remove all sensitive data from tracked files"
    echo "2. Use environment variables instead"
    echo "3. Add sensitive files to .gitignore"
    echo "4. Commit the security fixes"
    echo ""
    exit 1
fi

echo ""
echo "🔒 Security audit completed at $(date)"