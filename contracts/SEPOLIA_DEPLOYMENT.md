# 🧪 Sepolia Testnet Deployment - Chain Academy V2

## Status do Deploy

### ✅ Compilação: SUCESSO
Todos os contratos foram compilados com sucesso:
- ProgressiveEscrowV3.sol
- Mentorship.sol
- MentorshipFactory.sol
- MockERC20.sol

### ✅ Teste Local: SUCESSO
Deploy testado com sucesso na rede local Hardhat com os seguintes endereços:

```json
{
  "network": "hardhat-local",
  "timestamp": "2025-06-15T23:33:00.286Z",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "contracts": {
    "mockUSDT": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "mockUSDC": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
    "progressiveEscrow": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "mentorship": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "mentorshipFactory": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
  },
  "transactionHashes": {
    "mockUSDT": "0x02d372db0407016c3f9f49b4310d915636571a68f94668e9494a8907420e5a9a",
    "mockUSDC": "0x75516927cf0f8ef82bac0e2743fa817f19cb62d3bb6ab36d7e3d9e06998ae304",
    "progressiveEscrow": "0x48cdfdcaa22329c0cceb5f72b59a6f6bf99335f1b393dac2e0f5475e01d9a3a3",
    "mentorship": "0xf2948db4a3f9b65289c4cf361617ac912d55d6abacc7e5ca2f7477563732971f",
    "mentorshipFactory": "0xe1308ac485fc106286c86eada1afc3672e6267622b2ed39308de9952711685e1"
  }
}
```

### ⚠️ Deploy na Sepolia: PENDENTE (ETH Insuficiente)

**Status**: Configurado e pronto para deploy, mas requer ETH de teste

**Endereço do Deployer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Saldo Atual**: 0.000000000000000005 ETH

**Saldo Necessário**: Mínimo 0.01 ETH

## 🔧 Como Completar o Deploy na Sepolia

### 1. Obter ETH de Teste
Visite um dos faucets da Sepolia e solicite ETH para o endereço:
`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Faucets Recomendados:**
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.net/)
- [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia)

### 2. Executar o Deploy
Após obter ETH de teste, execute:

```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
PRIVATE_KEY=YOUR_SECURE_PRIVATE_KEY_HERE npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### 3. Verificar no Explorer
Após o deploy, verifique os contratos em:
https://sepolia.etherscan.io/

## 📋 Contratos Configurados para Deploy

### 1. MockERC20 Tokens
- **Mock USDT**: Token de teste com 6 decimais
- **Mock USDC**: Token de teste com 6 decimais

### 2. ProgressiveEscrowV3
- **Platform Wallet**: 0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c
- **Platform Fee**: 10%
- **Tokens Suportados**: Mock USDT e USDC

### 3. Mentorship
- **Platform Fee Recipient**: 0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c
- **Platform Fee**: 10%
- **Tokens Suportados**: Mock USDT e USDC

### 4. MentorshipFactory
- **Configuração**: Padrão sem parâmetros iniciais

## 🔍 Verificação Pós-Deploy

Após o deploy bem-sucedido, o script automaticamente:

1. ✅ Adiciona tokens suportados aos contratos
2. ✅ Verifica configurações dos contratos
3. ✅ Exibe endereços e transaction hashes
4. ✅ Fornece links para o explorer

## 🚨 Importantes Lembretes

1. **Segurança**: A private key usada é de teste. NUNCA use em mainnet!
2. **Faucets**: ETH de testnet pode demorar para chegar (até 24h)
3. **Gas**: O script usa gas automático, adequado para testnet
4. **Verificação**: Contratos podem ser verificados automaticamente se configurado

## 📝 Próximos Passos

1. **Obter ETH de teste** nos faucets
2. **Executar deploy na Sepolia**  
3. **Anotar endereços dos contratos**
4. **Testar funcionalidades básicas**
5. **Atualizar frontend com endereços**
6. **Executar testes de integração**