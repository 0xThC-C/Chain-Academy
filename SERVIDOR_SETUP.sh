#!/bin/bash

# Chain Academy V2 - Setup Completo do Servidor
# Execute: bash SERVIDOR_SETUP.sh

echo "🚀 Chain Academy V2 - Setup Completo do Servidor"
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash SERVIDOR_SETUP.sh"
    exit 1
fi

log "Iniciando setup do servidor..."

# 1. Atualizar sistema
log "1. Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências básicas
log "2. Instalando dependências básicas..."
apt install -y curl wget git htop nano ufw fail2ban

# 3. Configurar firewall
log "3. Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

# 4. Instalar Node.js 18+
log "4. Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verificar versão
NODE_VERSION=$(node --version)
log "Node.js instalado: $NODE_VERSION"

# 5. Instalar PM2
log "5. Instalando PM2..."
npm install -g pm2

# 6. Configurar PM2 para auto-start
log "6. Configurando PM2 auto-start..."
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# 7. Instalar Nginx
log "7. Instalando Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 8. Instalar Certbot (SSL gratuito)
log "8. Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# 9. Criar usuário para aplicação
log "9. Criando usuário 'chainacademy'..."
useradd -m -s /bin/bash chainacademy
usermod -aG sudo chainacademy

# 10. Preparar diretórios
log "10. Preparando estrutura de diretórios..."
mkdir -p /var/www/chainacademy
mkdir -p /var/log/chainacademy
chown -R chainacademy:chainacademy /var/www/chainacademy
chown -R chainacademy:chainacademy /var/log/chainacademy

# 11. Configurar Nginx básico
log "11. Configurando Nginx..."
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Ativar site
ln -s /etc/nginx/sites-available/chainacademy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 12. Criar script de deploy
log "12. Criando script de deploy..."
cat > /home/chainacademy/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploy Chain Academy V2"

# Ir para diretório
cd /var/www/chainacademy

# Se não existir, clonar repositório
if [ ! -d "chain-academy-v2" ]; then
    echo "📥 Clonando repositório..."
    git clone https://github.com/seu-usuario/chain-academy-v2.git
    cd chain-academy-v2
else
    echo "🔄 Atualizando repositório..."
    cd chain-academy-v2
    git pull origin main
fi

# Deploy dos contratos (se necessário)
if [ "$1" = "contracts" ]; then
    echo "📦 Deploy dos contratos..."
    cd contracts
    npm install
    npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
    cd ..
fi

# Frontend
echo "🎨 Build do frontend..."
cd frontend
npm install
npm run build
pm2 restart frontend || pm2 start npm --name "frontend" -- start
cd ..

# Backend + Bot
echo "🤖 Iniciando backend e bot..."
cd backend
npm install
pm2 restart payment-bot || pm2 start bots/start-mainnet-bot.ts --name payment-bot --interpreter ts-node
pm2 restart backend || pm2 start npm --name "backend" -- start
cd ..

# Salvar configuração PM2
pm2 save

echo "✅ Deploy concluído!"
echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs"

EOF

chmod +x /home/chainacademy/deploy.sh
chown chainacademy:chainacademy /home/chainacademy/deploy.sh

# 13. Criar script de monitoramento
log "13. Criando script de monitoramento..."
cat > /usr/local/bin/monitor-chainacademy.sh << 'EOF'
#!/bin/bash

# Monitor Chain Academy
echo "📊 Chain Academy V2 - Status"
echo "============================"

echo "🖥️  Servidor:"
echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "   RAM: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "   Disk: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "🔄 PM2 Processes:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
systemctl is-active nginx

echo ""
echo "📊 Últimos logs:"
echo "Frontend:"
pm2 logs frontend --lines 3 --nostream
echo ""
echo "Bot:"
pm2 logs payment-bot --lines 3 --nostream

EOF

chmod +x /usr/local/bin/monitor-chainacademy.sh

# 14. Configurar cron para monitoramento
log "14. Configurando monitoramento automático..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-chainacademy.sh >> /var/log/chainacademy/monitor.log 2>&1") | crontab -

# 15. Instalar Docker (opcional)
log "15. Instalando Docker (opcional)..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker chainacademy

# 16. Configurações de segurança adicionais
log "16. Aplicando configurações de segurança..."

# Configurar fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban

# Configurar limites do sistema
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
EOF

# 17. Mostrar informações finais
log "Setup concluído! 🎉"
echo ""
echo "📋 INFORMAÇÕES DO SERVIDOR"
echo "=========================="
echo "🌍 IP Público: $(curl -s ifconfig.me)"
echo "🐧 Sistema: $(lsb_release -d | cut -f2)"
echo "⚡ Node.js: $(node --version)"
echo "📦 PM2: $(pm2 --version)"
echo "🌐 Nginx: $(nginx -v 2>&1)"
echo ""
echo "📂 PRÓXIMOS PASSOS:"
echo "1. Configure seu domínio para apontar para: $(curl -s ifconfig.me)"
echo "2. Execute SSL: certbot --nginx -d seu-dominio.com"
echo "3. Faça login como chainacademy: su - chainacademy"
echo "4. Execute deploy: ./deploy.sh"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Monitor: /usr/local/bin/monitor-chainacademy.sh"
echo "- Deploy: /home/chainacademy/deploy.sh"
echo "- PM2 Status: pm2 status"
echo "- Logs: pm2 logs"
echo "- Nginx Status: systemctl status nginx"
echo ""
echo "🔐 SEGURANÇA:"
echo "- Firewall ativo: ufw status"
echo "- Fail2ban ativo: fail2ban-client status"
echo "- SSH na porta 22 (considere mudar)"
echo ""

warn "⚠️  IMPORTANTE:"
warn "1. Mude a senha do usuário 'chainacademy': passwd chainacademy"
warn "2. Configure chaves SSH ao invés de senha"
warn "3. Considere mudar porta SSH padrão"
warn "4. Configure backup automático"

echo ""
log "Setup completo! Servidor pronto para Chain Academy V2 🚀"