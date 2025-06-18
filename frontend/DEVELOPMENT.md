# Chain Academy V2 - Development Guide

## Overview

This guide covers the enhanced development tools and workflows for Chain Academy V2 frontend development.

## Development Tools Stack

### Core Technologies
- **React 19** - Latest React with automatic batching and concurrent features
- **TypeScript 5.8** - Enhanced type checking with strict mode
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **CRACO** - Create React App Configuration Override (Primary)
- **Vite** - Alternative modern build tool (Optional)

### Code Quality Tools
- **ESLint 9** - Modern flat configuration with comprehensive rules
- **Prettier** - Code formatting with project-specific rules
- **TypeScript** - Strict mode with enhanced type checking
- **Husky** - Git hooks for automated code quality checks
- **lint-staged** - Run linters on staged files only

### Testing Framework
- **React Testing Library** - Component testing (Current)
- **Vitest** - Modern test runner (Alternative)
- **Jest** - Test runner with coverage reports

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Setup git hooks (automated)
npm run prepare
```

### Development Commands

```bash
# Start development server (Primary - uses PM2 for stability)
npm start

# Alternative development server (Vite-based)
npm run start:vite

# Run type checking
npm run type-check

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Run all quality checks
npm run dev:tools
```

### Build Commands

```bash
# Production build (Primary)
npm run build

# Alternative build (Vite-based)
npm run build:vite

# Analyze bundle size
npm run build:analyze

# Preview production build
npm run preview
```

### Testing Commands

```bash
# Run tests (Current)
npm test

# Run tests with Vitest (Alternative)
npm run test:vitest

# Run tests with coverage
npm run test:coverage

# Interactive test UI
npm run test:ui
```

## Code Quality Automation

### Pre-commit Hooks

Automated quality checks run before each commit:

1. **ESLint** - Code linting and error detection
2. **Prettier** - Code formatting consistency
3. **TypeScript** - Type checking validation

### ESLint Configuration

Modern flat configuration with:
- TypeScript integration
- React and React Hooks rules
- Import/export organization
- Accessibility checking
- Prettier integration

### TypeScript Configuration

Enhanced strict mode with:
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- Path mapping for clean imports

## Path Aliases

Use clean import paths throughout the project:

```typescript
// Instead of relative imports
import { Component } from '../../../components/Component';

// Use path aliases
import { Component } from '@components/Component';
```

Available aliases:
- `@/*` - src/*
- `@components/*` - src/components/*
- `@pages/*` - src/pages/*
- `@hooks/*` - src/hooks/*
- `@utils/*` - src/utils/*
- `@types/*` - src/types/*
- `@contexts/*` - src/contexts/*
- `@contracts/*` - src/contracts/*
- `@config/*` - src/config/*
- `@styles/*` - src/styles/*

## Build Optimization

### CRACO Configuration (Primary)

Enhanced webpack configuration with:
- **Development**: Stability optimizations and path aliases
- **Production**: Code splitting and bundle optimization
- **Caching**: Filesystem caching for faster builds

### Vite Configuration (Alternative)

Modern build tool with:
- **Fast HMR**: Sub-second hot module replacement
- **Bundle Analysis**: Built-in bundle size analysis
- **Modern JavaScript**: ESNext target for smaller bundles
- **Optimized Dependencies**: Pre-bundled common dependencies

## Smart Contract Development

Enhanced Hardhat configuration with:

### Additional Tools
- **Gas Reporter** - Analyze gas usage
- **Solidity Coverage** - Test coverage reports
- **Contract Verification** - Automated Etherscan verification
- **TypeChain** - Generate TypeScript types from contracts

### Enhanced Scripts

```bash
# Basic commands
npm run compile
npm run test
npm run deploy:local

# Enhanced testing
npm run test:gas        # With gas reporting
npm run test:coverage   # With coverage
npm run test:trace      # With transaction traces

# Development tools
npm run clean           # Clean artifacts
npm run typechain       # Generate types
npm run security:slither # Security analysis
```

## Development Workflow

### 1. Code Development
1. Write code using TypeScript with strict type checking
2. Use path aliases for clean imports
3. Follow ESLint rules for consistency
4. Format code automatically with Prettier

### 2. Quality Assurance
1. Run `npm run dev:tools` for comprehensive checks
2. Fix any TypeScript errors
3. Address ESLint warnings
4. Ensure code formatting is consistent

### 3. Testing
1. Write tests for new components/functions
2. Run test suite with `npm test`
3. Maintain test coverage above 70%
4. Test critical user flows

### 4. Build Verification
1. Test production build with `npm run build`
2. Verify bundle size with `npm run build:analyze`
3. Test with preview server `npm run preview`

### 5. Deployment
1. All quality checks pass automatically via git hooks
2. PM2 handles process management for stability
3. Use ecosystem.config.js for production deployment

## Performance Optimizations

### Build Performance
- **Filesystem caching** for faster rebuilds
- **Optimized dependency resolution** 
- **Tree shaking** for smaller bundles
- **Code splitting** for better loading

### Runtime Performance
- **Bundle splitting** by vendor/feature
- **Asset optimization** with proper file naming
- **Modern JavaScript** for better performance
- **Hot Module Replacement** for development

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Check TypeScript configuration
   - Verify import paths are correct
   - Clear cache: `npm run clean`

2. **Linting Errors**
   - Run `npm run lint:fix` for auto-fixes
   - Check ESLint configuration
   - Verify file extensions in configuration

3. **Type Errors**
   - Run `npm run type-check` for detailed errors
   - Check path alias configuration
   - Verify TypeScript version compatibility

### Performance Issues

1. **Slow Development Server**
   - Use Vite as alternative: `npm run start:vite`
   - Clear webpack cache
   - Check file watching configuration

2. **Large Bundle Size**
   - Run bundle analyzer: `npm run build:analyze`
   - Review import statements for tree shaking
   - Check for duplicate dependencies

## Best Practices

### Code Organization
- Use TypeScript interfaces for type definitions
- Implement proper error boundaries
- Follow React hooks best practices
- Use path aliases consistently

### Performance
- Lazy load components where appropriate
- Optimize images and assets
- Use React.memo for expensive components
- Implement proper loading states

### Security
- Validate user inputs
- Use proper sanitization for dynamic content
- Follow Web3 security best practices
- Keep dependencies updated

### Testing
- Write meaningful test descriptions
- Test user interactions, not implementation details
- Maintain high test coverage
- Use proper mocking for external dependencies

## Environment Configuration

### Development
- Source maps enabled for debugging
- Hot module replacement active
- Enhanced error reporting
- Filesystem caching

### Production
- Optimized builds with minification
- Code splitting for better caching
- Asset optimization
- Security headers and CSP

This development setup ensures code quality, performance, and maintainability while preserving the existing PM2-based deployment workflow.