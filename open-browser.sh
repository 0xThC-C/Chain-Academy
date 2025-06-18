#!/bin/bash

# Chain Academy V2 - Browser Launcher
echo "🚀 Opening Chain Academy V2 in your default browser..."
echo "📍 URL: http://127.0.0.1:3000"
echo ""

# Check if application is running
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 | grep -q "200"; then
    echo "✅ Application is running successfully"
    
    # Try to open in browser (works in WSL with Windows browser)
    if command -v cmd.exe >/dev/null 2>&1; then
        # WSL environment - open with Windows browser
        cmd.exe /c start http://127.0.0.1:3000
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux with desktop environment
        xdg-open http://127.0.0.1:3000
    elif command -v open >/dev/null 2>&1; then
        # macOS
        open http://127.0.0.1:3000
    else
        echo "🌐 Please manually open: http://127.0.0.1:3000"
    fi
else
    echo "❌ Application is not responding"
    echo "🔧 Try running: pm2 restart chain-academy-frontend"
fi

echo ""
echo "💡 Useful commands:"
echo "   pm2 status                 - Check application status"
echo "   pm2 logs chain-academy     - View application logs"
echo "   pm2 restart chain-academy  - Restart application"
echo "   pm2 stop chain-academy     - Stop application"