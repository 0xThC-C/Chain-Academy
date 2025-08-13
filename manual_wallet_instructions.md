# Instruções Manuais para Habilitar Tokens via Wallet

Como os exploradores de bloco não têm interface Write Contract, você precisa enviar as transações manualmente pela sua wallet.

## Método 1: Via MetaMask/Rabby (Envio Manual)

### Para cada transação:

1. **Abra sua wallet (MetaMask, Rabby, etc.)**

2. **Clique em "Enviar" ou "Send"**

3. **No campo "Para/To":** 
   ```
   0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
   ```

4. **No campo "Valor/Amount":**
   ```
   0
   ```

5. **Clique em "Hex" ou "Dados Avançados" e cole o data correspondente:**

### Arbitrum One (Rede 42161)

**Habilitar ETH:**
```
0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000
```

**Habilitar USDC:**
```
0xeb0835bf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831
```

**Habilitar USDT:**
```
0xeb0835bf000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
```

### Base (Rede 8453)

**Habilitar ETH:**
```
0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000
```

**Habilitar USDC:**
```
0xeb0835bf000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913
```

**Habilitar USDT:**
```
0xeb0835bf000000000000000000000000fde4c96c8593536e31f229ea8f37b2ada2699bb2
```

### Optimism (Rede 10)

**Habilitar ETH:**
```
0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000
```

**Habilitar USDC:**
```
0xeb0835bf0000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85
```

**Habilitar USDT:**
```
0xeb0835bf00000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e58
```

### Polygon (Rede 137)

**Habilitar ETH:**
```
0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000
```

**Habilitar USDC:**
```
0xeb0835bf0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174
```

**Habilitar USDT:**
```
0xeb0835bf000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f
```

## Método 2: Via Foundry Cast (Linha de Comando)

Se você tem o Foundry instalado e a private key:

```bash
# Exemplo para habilitar ETH no Arbitrum
cast send 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48 \
  "addSupportedToken(address)" \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://arb1.arbitrum.io/rpc \
  --private-key YOUR_PRIVATE_KEY
```

## Método 3: Via Frame.sh ou WalletConnect

Use o Frame.sh (frame.sh) que tem uma interface para enviar transações customizadas com data hexadecimal.

## Verificação

Após cada transação, você pode verificar se funcionou rodando:

```bash
cd /home/mathewsl/Chain Academy V2
node debug_contract.js
```

Mude a rede no script para verificar cada uma.