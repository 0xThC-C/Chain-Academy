# 🤖 Bot Setup Guide - Chain Academy V2

## Como Configurar o Bot de Pagamentos Automáticos

### 1. 📋 Visão Geral

O bot executa automaticamente os pagamentos não confirmados pelos mentores após 24 horas, garantindo que os pagamentos não fiquem presos no contrato.

### 2. 🔧 Configuração da Chave Privada do Bot

#### A. Criar Nova Carteira para o Bot

**⚠️ IMPORTANTE: Use uma carteira separada para o bot, NUNCA sua carteira principal!**

```bash
# Gerar nova carteira (você pode usar qualquer ferramenta)
# Exemplo com Node.js:
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"
```

#### B. Financiar a Carteira do Bot

A carteira do bot precisa de ETH em cada rede para pagar gas:

| Rede | ETH Mínimo Recomendado |
|------|------------------------|
| Base | 0.005 ETH |
| Optimism | 0.003 ETH |
| Arbitrum | 0.002 ETH |
| Polygon | 0.01 MATIC |

**Total estimado: ~$15-30 USD**

#### C. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env` do backend:

```bash
# ============================================
# BOT CONFIGURATION - Chain Academy V2
# ============================================

# Bot Wallet (DIFFERENT from deployer wallet)
BOT_PRIVATE_KEY=sua_chave_privada_do_bot_aqui

# Bot Settings
BOT_ENABLED=true
BOT_NAME="ChainAcademy-PaymentBot"
BOT_VERSION="1.0.0"

# Execution Schedule (cron format)
BOT_CHECK_INTERVAL="0 */6 * * *"  # Every 6 hours
BOT_DAILY_CHECK="0 2 * * *"       # Daily at 2 AM UTC

# Gas Configuration
BOT_GAS_LIMIT=300000              # 300k gas per transaction
BOT_MAX_GAS_PRICE=50000000000     # 50 gwei max
BOT_PRIORITY_FEE=2000000000       # 2 gwei priority fee

# Safety Limits
BOT_MAX_PAYMENTS_PER_RUN=50       # Max payments to process per execution
BOT_MIN_PAYMENT_AMOUNT=1000000    # Minimum 0.001 ETH/USDC to process
BOT_RETRY_ATTEMPTS=3              # Retry failed transactions 3 times
BOT_RETRY_DELAY=30000             # 30 seconds between retries

# Contract Addresses (será preenchido após deploy)
BASE_PROGRESSIVE_ESCROW=0x...
OPTIMISM_PROGRESSIVE_ESCROW=0x...
ARBITRUM_PROGRESSIVE_ESCROW=0x...
POLYGON_PROGRESSIVE_ESCROW=0x...

# RPC URLs for Bot (pode usar as mesmas do deploy)
BOT_BASE_RPC_URL=https://mainnet.base.org
BOT_OPTIMISM_RPC_URL=https://mainnet.optimism.io
BOT_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BOT_POLYGON_RPC_URL=https://polygon-rpc.com

# Monitoring & Notifications (opcional)
BOT_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_token
BOT_ENABLE_NOTIFICATIONS=true
BOT_LOG_LEVEL=info                # debug, info, warn, error

# Emergency Controls
BOT_EMERGENCY_STOP=false          # Set to true to stop bot
BOT_MAINTENANCE_MODE=false        # Set to true for maintenance
```

### 3. 🚀 Instalação e Execução

#### A. Instalar Dependências

```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
npm install ethers@6 node-cron winston dotenv
```

#### B. Criar Script de Inicialização

```bash
# scripts/start-bot.sh
#!/bin/bash

echo "🤖 Starting Chain Academy Payment Bot..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.example to .env and configure your settings"
    exit 1
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Iniciar bot com PM2
pm2 start bots/DailyPaymentBot.ts --name "payment-bot" --interpreter ts-node

echo "✅ Payment bot started successfully!"
echo "Use 'pm2 logs payment-bot' to view logs"
echo "Use 'pm2 stop payment-bot' to stop the bot"
```

