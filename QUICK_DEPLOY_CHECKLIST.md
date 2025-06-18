# ⚡ Quick Deploy Checklist - Chain Academy V2 Mainnet

## 🎯 Deploy em 5 Passos Simples

### ✅ Passo 1: Preparar Carteiras

1. **Carteira Principal (Deploy)**: Para fazer deploy dos contratos
   - Precisa de ~0.05 ETH total nas 4 redes (Base, Optimism, Arbitrum, Polygon)

2. **Carteira do Bot**: Para executar pagamentos automáticos  
   - Precisa de ~0.02 ETH total nas 4 redes

3. **Carteira da Plataforma**: Para receber taxas de 10%
   - Pode ser qualquer endereço seu

### ✅ Passo 2: Configurar Environment

```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
cp .env.example .env
```

**Editar `.env` com:**
```bash
# Suas chaves privadas (SEM 0x)
PRIVATE_KEY=sua_chave_privada_deploy
PLATFORM_WALLET=0xSuaCarteiraPlataforma

# URLs RPC (pode usar gratuitas)
BASE_RPC_URL=https://mainnet.base.org
OPTIMISM_RPC_URL=https://mainnet.optimism.io
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com
```

### ✅ Passo 3: Deploy dos Contratos

```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
npm install
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
```

**Resultado esperado:**
```
✅ BASE: 0x1234567890123456789012345678901234567890
✅ OPTIMISM: 0x2345678901234567890123456789012345678901
✅ ARBITRUM: 0x3456789012345678901234567890123456789012
✅ POLYGON: 0x4567890123456789012345678901234567890123
```

### ✅ Passo 4: Configurar Bot

```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
cp .env.example .env
```

**Adicionar ao `.env` do backend:**
```bash
# Chave do bot (DIFERENTE da chave de deploy)
BOT_PRIVATE_KEY=sua_chave_privada_bot
BOT_ENABLED=true

# Endereços dos contratos (do Passo 3)
BASE_PROGRESSIVE_ESCROW=0x1234567890123456789012345678901234567890
OPTIMISM_PROGRESSIVE_ESCROW=0x2345678901234567890123456789012345678901
ARBITRUM_PROGRESSIVE_ESCROW=0x3456789012345678901234567890123456789012
POLYGON_PROGRESSIVE_ESCROW=0x4567890123456789012345678901234567890123
```

### ✅ Passo 5: Iniciar Bot

```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
npm install
npm run start:bot
```

---

## 🔥 Comandos Rápidos

### Deploy
```bash
# Deploy em todas as redes
cd contracts && npx hardhat run scripts/deploy-progressive-escrow-mainnet.js

# Deploy apenas no Base (teste)
TARGET_NETWORKS=base npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
```

### Bot
```bash
# Iniciar bot
npm run start:bot

# Verificar pagamentos pendentes
npm run bot:scan

# Executar uma vez
npm run bot:once

# Usar PM2 (produção)
npm run bot:pm2
npm run bot:logs
```

---

## 📊 Custos Estimados

| Item | Custo |
|------|-------|
| Deploy 4 contratos | $10-35 USD |
| Bot para 1 mês | $5-15 USD |
| **Total inicial** | **$15-50 USD** |

---

## 🚨 Troubleshooting Rápido

### ❌ "Insufficient balance for deployment"
**Solução:** Adicione mais ETH na carteira de deploy

### ❌ "Missing required environment variable"
**Solução:** Verifique se o `.env` está configurado corretamente

### ❌ "Contract deployment failed"
**Solução:** Teste primeiro com uma rede só: `TARGET_NETWORKS=base`

### ❌ "Bot not processing payments"
**Solução:** Verifique saldo da carteira do bot: `npm run bot:scan`

---

## 🎯 Verificação Final

Depois do deploy, teste:

1. **Contratos deployados?**
   ```bash
   grep -A 10 "DEPLOYMENT SUMMARY" contracts/MAINNET_DEPLOYMENT_RESULTS.json
   ```

2. **Bot funcionando?**
   ```bash
   npm run bot:scan
   ```

3. **Frontend atualizado?**
   ```bash
   ls frontend/src/contracts/MAINNET_ADDRESSES.ts
   ```

---

## 🚀 Produção

Para produção, use PM2:

```bash
# Backend
npm run bot:pm2

# Frontend
cd ../frontend && npm run build
npm start  # Usa PM2 automaticamente
```

---

## 📞 Suporte Rápido

**Logs importantes:**
- Deploy: `contracts/MAINNET_DEPLOYMENT_RESULTS.json`
- Bot: `npm run bot:logs`
- Frontend: `pm2 logs frontend`

**Se algo falhar:**
1. Verifique saldos das carteiras
2. Verifique `.env` 
3. Teste com uma rede primeiro
4. Use `--scan` para debug

---

## ✅ Checklist Final

- [ ] Carteiras com saldo
- [ ] `.env` configurado (contracts)
- [ ] Deploy executado com sucesso
- [ ] `.env` configurado (backend)
- [ ] Bot iniciado e funcionando
- [ ] Frontend atualizado com endereços
- [ ] PM2 configurado para produção

**🎉 Pronto para Mainnet!**