# Configuração do WalletConnect - Instruções

## Problema Identificado

O WalletConnect está ficando em estado "connecting" sem conectar devido ao uso de um Project ID placeholder. Para resolver completamente o problema, você precisa obter um Project ID válido.

## Como Obter um Project ID Válido

1. **Acesse o Reown Cloud**: https://cloud.reown.com/sign-up
2. **Crie uma conta** ou faça login se já tiver uma
3. **Crie um novo projeto**:
   - Nome: Chain Academy V2
   - URL: http://127.0.0.1:3000 (para desenvolvimento)
   - Tipo: dApp
4. **Copie o Project ID** gerado
5. **Substitua no arquivo .env**:
   ```
   REACT_APP_WALLETCONNECT_PROJECT_ID=SEU_PROJECT_ID_AQUI
   ```

## Configurações Aplicadas

Já foram aplicadas as seguintes melhorias na configuração:

### 1. Metadata Completa
- Nome da aplicação
- Descrição detalhada
- URL da aplicação
- Ícones

### 2. Configurações de Rede
- RPC endpoints para todas as chains suportadas
- Relay URL específico do WalletConnect
- Configurações de logging para debug

### 3. Modal QR Code
- Tema escuro configurado
- Z-index adequado para sobreposição

### 4. Tratamento de Erros
- Logs detalhados no console
- Tratamento específico para erros do WalletConnect
- Indicadores visuais de estado de conexão

## Próximos Passos

1. Obtenha um Project ID válido seguindo as instruções acima
2. Reinicie o servidor de desenvolvimento: `npm start`
3. Teste a conexão WalletConnect
4. Verifique os logs no console do navegador para debug adicional

## Observações

- O Project ID atual é um placeholder e não funcionará em produção
- As outras carteiras (MetaMask e Injected) já funcionam corretamente
- A configuração está preparada para funcionar assim que um Project ID válido for fornecido