#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Chain Academy V2 - Development Setup Verification\n');

const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return { 
        success: major >= 18, 
        message: `Node.js ${version} ${major >= 18 ? '✅' : '❌ (requires >= 18)'}`
      };
    }
  },
  {
    name: 'Package.json Dependencies',
    check: () => {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const hasDevDeps = pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0;
        return {
          success: hasDevDeps,
          message: `Dev dependencies: ${hasDevDeps ? '✅ Found' : '❌ Missing'}`
        };
      } catch (error) {
        return { success: false, message: '❌ package.json not found' };
      }
    }
  },
  {
    name: 'TypeScript Configuration',
    check: () => {
      const exists = fs.existsSync('tsconfig.json');
      if (!exists) return { success: false, message: '❌ tsconfig.json not found' };
      
      try {
        const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        const hasStrict = config.compilerOptions?.strict === true;
        return {
          success: exists && hasStrict,
          message: `TypeScript config: ✅ Found${hasStrict ? ' (strict mode)' : ''}`
        };
      } catch (error) {
        return { success: false, message: '❌ Invalid tsconfig.json' };
      }
    }
  },
  {
    name: 'ESLint Configuration',
    check: () => {
      const exists = fs.existsSync('eslint.config.js');
      return {
        success: exists,
        message: `ESLint config: ${exists ? '✅ Found (modern flat config)' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'Prettier Configuration',
    check: () => {
      const exists = fs.existsSync('.prettierrc.js');
      return {
        success: exists,
        message: `Prettier config: ${exists ? '✅ Found' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'Git Hooks (Husky)',
    check: () => {
      const huskyExists = fs.existsSync('.husky');
      const lintStagedExists = fs.existsSync('.lintstagedrc.js');
      return {
        success: huskyExists && lintStagedExists,
        message: `Git hooks: ${huskyExists && lintStagedExists ? '✅ Configured' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'VS Code Configuration',
    check: () => {
      const settingsExists = fs.existsSync('.vscode/settings.json');
      const extensionsExists = fs.existsSync('.vscode/extensions.json');
      return {
        success: settingsExists && extensionsExists,
        message: `VS Code config: ${settingsExists && extensionsExists ? '✅ Found' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'Build Tools',
    check: () => {
      const cracoExists = fs.existsSync('craco.config.js');
      const viteExists = fs.existsSync('vite.config.ts');
      return {
        success: cracoExists && viteExists,
        message: `Build tools: ${cracoExists && viteExists ? '✅ CRACO + Vite available' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'Testing Setup',
    check: () => {
      const jestExists = fs.existsSync('src/setupTests.ts');
      const vitestExists = fs.existsSync('vitest.config.ts');
      return {
        success: jestExists && vitestExists,
        message: `Testing: ${jestExists && vitestExists ? '✅ Jest + Vitest available' : '❌ Missing'}`
      };
    }
  },
  {
    name: 'Smart Contracts',
    check: () => {
      try {
        const contractsExist = fs.existsSync('../contracts/hardhat.config.js');
        return {
          success: contractsExist,
          message: `Smart contracts: ${contractsExist ? '✅ Hardhat configured' : '❌ Missing'}`
        };
      } catch (error) {
        return { success: false, message: '❌ Contracts directory not accessible' };
      }
    }
  }
];

let allPassed = true;

console.log('Running setup verification checks...\n');

checks.forEach((check, index) => {
  try {
    const result = check.check();
    console.log(`${index + 1}. ${check.name}: ${result.message}`);
    if (!result.success) allPassed = false;
  } catch (error) {
    console.log(`${index + 1}. ${check.name}: ❌ Error - ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('🎉 All checks passed! Development environment is ready.');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm start (uses PM2 for stability)');
  console.log('3. Alternative: npm run start:vite (modern build tool)');
  console.log('4. Quality checks: npm run dev:tools');
} else {
  console.log('⚠️  Some checks failed. Please review the configuration.');
  console.log('\nTo fix issues:');
  console.log('1. Run: npm install (install dependencies)');
  console.log('2. Run: npm run prepare (setup git hooks)');
  console.log('3. Check documentation: DEVELOPMENT.md');
}

console.log('\n📚 Available commands:');
console.log('- npm start              # Start with CRACO (PM2 managed)');
console.log('- npm run start:vite     # Start with Vite (alternative)');
console.log('- npm run build          # Production build');
console.log('- npm run test           # Run tests');
console.log('- npm run lint           # Lint code');
console.log('- npm run format         # Format code');
console.log('- npm run type-check     # TypeScript checking');
console.log('- npm run dev:tools      # Run all quality checks');

process.exit(allPassed ? 0 : 1);