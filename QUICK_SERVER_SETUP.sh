#!/bin/bash
# Quick Server Setup for Chain Academy V2

echo "🚀 Chain Academy V2 - Quick Server Setup"
echo "========================================"

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install essential tools
apt install -y git nginx certbot python3-certbot-nginx ufw fail2ban

# Install PM2
npm install -g pm2

# Create user
useradd -m -s /bin/bash chainacademy
usermod -aG sudo chainacademy

# Create directories
mkdir -p /var/www/chainacademy
chown -R chainacademy:chainacademy /var/www/chainacademy

# Configure firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

# Configure Nginx
cat > /etc/nginx/sites-available/chainacademy << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/chainacademy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Switch to chainacademy user: su - chainacademy"
echo "2. Clone your project to /var/www/chainacademy"
echo "3. Configure .env files"
echo "4. Deploy contracts and start services"