# Como Executar as Transações para Habilitar Tokens

## Opção 1: Via Etherscan/Blockscanner (Mais Fácil)

### Para cada rede, siga estes passos:

1. **Acesse o Block Explorer da rede:**
   - Arbitrum: https://arbiscan.io/address/0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48#writeContract
   - Base: https://basescan.org/address/0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48#writeContract
   - Optimism: https://optimistic.etherscan.io/address/0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48#writeContract
   - Polygon: https://polygonscan.com/address/0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48#writeContract

2. **Conecte sua wallet (a mesma que fez o deploy - owner do contrato)**

3. **Vá para a aba "Write Contract"**

4. **Procure a função `addSupportedToken`**

5. **Para cada token, execute:**
   - **ETH**: Digite `0x0000000000000000000000000000000000000000`
   - **USDC**: Digite o endereço USDC daquela rede (veja abaixo)
   - **USDT**: Digite o endereço USDT daquela rede (veja abaixo)

### Endereços dos Tokens por Rede:

**Arbitrum:**
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- USDT: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

**Base:**
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- USDT: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

**Optimism:**
- USDC: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- USDT: `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58`

**Polygon:**
- USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- USDT: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

## Opção 2: Via Wallet (MetaMask/Rabby)

1. **Abra sua wallet e certifique-se de estar na rede correta**

2. **Para cada transação, envie com estes dados:**
   - **To**: `0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48`
   - **Value**: `0` (zero ETH)
   - **Data**: Use o hex data fornecido no script `enable_all_tokens.js`

3. **Exemplo no MetaMask:**
   - Clique em "Send"
   - Digite o endereço do contrato
   - Valor: 0
   - Clique em "Hex" e cole o data da transação

## Opção 3: Via Script Automatizado

Crie um script usando ethers.js ou web3.js para executar todas as transações automaticamente.

```javascript
// Exemplo com ethers.js
const { ethers } = require('ethers');

// Configure sua private key
const PRIVATE_KEY = 'SUA_PRIVATE_KEY_AQUI';
const CONTRACT_ADDRESS = '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48';

// Para cada rede
async function enableTokensOnNetwork(rpcUrl, tokens) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const abi = ['function addSupportedToken(address token)'];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  
  // Habilitar ETH
  console.log('Habilitando ETH...');
  await contract.addSupportedToken('0x0000000000000000000000000000000000000000');
  
  // Habilitar USDC
  console.log('Habilitando USDC...');
  await contract.addSupportedToken(tokens.USDC);
  
  // Habilitar USDT
  console.log('Habilitando USDT...');
  await contract.addSupportedToken(tokens.USDT);
}
```

## Verificando o Sucesso

Após executar as transações, verifique se os tokens foram habilitados:

```bash
cd /home/mathewsl/Chain Academy V2
node debug_contract.js
```

O script mostrará:
- ETH token supported: true ✅
- USDC token supported: true ✅
- USDT token supported: true ✅

## Ordem Recomendada

1. Comece com Arbitrum (onde você já testou)
2. Depois Base
3. Então Optimism
4. Por fim Polygon

## Custos Estimados de Gas

- Arbitrum: ~0.001 ETH por transação
- Base: ~0.0001 ETH por transação
- Optimism: ~0.0001 ETH por transação
- Polygon: ~0.01 MATIC por transação

Total: 12 transações (3 tokens × 4 redes)

## Importante

⚠️ **Você DEVE ser o owner do contrato** (a wallet que fez o deploy)
⚠️ **Tenha saldo de gas em cada rede** antes de começar
✅ **Cada transação habilita permanentemente o token** - não precisa repetir