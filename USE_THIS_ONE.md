# 🎯 SOLUÇÃO MAIS SIMPLES - USE ESTA!

Como a Rabby não está mostrando as opções avançadas, use o **MyCrypto** que funciona perfeitamente:

## Passo a Passo Completo:

### 1. Acesse o MyCrypto
🔗 **https://app.mycrypto.com/interact-with-contracts**

### 2. Configure a Rede
No canto superior direito, selecione a rede:
- Arbitrum
- Base  
- Optimism
- Polygon

### 3. Cole o Endereço do Contrato
```
0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
```

### 4. Cole o ABI (IMPORTANTE!)
Cole exatamente isto no campo ABI:
```json
[{"inputs":[{"name":"token","type":"address"}],"name":"addSupportedToken","outputs":[],"stateMutability":"nonpayable","type":"function"}]
```

### 5. Clique em "Access"

### 6. Conecte sua Wallet
- Clique em "Connect Wallet"
- Escolha "WalletConnect"
- Escaneie o QR Code com a Rabby

### 7. Execute as Transações
Aparecerá um dropdown com "addSupportedToken"

Para cada token:

**ETH (todas as redes):**
```
0x0000000000000000000000000000000000000000
```

**USDC Arbitrum:**
```
0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

**USDT Arbitrum:**
```
0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
```

**USDC Base:**
```
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**USDT Base:**
```
0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
```

**USDC Optimism:**
```
0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
```

**USDT Optimism:**
```
0x94b008aA00579c1307B0EF2c499aD98a8ce58e58
```

**USDC Polygon:**
```
0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

**USDT Polygon:**
```
0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

### 8. Para cada transação:
1. Cole o endereço do token no campo
2. Clique em "Write"
3. Confirme na Rabby

## 🚨 ORDEM RECOMENDADA:
1. Comece com ETH em todas as redes
2. Depois USDC em todas as redes
3. Por fim USDT em todas as redes

---

## Alternativa se MyCrypto não funcionar:

Use o **Gnosis Safe Transaction Builder**:
https://gnosis-safe.io/app/

Mesmo sem ter um Safe, você pode usar para criar e enviar transações!