# 🚀 GUIA COMPLETO - DEPLOY EM TESTNET

**Chain Academy V2 - Deploy Seguro em Redes de Teste**

---

## 📋 PRÉ-REQUISITOS

### 1. **Carteira de Deploy**
```bash
# ⚠️ IMPORTANTE: Use uma carteira SEPARADA para deploy (não sua principal)
# Gere uma nova carteira ou use uma existente dedicada apenas para desenvolvimento
```

### 2. **Tokens de Teste (Faucets)**
Você precisará de ETH de teste para:
- **Sepolia (Ethereum Testnet)**: https://sepoliafaucet.com/
- **Mumbai (Polygon Testnet)**: https://mumbaifaucet.com/
- **Arbitrum Goerli**: https://bridge.arbitrum.io/
- **Optimism Goerli**: https://app.optimism.io/faucet
- **Base Goerli**: https://coinbase.com/faucets/base-ethereum-goerli-faucet

### 3. **APIs de RPC (Opcionais)**
Para melhor performance, considere usar:
- **Alchemy**: https://alchemy.com/ (recomendado)
- **Infura**: https://infura.io/
- **QuickNode**: https://quicknode.com/

---

## 🔧 CONFIGURAÇÃO INICIAL

### 1. **Configurar Ambiente (.env)**

Copie o arquivo de exemplo para configuração testnet:

```bash
cd "/home/mathewsl/Chain Academy V2/contracts"
cp .env.testnet .env
```

### 2. **Editar configurações**

Abra o arquivo `.env` e configure:

```bash
# 🔑 PRIVATE KEY DA SUA CARTEIRA DE TESTE
PRIVATE_KEY=sua-private-key-aqui-sem-0x

# 🌐 RPC URLs (opcionais - já incluídos URLs públicos)
SEPOLIA_RPC_URL=https://rpc.sepolia.org
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# 💰 Endereço para receber taxas da plataforma
PLATFORM_FEE_RECIPIENT=0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c

# 🔍 API Keys para verificação (opcionais)
ETHERSCAN_API_KEY=your-api-key-here
POLYGONSCAN_API_KEY=your-api-key-here
```

---

## 🧪 PASSO A PASSO - DEPLOY

### 1. **Preparar o Ambiente**

```bash
# Navegar para a pasta de contratos
cd "/home/mathewsl/Chain Academy V2/contracts"

# Instalar dependências
npm install

# Compilar contratos
npm run compile
```

### 2. **Executar Testes (Recomendado)**

```bash
# Rodar todos os testes
npm test

# Verificar se todos passaram (19/19)
# ✅ Deve mostrar: "19 passing"
```

### 3. **Deploy em Sepolia (Ethereum Testnet)**

```bash
# Deploy em Sepolia
npm run deploy:sepolia

# OU usando hardhat diretamente
npx hardhat deploy --network sepolia --tags Testnet
```

**Saída esperada:**
```
🧪 ===== DEPLOY EM TESTNET =====
🌐 Rede: sepolia (Chain ID: 11155111)
👛 Deployer: 0xSeuEnderecoAqui
💰 Platform Fee Recipient: 0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c
💎 Saldo do deployer: 0.1 ETH

📋 Deployando Mentorship Contract...
✅ Mentorship deployado em: 0xMentorshipAddress

📋 Deployando MentorshipEscrowV2 Contract...
✅ MentorshipEscrowV2 deployado em: 0xEscrowAddress

🎉 ===== DEPLOY CONCLUÍDO COM SUCESSO =====
```

### 4. **Deploy em Mumbai (Polygon Testnet)**

```bash
# Deploy em Mumbai
npm run deploy:mumbai
```

### 5. **Deploy em Outras Testnets**

```bash
# Arbitrum Goerli
npm run deploy:arbitrum-goerli

# Optimism Goerli  
npm run deploy:optimism-goerli

# Base Goerli
npm run deploy:base-goerli
```

---

## 🔍 VERIFICAÇÃO DO DEPLOY

### 1. **Verificar nos Block Explorers**

**Sepolia:**
- Acesse: https://sepolia.etherscan.io/
- Busque pelo endereço do contrato
- Verifique se foi deployado corretamente

**Mumbai:**
- Acesse: https://mumbai.polygonscan.com/
- Busque pelo endereço do contrato

### 2. **Testar Funcionalidades**

```bash
# Abrir console do Hardhat
npx hardhat console --network sepolia

# No console, teste:
> const mentorship = await ethers.getContractAt("Mentorship", "ENDERECO_DO_CONTRATO")
> await mentorship.platformFeeRecipient()
> await mentorship.PLATFORM_FEE_PERCENTAGE()
```

