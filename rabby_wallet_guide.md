# Guia Específico para Rabby Wallet

## Método 1: Via Rabby - Transaction Builder

1. **Abra a Rabby Wallet**
2. **Clique no menu (3 linhas) no canto superior esquerdo**
3. **Procure por "More" ou "Tools"**
4. **Se tiver "Custom Transaction" ou "Contract Interaction", use isso**

## Método 2: Via Rabby - Send Custom

1. **Na Rabby, clique em "Send"**
2. **No campo de endereço, cole:**
   ```
   0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
   ```
3. **Se aparecer "Advanced" ou ícone de engrenagem, clique**
4. **Procure por "Data" ou "Input Data"**

## Método 3: Use um Transaction Builder Externo

Como a Rabby pode não ter interface direta para hex data, use estas ferramentas:

### A) MyCrypto.com
1. Acesse: https://app.mycrypto.com/interact-with-contracts
2. **Network:** Selecione a rede (Arbitrum, Base, etc)
3. **Contract Address:** `0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48`
4. **ABI:** Cole isto:
```json
[{"inputs":[{"name":"token","type":"address"}],"name":"addSupportedToken","outputs":[],"stateMutability":"nonpayable","type":"function"}]
```
5. **Conecte a Rabby via WalletConnect**
6. **Selecione a função "addSupportedToken"**
7. **Para ETH, digite:** `0x0000000000000000000000000000000000000000`
8. **Para USDC/USDT, use os endereços da lista**

### B) Etherscan com WalletConnect
1. Vá para: https://etherscan.io/verifiedSignatures
2. Use WalletConnect para conectar a Rabby
3. Crie uma transação customizada

### C) Use esta ferramenta simples:
https://abi.hashex.org/

1. **Contract:** `0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48`
2. **Network:** Selecione a correta
3. **Function:** addSupportedToken
4. **Token address:** Cole o endereço

## Método 4: Comando Direto (mais técnico)

Se você tem acesso ao console do navegador com a Rabby:

```javascript
// Conectar primeiro
await ethereum.request({ method: 'eth_requestAccounts' });

// Enviar transação (exemplo para habilitar ETH no Arbitrum)
await ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: ethereum.selectedAddress,
    to: '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48',
    data: '0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000'
  }]
});
```

## Endereços dos Tokens:

### ETH (todas as redes):
`0x0000000000000000000000000000000000000000`

### Arbitrum:
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- USDT: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

### Base:
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- USDT: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

### Optimism:
- USDC: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- USDT: `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58`

### Polygon:
- USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- USDT: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`