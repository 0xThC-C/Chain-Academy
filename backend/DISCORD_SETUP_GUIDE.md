# 📢 Guia de Configuração Discord Webhooks

## 🎯 Sistema de Notificações Implementado

O bot V7 agora possui um sistema completo de notificações Discord com:

### ✅ **Tipos de Notificações Disponíveis:**

#### 🟢 **Notificações de Sucesso**
- ✅ **Bot iniciado** com sucesso
- 💰 **Pagamento liberado** para mentor  
- 🔄 **Reembolso processado** para estudante
- 📊 **Resumo de execução** diária

#### 🟡 **Alertas e Avisos**
- ⚠️ **Falhas de processamento** não críticas
- 📈 **Relatórios diários** com métricas
- 🔋 **Status de saúde** do bot

#### 🔴 **Alertas Críticos**
- 🚨 **Falhas de execução** críticas
- 💸 **Saldo baixo** de gas
- 🛑 **Bot offline** ou com problemas
- ❌ **Erros de conectividade** RPC

---

## 🛠️ Como Configurar Discord Webhooks

### **Passo 1: Criar Webhook no Discord**

1. **Acesse seu servidor Discord**
2. **Clique com botão direito** no canal desejado
3. **Selecione "Editar Canal"**
4. **Vá em "Integrações" → "Webhooks"**
5. **Clique "Criar Webhook"** ou "Novo Webhook"
6. **Configure:**
   - **Nome**: Chain Academy Bot
   - **Avatar**: (opcional) upload uma imagem do bot
   - **Canal**: confirme o canal correto
7. **Copie a "URL do Webhook"**

### **Passo 2: Configurar no Bot**

#### **Opção A: Variáveis de Ambiente**
```bash
# No arquivo .env ou .env.production-v7
BOT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
BOT_ENABLE_DISCORD_NOTIFICATIONS=true
```

#### **Opção B: Configuração Manual**
```bash
# Definir diretamente no terminal
export BOT_DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/SEU_WEBHOOK_AQUI"
export BOT_ENABLE_DISCORD_NOTIFICATIONS=true
```

### **Passo 3: Testar Notificações**

#### **Teste Básico**
```bash
cd backend
npm run bot:discord:test "https://discord.com/api/webhooks/SEU_WEBHOOK_AQUI"
```

#### **Teste com Variável de Ambiente**
```bash
BOT_DISCORD_WEBHOOK_URL="https://discord.com/..." npm run bot:discord:test
```

---

## 🧪 Testando o Sistema

O comando de teste enviará **8 tipos diferentes** de notificação:

### **1. 🧪 Teste Básico**
Confirma se o webhook está funcionando

### **2. 🤖 Notificação de Startup**  
Simula quando o bot é iniciado

### **3. 💰 Pagamento Processado**
Simula pagamento liberado para mentor

### **4. 🔄 Reembolso Processado**
Simula reembolso para estudante (no-show)

### **5. 📊 Resumo de Execução**
Estatísticas de processamento em lote

### **6. ❌ Notificação de Erro**
Simula erro durante operação

### **7. 🚨 Alerta Crítico**
Simula problema crítico do sistema

### **8. 📈 Relatório Diário**  
Resumo de métricas do dia

---

## 🎨 Exemplo de Notificações

### **💰 Pagamento Processado**
```
💰 Payment Processed Successfully
Automatic payment released to mentor

🆔 Session ID: 0x1234567890...abcdef12
👨‍🏫 Mentor: 0xMentor...3456  
💵 Amount: 50.0 USDC
🌐 Network: Base
🔗 Transaction: View on Explorer
```

### **🔄 Reembolso Processado**  
```
🔄 Refund Processed
Automatic refund issued to student

🆔 Session ID: 0x9876543210...fedcba98
👨‍🎓 Student: 0xStudent...7890
💵 Amount: 25.0 USDC
🌐 Network: Optimism  
📝 Reason: Session expired - no-show
```

### **📊 Resumo de Execução**
```
📊 Execution Summary
Bot execution completed in 45000ms

✅ Successful: 12
❌ Failed: 3  
📈 Success Rate: 80.0%
⛽ Gas Used: 0.05 ETH
📦 Total Processed: 15
⏱️ Duration: 45.0s
```

---

## ⚙️ Configurações Avançadas

### **Personalização do Bot**
```bash
# Nome personalizado no Discord
BOT_DISCORD_USERNAME="Chain Academy V7 Bot"

# Avatar personalizado  
BOT_DISCORD_AVATAR="https://seu-site.com/bot-avatar.png"

# Retry em caso de falha
BOT_DISCORD_RETRY_ATTEMPTS=3
BOT_DISCORD_RETRY_DELAY=2000
```

### **Filtros de Notificação**
```bash
# Apenas notificações críticas
BOT_DISCORD_ONLY_CRITICAL=true

# Apenas sucessos (sem erros)
BOT_DISCORD_SUCCESS_ONLY=true

# Relatórios diários habilitados
BOT_DISCORD_DAILY_REPORTS=true
```

---

## 🔍 Troubleshooting

### **❌ "Webhook URL inválida"**
- ✅ Verificar se começa com `https://discord.com/api/webhooks/`
- ✅ Confirmar que copiou a URL completa
- ✅ Testar o webhook no navegador

### **❌ "403 Forbidden"**  
- ✅ Webhook pode ter sido deletado no Discord
- ✅ Recriar webhook e atualizar URL
- ✅ Verificar permissões do canal

### **❌ "429 Rate Limited"**
- ✅ Muitas mensagens em pouco tempo  
- ✅ Bot irá automaticamente fazer retry
- ✅ Aguardar alguns segundos

### **❌ Notificações não chegam**
```bash
# Verificar configuração
echo $BOT_DISCORD_WEBHOOK_URL
echo $BOT_ENABLE_DISCORD_NOTIFICATIONS

# Testar webhook
npm run bot:discord:test

# Verificar logs do bot
pm2 logs payment-bot-v7 | grep -i discord
```

---

## 🚀 Deploy com Discord Habilitado

### **1. Configurar Webhook URL**
```bash
# Editar .env.production-v7
nano .env.production-v7

# Adicionar:
BOT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_WEBHOOK
BOT_ENABLE_DISCORD_NOTIFICATIONS=true
```

### **2. Testar Notificações**
```bash
npm run bot:discord:test
```

### **3. Deploy do Bot**
```bash
./bots/deploy-v7-production.sh
```

### **4. Verificar se Funcionou**
- ✅ Bot deve enviar notificação de startup no Discord
- ✅ Verificar logs: `pm2 logs payment-bot-v7`
- ✅ Testar com: `npm run bot:v7:test`

---

## 📋 Checklist de Configuração

- [ ] **Webhook criado** no Discord
- [ ] **URL copiada** e configurada no .env  
- [ ] **BOT_ENABLE_DISCORD_NOTIFICATIONS=true** definido
- [ ] **Teste executado** com sucesso
- [ ] **8 notificações** recebidas no Discord
- [ ] **Bot deployado** em produção
- [ ] **Notificação de startup** recebida
- [ ] **Canal monitorado** para alertas

---

## 📱 Notificações Móveis

Para receber **notificações no celular**:

1. **Instale app Discord** no celular
2. **Configure notificações** do canal
3. **Ative notificações push** do servidor  
4. **Teste** enviando uma notificação

---

**🎉 Agora você tem monitoramento 24/7 do bot via Discord!**

*Todas as operações importantes serão notificadas em tempo real no seu canal Discord.*