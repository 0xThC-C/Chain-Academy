# Chain Academy V8 - Security Documentation

## 🔐 Secure Wallet Management

Este documento descreve as práticas de segurança implementadas para prevenir vazamentos de chaves privadas e garantir a segurança do sistema Chain Academy V8.

## ⚠️ Problemas de Segurança Identificados

### Como Vazamentos Podem Ocorrer

1. **Armazenamento nos logs do provedor**
   - Requests para IA podem ser logados em servidores
   - Engenheiros têm acesso aos logs para debug/monitoramento
   - Terceiros podem acessar em caso de breach na infraestrutura

2. **Treinamento ou fine-tuning acidental**
   - Prompts podem ser usados para melhorar modelos
   - Chaves podem ser salvas em datasets temporários

3. **Plugins/extensões acoplados**
   - Arquivos de projeto (.env, config.json) podem ser indexados
   - Ambientes cloud temporários podem manter arquivos acessíveis

4. **Interceptação via ferramentas de terceiros**
   - Extensões de navegador podem capturar chaves
   - Ferramentas de proxy podem interceptar dados

## 🛡️ Sistema de Segurança Implementado

### 1. Secure Wallet Manager (`WalletManager.ts`)

**Recursos:**
- Nunca armazena chaves privadas em texto plano
- Usa variáveis de ambiente de fontes externas seguras
- Implementa capacidades de rotação de chaves
- Fornece logging de auditoria
- Gerenciamento seguro de memória

**Fontes de Chaves Suportadas:**
- `env`: Variáveis de ambiente (recomendado)
- `file`: Arquivo criptografado
- `aws-secrets`: AWS Secrets Manager (futuro)
- `azure-keyvault`: Azure Key Vault (futuro)

### 2. Geração Segura de Carteiras (`generate-secure-wallet.ts`)

**Características:**
- Geração offline de carteiras
- Múltiplos formatos de saída
- Criptografia de chaves privadas
- Templates de ambiente seguros

**Uso:**
```bash
# Gerar nova carteira (console apenas)
npx ts-node generate-secure-wallet.ts generate 1 console

# Gerar e salvar criptografado
npx ts-node generate-secure-wallet.ts generate 1 encrypted-file [senha_mestre]

# Criar template de ambiente
npx ts-node generate-secure-wallet.ts template [endereço_carteira]

# Validar configuração de segurança
npx ts-node generate-secure-wallet.ts validate
```

### 3. Sistema de Rotação de Chaves (`KeyRotationSystem.ts`)

**Recursos:**
- Rotação automática agendada
- Transferência segura de saldos
- Capacidades de rotação de emergência
- Logging de auditoria e monitoramento
- Suporte multi-rede

## 📋 Práticas de Segurança Recomendadas

### 1. Configuração de Produção

**NUNCA faça:**
- ❌ Armazenar chaves privadas no código
- ❌ Commit chaves privadas no repositório
- ❌ Enviar chaves via mensagens/email
- ❌ Usar chaves em logs ou debugging
- ❌ Armazenar chaves em arquivos não criptografados

**SEMPRE faça:**
- ✅ Use variáveis de ambiente externas
- ✅ Use gerenciadores de secrets (AWS/Azure)
- ✅ Implemente rotação regular de chaves
- ✅ Monitor saldos e transações
- ✅ Use hardware wallets para máxima segurança

### 2. Configuração de Ambiente Seguro

```bash
# Configurar variáveis de ambiente (não no código!)
export CHAIN_ACADEMY_BOT_PRIVATE_KEY=sua_chave_privada_aqui_sem_0x
export WALLET_MASTER_PASSWORD=sua_senha_mestre_segura
export ENABLE_KEY_ROTATION=true
export KEY_ROTATION_INTERVAL_HOURS=720  # 30 dias
```

### 3. Monitoramento e Alertas

**Configure alertas para:**
- Saldo da carteira abaixo do limite
- Transações não autorizadas
- Falhas na rotação de chaves
- Tentativas de acesso suspeitas

## 🔄 Rotação de Chaves

### Rotação Automática
```typescript
const rotationSystem = new KeyRotationSystem({
  rotationInterval: 720, // 30 dias em horas
  minimumBalance: '0.01', // ETH mínimo para rotação
  networks: ['base', 'arbitrum', 'optimism', 'polygon'],
  backupWalletCount: 2,
  enableEmergencyRotation: true,
  discordWebhook: process.env.DISCORD_WEBHOOK_URL
});
```

### Rotação Manual/Emergência
```typescript
// Rotação manual
await rotationSystem.performRotation('manual');

// Rotação de emergência
await rotationSystem.emergencyRotation();
```

## 🚨 Plano de Resposta a Incidentes

### Em caso de comprometimento suspeito:

1. **Ação Imediata:**
   ```bash
   # Rotação de emergência
   npx ts-node emergency-rotation.ts
   ```

2. **Investigação:**
   - Verificar logs de auditoria
   - Analisar transações suspeitas
   - Identificar vetor de ataque

3. **Recuperação:**
   - Gerar nova carteira segura
   - Transferir fundos restantes
   - Atualizar configurações de produção
   - Notificar equipe via Discord

## 📊 Monitoramento de Segurança

### Métricas a Acompanhar:
- Tempo desde a última rotação de chave
- Saldo das carteiras ativas
- Número de transações por dia
- Falhas de rotação
- Alertas de segurança

### Logs de Auditoria:
- Carregamento de carteira
- Assinatura de transações
- Rotações de chave
- Falhas de segurança

## 🔧 Migração da Carteira Comprometida

### Nova Carteira Gerada:
- **Endereço**: `0x4370772caa2B2FC8E372f242a6CAA0A8293Fb765`
- **Mnemônico**: `[REDACTED_FOR_SECURITY]`
- **Chave Privada**: `[REDACTED_FOR_SECURITY]`

### Passos para Migração:

1. **Atualizar Ambiente de Produção:**
   ```bash
   # No servidor de produção (NÃO no código)
   export CHAIN_ACADEMY_BOT_PRIVATE_KEY=[REDACTED_FOR_SECURITY]
   ```

2. **Atualizar Configuração do Bot:**
   ```bash
   # Reiniciar o bot com nova configuração
   pm2 restart chain-academy-v8-bot
   ```

3. **Verificar Funcionamento:**
   - Verificar logs do bot
   - Confirmar que nova carteira está sendo usada
   - Testar transações em testnet primeiro

## 📞 Contatos de Emergência

Em caso de incidente de segurança:
1. Parar imediatamente todos os bots
2. Executar rotação de emergência
3. Notificar equipe via Discord
4. Documentar incidente para análise

---

**⚠️ LEMBRETE IMPORTANTE**: Esta documentação contém informações sensíveis. Mantenha segura e atualize regularmente as práticas de segurança conforme necessário.