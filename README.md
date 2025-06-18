# Chain Academy V2

## 🚨 IMPORTANTE: Sempre use PM2 para iniciar o projeto

Para evitar crashes quando as tarefas terminam ou ao atualizar a página, SEMPRE inicie o projeto com PM2.

### Início Rápido

```bash
# Na pasta raiz do projeto, execute:
./start.sh
```

Ou manualmente:

```bash
# Instalar PM2 (apenas primeira vez)
npm install -g pm2

# Iniciar o frontend com PM2
pm2 start ecosystem.config.js
```

### Comandos PM2

```bash
# Ver logs
pm2 logs

# Ver status
pm2 status

# Parar tudo
pm2 stop all

# Reiniciar
pm2 restart all
```

### Por que PM2?

O PM2 mantém o frontend rodando em segundo plano como um processo daemon, evitando que ele seja encerrado quando o terminal ou VS Code é fechado, ou quando uma tarefa é concluída.

---

Plataforma descentralizada de mentoria em blockchain, criada seguindo as especificações do CLAUDE.md.

## Estrutura do Projeto

```
Chain Academy V2/
├── frontend/          # Aplicação React com TypeScript e Tailwind CSS
├── backend/           # API Node.js com Express e TypeScript
├── contracts/         # Smart contracts em Solidity com Hardhat
├── CLAUDE.md          # Especificações e instruções do projeto
└── README.md          # Este arquivo
```

## Comandos de Desenvolvimento

### Frontend (React + TypeScript + Tailwind)
```bash
cd frontend

# Desenvolvimento
npm start

# Build para produção
npm run build

# Testes
npm test
```

### Backend (Node.js + Express + TypeScript)
```bash
cd backend

# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Iniciar versão de produção
npm start

# Testes
npm test
```

### Contracts (Hardhat + Solidity)
```bash
cd contracts

# Compilar contratos
npm run compile

# Executar testes
npm test

# Deploy local (rede Hardhat)
npm run deploy:local

# Deploy em diferentes redes
npm run deploy:ethereum
npm run deploy:polygon
npm run deploy:arbitrum
npm run deploy:optimism
npm run deploy:base

# Iniciar nó local Hardhat
npx hardhat node
```

## Configuração

1. **Frontend**: Configure as variáveis de ambiente copiando `.env.example` para `.env`
2. **Backend**: Configure as variáveis de ambiente copiando `.env.example` para `.env`
3. **Contracts**: Configure as variáveis de ambiente copiando `.env.example` para `.env`

## Tecnologias Utilizadas

### Frontend
- React 18 com TypeScript
- Tailwind CSS para estilização
- wagmi para integração Web3
- viem para utilitários blockchain
- ethers.js para interações blockchain
- @heroicons/react para ícones

### Backend
- Node.js com Express
- TypeScript
- CORS e Helmet para segurança
- dotenv para variáveis de ambiente
- ethers.js para blockchain
- SIWE para autenticação wallet

### Smart Contracts
- Solidity 0.8.20
- Hardhat para desenvolvimento
- OpenZeppelin para contratos seguros
- Suporte para Ethereum, Polygon, Arbitrum, Optimism e Base

## Próximos Passos

1. Implementar componentes React no frontend
2. Criar rotas e controllers no backend
3. Desenvolver smart contracts de mentoria
4. Integrar autenticação wallet (SIWE)
5. Implementar sistema de escrow para pagamentos
6. Configurar WebRTC para comunicação em tempo real

## Design System

O projeto segue um esquema de cores estrito:
- **Primário**: #000000 (Preto)
- **Secundário**: #FFFFFF (Branco)  
- **Destaque**: #FF0000 (Vermelho)

Sem uso de emojis na interface, apenas ícones da biblioteca @heroicons/react.