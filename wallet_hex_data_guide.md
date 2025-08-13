# Como Encontrar a Opção Hex Data em Diferentes Wallets

## MetaMask

1. **Abra o MetaMask**
2. **Clique em "Send" (Enviar)**
3. **Digite o endereço do contrato:**
   ```
   0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
   ```
4. **No campo Amount, digite:** `0`
5. **IMPORTANTE: Clique em "Next"**
6. **Na tela de confirmação, procure por "HEX DATA"**
   - Se não aparecer, clique nos 3 pontinhos no canto superior direito
   - Ou procure por "Advanced" ou "Show Hex Data"
7. **Cole o hex data correspondente**

### Alternativa no MetaMask:
- Vá em Settings > Advanced > Show Hex Data (ative esta opção)
- Agora o campo aparecerá automaticamente

## Rabby Wallet

1. **Abra a Rabby**
2. **Clique em "Send"**
3. **No topo, mude de "Token" para "Contract"**
4. **Digite o endereço:**
   ```
   0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
   ```
5. **O campo "Data (Hex)" aparecerá automaticamente**
6. **Cole o hex data**

## Rainbow Wallet

1. **Vá em "Send"**
2. **Digite o endereço do contrato**
3. **Toque em "Add Data"**
4. **Cole o hex data**

## Trust Wallet

1. **Vá em "Send"**
2. **Escolha a rede correta**
3. **Digite o endereço do contrato**
4. **Toque em "Advanced"**
5. **No campo "Data", cole o hex data**

## Frame.sh (Desktop)

1. **Acesse frame.sh**
2. **Vá em "Signer"**
3. **Clique em "Custom Transaction"**
4. **Preencha:**
   - To: `0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48`
   - Value: `0`
   - Data: (cole o hex data)

## Safe (antigo Gnosis Safe)

1. **New Transaction > Contract Interaction**
2. **Digite o endereço do contrato**
3. **Em "Enter hex encoded data", cole o hex data**

## Se sua wallet não tem opção de hex data

Use o WalletConnect com uma dApp que suporte, como:
- https://calldata.netlify.app/
- https://abi.hashex.org/

---

# Hex Data para Copiar/Colar

## Habilitar ETH (mesmo para todas as redes):
```
0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000
```

## Arbitrum - USDC:
```
0xeb0835bf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831
```

## Arbitrum - USDT:
```
0xeb0835bf000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
```

(Todos os outros hex data estão no arquivo manual_wallet_instructions.md)