#### C. Executar o Bot

```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
chmod +x scripts/start-bot.sh
./scripts/start-bot.sh
```

### 4. 📊 Monitoramento

#### A. Ver Logs do Bot

```bash
# Logs em tempo real
pm2 logs payment-bot

# Logs históricos
pm2 logs payment-bot --lines 100

# Apenas erros
pm2 logs payment-bot --err
```

#### B. Status do Bot

```bash
# Ver status
pm2 status payment-bot

# Informações detalhadas
pm2 describe payment-bot

# Reiniciar se necessário
pm2 restart payment-bot
```

### 5. 🔄 Atualizar Endereços dos Contratos

Após fazer o deploy dos contratos, você precisa atualizar o `.env`:

```bash
# Exemplo após deploy bem-sucedido:
BASE_PROGRESSIVE_ESCROW=0x1234567890123456789012345678901234567890
OPTIMISM_PROGRESSIVE_ESCROW=0x2345678901234567890123456789012345678901
ARBITRUM_PROGRESSIVE_ESCROW=0x3456789012345678901234567890123456789012
POLYGON_PROGRESSIVE_ESCROW=0x4567890123456789012345678901234567890123
```

Depois reinicie o bot:

```bash
pm2 restart payment-bot
```

### 6. 🛡️ Segurança

#### A. Permissões da Carteira do Bot

✅ **O que o bot PODE fazer:**
- Chamar `autoCompleteSession()` em sessões expiradas
- Pagar gas para transações

❌ **O que o bot NÃO PODE fazer:**
- Acessar fundos dos usuários
- Modificar contratos
- Transferir tokens arbitrariamente

#### B. Monitoramento de Segurança

```bash
# Verificar saldo da carteira do bot
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY);
console.log('Bot Wallet:', wallet.address);
"
```

### 7. 🚨 Troubleshooting

#### A. Bot Não Está Executando

```bash
# Verificar se PM2 está rodando
pm2 list

# Verificar logs de erro
pm2 logs payment-bot --err

# Reiniciar bot
pm2 restart payment-bot
```

#### B. Erros de Gas

```bash
# Verificar saldo do bot em cada rede
# Ajustar BOT_MAX_GAS_PRICE se necessário
```

#### C. Erros de RPC

```bash
# Verificar URLs de RPC
# Considerar usar Alchemy ou Infura para melhor confiabilidade
```

### 8. 📈 Otimizações

#### A. Configurações de Produção

```bash
# Para produção, ajuste:
BOT_CHECK_INTERVAL="0 */4 * * *"     # A cada 4 horas
BOT_MAX_GAS_PRICE=30000000000        # 30 gwei para economia
BOT_ENABLE_NOTIFICATIONS=true       # Ativar notificações Discord
```

#### B. Múltiplas Instâncias

Se você quiser redundância, pode executar bots em servidores diferentes com a mesma configuração.

### 9. 🎯 Comandos Úteis

```bash
# Iniciar bot
pm2 start payment-bot

# Parar bot
pm2 stop payment-bot

# Reiniciar bot
pm2 restart payment-bot

# Ver logs
pm2 logs payment-bot

# Salvar configuração PM2
pm2 save

# Auto-start na inicialização do sistema
pm2 startup
```

### 10. 📞 Suporte

Se tiver problemas:

1. Verifique os logs: `pm2 logs payment-bot`
2. Verifique saldo da carteira do bot
3. Verifique conectividade RPC
4. Verifique se os endereços dos contratos estão corretos

---

## 🎉 Resumo

1. ✅ Crie carteira separada para o bot
2. ✅ Financie com ETH/MATIC em cada rede
3. ✅ Configure `.env` com endereços dos contratos
4. ✅ Execute `./scripts/start-bot.sh`
5. ✅ Monitore com `pm2 logs payment-bot`

O bot agora processará automaticamente pagamentos pendentes! 🚀