---

## 🔧 CONFIGURAR FRONTEND

### 1. **Atualizar Endereços dos Contratos**

Edite o arquivo de configuração do frontend:

```typescript
// /frontend/src/contracts/MentorshipContract.ts
export const MENTORSHIP_CONTRACTS = {
  // TESTNETS
  11155111: { // Sepolia
    address: "0xSeuEnderecoMentorshipAqui",
    escrowAddress: "0xSeuEnderecoEscrowAqui"
  },
  80001: { // Mumbai
    address: "0xSeuEnderecoMentorshipAqui", 
    escrowAddress: "0xSeuEnderecoEscrowAqui"
  }
};
```

### 2. **Configurar Tokens de Teste**

```typescript
// Tokens de teste para cada rede
export const TESTNET_TOKENS = {
  11155111: { // Sepolia
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"
  },
  80001: { // Mumbai
    USDT: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58",
    USDC: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e"
  }
};
```

---

## 🧪 TESTES FUNCIONAIS

### 1. **Teste Básico de Sessão**

```bash
# No console do Hardhat (sepolia)
npx hardhat console --network sepolia

# Criar uma sessão de teste
> const mentorship = await ethers.getContractAt("Mentorship", "ENDERECO_CONTRATO")
> const tx = await mentorship.createSession(
    "0xEnderecoMentor", 
    "0xEnderecoTokenTeste", 
    ethers.utils.parseUnits("10", 6), // 10 USDT
    Math.floor(Date.now()/1000) + 3600, // 1 hora no futuro
    3600 // 1 hora de duração
  )
> await tx.wait()
```

### 2. **Testar Frontend**

```bash
# Iniciar frontend em modo desenvolvimento
cd "/home/mathewsl/Chain Academy V2/frontend"
npm start

# Acessar: http://localhost:3000
# Conectar carteira na rede Sepolia
# Testar criação de sessão
```

---

## 🛠️ COMANDOS ÚTEIS

### **Verificação Manual de Contratos**

```bash
# Verificar Mentorship
npx hardhat verify --network sepolia ENDERECO_MENTORSHIP "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"

# Verificar Escrow
npx hardhat verify --network sepolia ENDERECO_ESCROW "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"
```

### **Interagir com Contratos**

```bash
# Console interativo
npx hardhat console --network sepolia

# Executar scripts específicos
npx hardhat run scripts/manage-tokens.js --network sepolia
```

### **Limpar e Recompilar**

```bash
# Limpar cache
npm run clean

# Recompilar
npm run compile
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### **Erro: "Insufficient funds"**
- Verifique se tem ETH suficiente na carteira
- Use faucets para conseguir mais tokens de teste

### **Erro: "Network not found"**
- Verifique se a rede está configurada no hardhat.config.js
- Confirme se está usando o nome correto da rede

### **Erro: "Contract not verified"**
- Normal em testnets
- Use verificação manual com etherscan API

### **Erro: "Gas estimation failed"**
- Aumente o gasLimit no hardhat.config.js
- Verifique se o contrato tem fundos suficientes

---

## 📋 CHECKLIST FINAL

### ✅ **Deploy Completo**
- [ ] Contratos compilados sem erros
- [ ] Todos os testes passando (19/19)
- [ ] Deploy realizado em pelo menos 1 testnet
- [ ] Contratos verificados nos block explorers
- [ ] Endereços anotados e salvos

### ✅ **Configuração Frontend**
- [ ] Endereços dos contratos atualizados
- [ ] Tokens de teste configurados
- [ ] Frontend conectando na testnet
- [ ] Testes funcionais básicos realizados

### ✅ **Próximos Passos**
- [ ] Testes de integração completos
- [ ] Testes com usuários reais
- [ ] Monitoramento de transações
- [ ] Documentação atualizada
- [ ] Preparação para mainnet

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique os logs** detalhadamente
2. **Consulte a documentação** do Hardhat
3. **Teste em rede local** primeiro
4. **Use block explorers** para debugging

**Lembre-se**: Testnets são ambientes seguros para experimentar. Sempre teste completamente antes de considerar deploy em mainnet!

---

## 🎯 RESUMO RÁPIDO

```bash
# 1. Configurar
cp .env.testnet .env
# Editar .env com sua private key

# 2. Preparar
npm install && npm run compile && npm test

# 3. Deploy
npm run deploy:sepolia

# 4. Verificar
# Acessar sepolia.etherscan.io com endereço do contrato

# 5. Testar
npx hardhat console --network sepolia
```

**🎉 Pronto! Seus contratos estão deployados em testnet com segurança!**