# 📊 Server Monitoring Guide - Chain Academy V2

## Quick Status Commands

### 🔍 Check Everything
```bash
# Status geral do servidor
/usr/local/bin/monitor-chainacademy.sh

# PM2 processes
pm2 status

# Nginx status
systemctl status nginx

# Firewall status
ufw status
```

### 📈 Performance Monitoring
```bash
# CPU e RAM em tempo real
htop

# Uso de disco
df -h

# Processos que mais consomem
top

# Logs do sistema
tail -f /var/log/syslog
```

### 🤖 Bot Monitoring
```bash
# Status do bot
pm2 describe payment-bot

# Logs do bot
pm2 logs payment-bot

# Logs com filtro
pm2 logs payment-bot | grep "ERROR\|WARN"

# Métricas do bot
npm run bot:scan
```

## 🚨 Alertas e Problemas Comuns

### ❌ Bot Não Está Processando Pagamentos

**Sintomas:**
- `pm2 status` mostra bot parado
- Logs mostram erros de conexão
- Pagamentos não estão sendo executados

**Soluções:**
```bash
# 1. Verificar saldo das carteiras
npm run bot:scan

# 2. Reiniciar bot
pm2 restart payment-bot

# 3. Verificar configuração
grep BOT_ENABLED /home/mathewsl/Chain\ Academy\ V2/backend/.env

# 4. Testar conectividade
npm run bot:once
```

### ❌ Frontend Não Carrega

**Sintomas:**
- Erro 502 Bad Gateway
- Site não abre
- PM2 mostra frontend parado

**Soluções:**
```bash
# 1. Verificar PM2
pm2 status

# 2. Reiniciar frontend
pm2 restart frontend

# 3. Verificar Nginx
nginx -t
systemctl restart nginx

# 4. Verificar logs
pm2 logs frontend
```

### ❌ Pouco Espaço em Disco

**Sintomas:**
- `df -h` mostra >90% uso
- Aplicação fica lenta

**Soluções:**
```bash
# 1. Limpar logs antigos
pm2 flush

# 2. Limpar cache npm
npm cache clean --force

# 3. Limpar logs do sistema
sudo journalctl --vacuum-time=7d

# 4. Verificar arquivos grandes
find / -size +100M -type f 2>/dev/null
```

### ❌ Alta CPU/RAM

**Sintomas:**
- `htop` mostra >80% uso
- Sistema lento

**Soluções:**
```bash
# 1. Identificar processo problemático
top -c

# 2. Verificar logs por erros
pm2 logs | grep -i error

# 3. Reiniciar processo específico
pm2 restart <nome-do-processo>

# 4. Verificar loops infinitos nos logs
```

## 📋 Checklist de Monitoramento Diário

### ✅ Manhã (09:00)
- [ ] Verificar status geral: `/usr/local/bin/monitor-chainacademy.sh`
- [ ] Verificar logs por erros: `pm2 logs | grep -i error`
- [ ] Verificar saldo das carteiras do bot: `npm run bot:scan`
- [ ] Verificar uso de disco: `df -h`

### ✅ Tarde (15:00)
- [ ] Verificar performance: `htop`
- [ ] Verificar logs do bot: `pm2 logs payment-bot --lines 20`
- [ ] Testar frontend: acessar site
- [ ] Verificar firewall: `ufw status`

### ✅ Noite (21:00)
- [ ] Executar monitoramento completo
- [ ] Verificar backup (se configurado)
- [ ] Verificar certificado SSL (renovação automática)
- [ ] Planejar maintenance se necessário

## 🔧 Comandos de Manutenção

### 🔄 Restart Completo
```bash
# Parar tudo
pm2 stop all

# Reiniciar Nginx
systemctl restart nginx

# Iniciar tudo
pm2 start all

# Verificar status
pm2 status
```

### 🧹 Limpeza Semanal
```bash
# Limpar logs
pm2 flush

# Limpar cache
npm cache clean --force

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Verificar segurança
fail2ban-client status
```

### 📦 Update da Aplicação
```bash
# Como usuário chainacademy
su - chainacademy

# Executar deploy
./deploy.sh

# Verificar se tudo funcionou
pm2 status
```

## 🚨 Emergency Response

### 🔥 Site Completamente Fora
```bash
# 1. Verificar se servidor está rodando
ping sua-ip

# 2. SSH para o servidor
ssh root@sua-ip

# 3. Verificar serviços críticos
systemctl status nginx
pm2 status

# 4. Restart emergency
systemctl restart nginx
pm2 restart all

# 5. Verificar logs
journalctl -f
```

### 💸 Bot Processou Pagamento Errado
```bash
# 1. PARAR BOT IMEDIATAMENTE
pm2 stop payment-bot

# 2. Verificar últimas transações
npm run bot:scan

# 3. Verificar logs para identificar problema
pm2 logs payment-bot | tail -100

# 4. Não reiniciar até identificar causa
```

## 📊 Métricas Importantes

### 🎯 KPIs do Sistema
- **Uptime**: >99.5%
- **Response Time**: <2s
- **CPU Usage**: <70%
- **RAM Usage**: <80%
- **Disk Usage**: <85%

### 🤖 KPIs do Bot
- **Payment Success Rate**: >95%
- **Processing Time**: <10min per payment
- **Failed Payments**: <5% do total
- **Bot Uptime**: >99%

### 📈 Monitoring Dashboard
```bash
# Status em tempo real (atualiza a cada 5 segundos)
watch -n 5 '/usr/local/bin/monitor-chainacademy.sh'

# Logs em tempo real
pm2 monit
```

## 🔗 Links Úteis

- **PM2 Monitor**: `pm2 monit`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl -f`
- **Bot Logs**: `pm2 logs payment-bot`
- **Security Logs**: `/var/log/auth.log`

## 📞 Support Contacts

Em caso de problemas críticos:

1. **Verificar logs primeiro**
2. **Tentar soluções básicas (restart)**
3. **Documentar o problema**
4. **Buscar ajuda na comunidade**

---

**🛡️ Lembre-se:** 
- Always backup before maintenance
- Test changes in staging first
- Monitor for 30min after changes
- Keep security updates current