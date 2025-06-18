# Configuration Files for Chain Academy V2

This directory contains all the essential configuration files for the Chain Academy V2 development environment. These configurations are based on extensive research of modern development tools and best practices for Web3 applications.

## 📁 File Overview

### Core Development Tools

- **`vite.config.ts`** - Primary build tool configuration with React, TypeScript, and optimization settings
- **`vitest.config.ts`** - Modern testing framework configuration for unit and integration tests
- **`playwright.config.ts`** - E2E testing configuration for cross-browser testing
- **`eslint.config.js`** - Modern flat config ESLint setup with TypeScript and React rules

### Smart Contract Development

- **`hardhat.config.ts`** - Multi-chain smart contract development and deployment
- **`foundry.toml`** - Advanced Solidity testing and gas optimization

### Build & Deployment

- **`.github-workflows-ci.yml`** - Complete CI/CD pipeline for automated testing and deployment
- **`package.json`** - Project dependencies and npm scripts

## 🚀 Quick Setup Guide

### 1. Copy Configuration Files

```bash
# Copy all config files to your project root
cp configs/vite.config.ts ./
cp configs/vitest.config.ts ./
cp configs/playwright.config.ts ./
cp configs/eslint.config.js ./
cp configs/hardhat.config.ts ./
cp configs/foundry.toml ./
cp configs/package.json ./

# Copy GitHub Actions workflow
mkdir -p .github/workflows
cp configs/.github-workflows-ci.yml .github/workflows/ci.yml
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 3. Environment Setup

Create a `.env` file with the following variables:

```env
# RPC URLs
MAINNET_RPC_URL=your_mainnet_rpc_url
SEPOLIA_RPC_URL=your_sepolia_rpc_url
POLYGON_RPC_URL=your_polygon_rpc_url
MUMBAI_RPC_URL=your_mumbai_rpc_url
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
ARBITRUM_SEPOLIA_RPC_URL=your_arbitrum_sepolia_rpc_url
OPTIMISM_RPC_URL=your_optimism_rpc_url
OPTIMISM_SEPOLIA_RPC_URL=your_optimism_sepolia_rpc_url
BASE_RPC_URL=your_base_rpc_url
BASE_SEPOLIA_RPC_URL=your_base_sepolia_rpc_url

# API Keys for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
BASESCAN_API_KEY=your_basescan_api_key

# Optional
PRIVATE_KEY=your_private_key_for_deployment
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
REPORT_GAS=true
```

## 🛠 Development Commands

### Frontend Development

```bash
# Start development server with PM2 (recommended)
npm run dev

# Or start with Vite directly
npm run dev:vite

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run smart contract tests
npm run contracts:test
npm run foundry:test
```

### Smart Contract Development

```bash
# Compile contracts
npm run contracts:compile
npm run foundry:build

# Test contracts
npm run contracts:test
npm run foundry:test

# Deploy contracts
npm run contracts:deploy:local
npm run contracts:deploy:sepolia

# Start local node
npm run contracts:node
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check types
npm run type-check
```

## 🔧 Configuration Details

### Vite Configuration

- **Fast HMR**: Lightning-fast hot module replacement
- **TypeScript**: Full TypeScript support with strict mode
- **React**: Latest React 18+ with automatic JSX runtime
- **Path Aliases**: Convenient import aliases (@, @components, etc.)
- **Bundle Optimization**: Manual chunks for better caching
- **Asset Optimization**: Image and asset optimization

### Vitest Configuration

- **JSdom Environment**: Browser-like testing environment
- **React Testing Library**: Component testing utilities
- **Coverage Reports**: Comprehensive test coverage
- **Multiple Workspaces**: Separate configs for different test types
- **Browser Mode**: Optional browser testing

### Playwright Configuration

- **Multi-Browser**: Chrome, Firefox, Safari testing
- **Mobile Testing**: iOS and Android viewport testing
- **Parallel Execution**: Fast test execution
- **Visual Testing**: Screenshot and video recording
- **Network Interception**: API mocking capabilities

### ESLint Configuration

- **Flat Config**: Modern ESLint 9+ configuration
- **TypeScript**: Full TypeScript linting
- **React**: React-specific rules and hooks
- **Accessibility**: JSX a11y rules
- **Import Organization**: Automatic import sorting
- **Prettier Integration**: Code formatting rules

### Hardhat Configuration

- **Multi-Chain**: Support for 10+ networks
- **Viem Integration**: Modern Ethereum client
- **Gas Reporting**: Comprehensive gas analysis
- **Verification**: Automatic contract verification
- **Ignition**: Declarative deployment system

### Foundry Configuration

- **Fast Testing**: Native Solidity testing
- **Fuzzing**: Advanced property-based testing
- **Gas Optimization**: Built-in gas profiling
- **Coverage**: Line-by-line coverage reports
- **Multiple Profiles**: CI, local, intense testing modes

## 📊 Performance Features

### Build Optimization

- **Tree Shaking**: Automatic dead code elimination
- **Code Splitting**: Intelligent chunk splitting
- **Asset Inlining**: Small asset inlining
- **Compression**: Gzip and Brotli compression ready

### Testing Performance

- **Parallel Execution**: Multi-threaded test execution
- **Smart Caching**: Intelligent test result caching
- **Fast Feedback**: Quick development mode testing

### Development Experience

- **Fast Refresh**: Sub-second updates
- **Error Overlay**: Clear error reporting
- **Source Maps**: Accurate debugging information
- **Hot Reloading**: Instant style updates

## 🔒 Security Features

### Code Quality

- **Strict TypeScript**: Comprehensive type checking
- **ESLint Rules**: Security-focused linting rules
- **Dependency Scanning**: Automated vulnerability detection

### Smart Contract Security

- **Slither Integration**: Static analysis for contracts
- **Gas Limit Protection**: Prevent gas-related issues
- **Multi-Network Testing**: Cross-chain compatibility

## 🚀 CI/CD Pipeline

The included GitHub Actions workflow provides:

- **Automated Testing**: Unit, integration, and E2E tests
- **Code Quality**: Linting and formatting checks
- **Security Scanning**: Dependency and contract analysis
- **Multi-Environment**: Staging and production deployments
- **Parallel Execution**: Fast CI/CD pipeline

## 📈 Monitoring & Analytics

### Performance Monitoring

- **Bundle Analysis**: Size and dependency analysis
- **Coverage Reports**: Test coverage tracking
- **Gas Reports**: Smart contract optimization

### Error Tracking

- **Source Maps**: Accurate error locations
- **Test Reports**: Comprehensive test results
- **Build Artifacts**: Deployment-ready assets

## 🔄 Migration Guide

If you're migrating from an existing project:

1. **Backup**: Create a backup of your current configuration
2. **Gradual**: Implement configurations one at a time
3. **Testing**: Thoroughly test each configuration
4. **Team Training**: Ensure team familiarity with new tools

## 🤝 Contributing

When updating configurations:

1. Test changes thoroughly
2. Update documentation
3. Consider backward compatibility
4. Notify team of breaking changes

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Hardhat Documentation](https://hardhat.org/)
- [Foundry Documentation](https://book.getfoundry.sh/)

These configurations provide a modern, efficient, and scalable development environment specifically optimized for Web3 applications like Chain Academy V2.