# ✅ Production Deployment Checklist - Chain Academy V2

## 🎯 Pre-Production Requirements

### 💰 1. Funding Requirements
- [ ] **Deploy Wallet**: 0.05 ETH total across 4 L2s (~$150-200)
  - [ ] Base: 0.015 ETH
  - [ ] Optimism: 0.01 ETH  
  - [ ] Arbitrum: 0.01 ETH
  - [ ] Polygon: 0.015 ETH (higher for MATIC gas)

- [ ] **Bot Wallet**: 0.02 ETH total across 4 L2s (~$60-80)
  - [ ] Base: 0.005 ETH
  - [ ] Optimism: 0.005 ETH
  - [ ] Arbitrum: 0.005 ETH
  - [ ] Polygon: 0.005 ETH

### 🌐 2. Infrastructure Requirements
- [ ] **Domain Registered**: .com/.xyz/ENS domain configured
- [ ] **VPS/Server**: Minimum 2GB RAM, 2 CPU, 50GB SSD
- [ ] **SSL Certificate**: Ready for HTTPS (Let's Encrypt)
- [ ] **DNS Configuration**: A record pointing to server IP

### 🔑 3. Private Keys Generated
- [ ] **Deploy Private Key**: Exported from MetaMask or generated
- [ ] **Bot Private Key**: Different from deploy key (security)
- [ ] **Platform Wallet**: Address to receive 10% fees
- [ ] **Keys Secured**: Stored safely, not in code

---

## 🚀 Step-by-Step Production Deploy

### ✅ Phase 1: Server Setup
```bash
# 1. Download and run server setup
wget https://raw.githubusercontent.com/seu-usuario/chain-academy-v2/main/SERVIDOR_SETUP.sh
sudo bash SERVIDOR_SETUP.sh

# 2. Expected output: "Setup completo! Servidor pronto para Chain Academy V2 🚀"
```

**Verification:**
- [ ] Node.js 18+ installed
- [ ] PM2 installed and configured
- [ ] Nginx running
- [ ] Firewall configured (ports 22, 80, 443, 3000)
- [ ] User 'chainacademy' created

### ✅ Phase 2: SSL & Domain Setup
```bash
# 1. Configure domain in Nginx
sudo nano /etc/nginx/sites-available/chainacademy
# Replace "server_name _;" with "server_name yourdomain.com;"

# 2. Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# 3. Test SSL
curl -I https://yourdomain.com
```

**Verification:**
- [ ] Domain resolves to server IP
- [ ] HTTPS works without warnings
- [ ] HTTP redirects to HTTPS

### ✅ Phase 3: Contract Deployment
```bash
# 1. Switch to chainacademy user
su - chainacademy

# 2. Clone repository
cd /var/www/chainacademy
git clone https://github.com/seu-usuario/chain-academy-v2.git
cd chain-academy-v2

# 3. Configure contracts environment
cd contracts
cp .env.example .env
nano .env
```

**Configure .env:**
```bash
# Deploy settings
PRIVATE_KEY=sua_chave_privada_deploy_sem_0x
PLATFORM_WALLET=0xSeuEnderecoPlataforma

# RPC URLs (can use free endpoints)
BASE_RPC_URL=https://mainnet.base.org
OPTIMISM_RPC_URL=https://mainnet.optimism.io
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com
```

```bash
# 4. Deploy contracts
npm install
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
```

**Expected Output:**
```
✅ DEPLOYMENT SUMMARY:
✅ BASE: 0x1234567890123456789012345678901234567890
✅ OPTIMISM: 0x2345678901234567890123456789012345678901
✅ ARBITRUM: 0x3456789012345678901234567890123456789012
✅ POLYGON: 0x4567890123456789012345678901234567890123
```

**Verification:**
- [ ] All 4 contracts deployed successfully
- [ ] Contract addresses saved in MAINNET_DEPLOYMENT_RESULTS.json
- [ ] Frontend config updated in frontend/src/contracts/MAINNET_ADDRESSES.ts

### ✅ Phase 4: Bot Configuration
```bash
# 1. Configure backend environment
cd ../backend
cp .env.example .env
nano .env
```

**Configure backend .env:**
```bash
# Bot settings
BOT_ENABLED=true
BOT_PRIVATE_KEY=sua_chave_privada_bot_diferente_sem_0x

# Contract addresses (from Phase 3)
BASE_PROGRESSIVE_ESCROW=0x1234567890123456789012345678901234567890
OPTIMISM_PROGRESSIVE_ESCROW=0x2345678901234567890123456789012345678901
ARBITRUM_PROGRESSIVE_ESCROW=0x3456789012345678901234567890123456789012
POLYGON_PROGRESSIVE_ESCROW=0x4567890123456789012345678901234567890123

# Optional: Custom RPC URLs for bot
BOT_BASE_RPC_URL=https://mainnet.base.org
BOT_OPTIMISM_RPC_URL=https://mainnet.optimism.io
BOT_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BOT_POLYGON_RPC_URL=https://polygon-rpc.com
```

```bash
# 2. Test bot configuration
npm install
npm run bot:scan
```

**Expected Output:**
```
🤖 Chain Academy V2 Payment Bot - Mainnet Launch
✅ Configuration validated for 4 chains
📋 Scan Results: 0 pending payments found (normal for new deployment)
```

**Verification:**
- [ ] Bot connects to all 4 chains
- [ ] No configuration errors
- [ ] Bot wallet has sufficient ETH for gas

### ✅ Phase 5: Application Launch
```bash
# 1. Start bot with PM2
npm run bot:pm2

# 2. Build and start frontend
cd ../frontend
npm install
npm run build
npm start  # Uses PM2 automatically

# 3. Verify everything is running
pm2 status
```

**Expected PM2 Status:**
```
┌─────────────┬──────┬─────────┬─────────┬─────────┬──────────┐
│ App name    │ id   │ status  │ restart │ uptime  │ cpu      │
├─────────────┼──────┼─────────┼─────────┼─────────┼──────────┤
│ frontend    │ 0    │ online  │ 0       │ 5m      │ 10%      │
│ payment-bot │ 1    │ online  │ 0       │ 5m      │ 5%       │
└─────────────┴──────┴─────────┴─────────┴─────────┴──────────┘
```

**Verification:**
- [ ] Frontend accessible at https://yourdomain.com
- [ ] Bot running and processing (check logs)
- [ ] PM2 configured for auto-restart

---

## 🔍 Post-Deployment Testing

### ✅ Functional Tests
```bash
# 1. Test bot scanning
npm run bot:scan

# 2. Test bot one-time execution
npm run bot:once

# 3. Check application logs
pm2 logs --lines 50

# 4. Test website
curl -I https://yourdomain.com
```

### ✅ Security Tests
```bash
# 1. Check firewall
sudo ufw status

# 2. Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# 3. Check for exposed services
nmap yourdomain.com

# 4. Verify fail2ban
sudo fail2ban-client status
```

### ✅ Performance Tests
```bash
# 1. Monitor resource usage
htop

# 2. Check response time
time curl https://yourdomain.com

# 3. Monitor for 30 minutes
watch -n 30 'pm2 status'
```

---

## 📊 Production Monitoring Setup

### ✅ Automated Monitoring
```bash
# 1. Verify cron job for monitoring
crontab -l | grep monitor-chainacademy

# 2. Check monitoring logs
tail -f /var/log/chainacademy/monitor.log

# 3. Setup log rotation (optional)
sudo nano /etc/logrotate.d/chainacademy
```

### ✅ Alert Configuration
```bash
# 1. Test system health
/usr/local/bin/monitor-chainacademy.sh

# 2. Configure webhook notifications (optional)
# Add WEBHOOK_URL to bot .env for Discord/Slack alerts
```

---

## 🚨 Emergency Procedures

### 🔥 If Something Goes Wrong

1. **IMMEDIATELY**:
   ```bash
   # Stop bot if payments are wrong
   pm2 stop payment-bot
   
   # Check what happened
   pm2 logs payment-bot | tail -100
   ```

2. **DIAGNOSE**:
   ```bash
   # Check system health
   /usr/local/bin/monitor-chainacademy.sh
   
   # Check wallet balances
   npm run bot:scan
   ```

3. **ROLLBACK**:
   ```bash
   # Restart from known good state
   pm2 restart all
   
   # Or complete restart
   sudo systemctl restart nginx
   pm2 stop all && pm2 start all
   ```

---

## 📋 Final Production Checklist

### 🔒 Security
- [ ] Private keys not exposed in code
- [ ] Firewall properly configured
- [ ] SSL certificate installed and A+ rated
- [ ] Fail2ban active and monitoring
- [ ] Regular security updates scheduled

### 🚀 Performance  
- [ ] PM2 configured for auto-restart
- [ ] Nginx optimized for serving React app
- [ ] Log rotation configured
- [ ] Monitoring script running every 5 minutes
- [ ] Server has adequate resources (2GB+ RAM)

### 🤖 Bot Operation
- [ ] Bot wallet funded on all 4 chains
- [ ] Bot running and scanning successfully
- [ ] All 4 contract addresses correct
- [ ] Payment processing tested
- [ ] Error handling verified

### 🌐 Frontend
- [ ] Domain pointing to server
- [ ] HTTPS working correctly
- [ ] Wallet connection working
- [ ] Contract integration functional
- [ ] All L2 networks supported

### 📊 Monitoring
- [ ] Health check script running
- [ ] PM2 monitoring active
- [ ] Log files rotating properly
- [ ] Alert system configured (if desired)
- [ ] Performance metrics tracked

---

## 🎉 Success Criteria

✅ **Your Chain Academy V2 is production-ready when:**

1. **Website loads** at https://yourdomain.com
2. **Wallets connect** on all supported L2s (Base, Optimism, Arbitrum, Polygon)
3. **Bot is processing** payments automatically every 6 hours
4. **Contracts deployed** and verified on all 4 networks
5. **PM2 shows** all services online and stable
6. **SSL rating** is A or A+ on SSL Labs test
7. **Server monitoring** reports healthy status

**Total estimated time:** 2-4 hours for experienced users, 4-8 hours for beginners

**Total estimated cost:** $50-100 USD for initial deployment + monthly hosting (~$20-50/month)

---

## 📞 Support & Resources

- **Quick Deploy Guide**: `QUICK_DEPLOY_CHECKLIST.md`
- **Monitoring Guide**: `SERVER_MONITORING.md`  
- **Bot Setup Guide**: `BOT_SETUP_GUIDE.md`
- **Emergency Commands**: `pm2 status`, `pm2 logs`, `pm2 restart all`

**🚀 Ready for Mainnet!** Your decentralized mentorship platform is now live and processing payments automatically across 4 L2 networks.