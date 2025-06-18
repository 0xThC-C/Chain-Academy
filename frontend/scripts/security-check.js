#!/usr/bin/env node

/**
 * Security validation script for Chain Academy V2
 * Validates environment variables and performs security checks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env file
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
} catch (error) {
  // Silently continue if .env loading fails
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class SecurityChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const colorMap = {
      error: colors.red,
      warning: colors.yellow,
      info: colors.cyan,
      success: colors.green,
    };
    
    console.log(
      `${colorMap[level]}[${level.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`
    );
  }

  addError(message) {
    this.errors.push(message);
    this.log('error', message);
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log('warning', message);
  }

  addInfo(message) {
    this.info.push(message);
    this.log('info', message);
  }

  checkEnvironmentVariables() {
    this.addInfo('Checking environment variables...');
    
    const requiredVars = [
      'NODE_ENV',
      'VITE_APP_NAME',
    ];

    const productionRequiredVars = [
      'CORS_ORIGIN',
      'VITE_ALLOWED_ORIGINS',
      'ALLOWED_HOSTS',
    ];

    // Check basic required variables
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.addWarning(`Missing environment variable: ${varName}`);
      }
    });

    // Check production-specific variables
    if (process.env.NODE_ENV === 'production') {
      productionRequiredVars.forEach(varName => {
        if (!process.env[varName]) {
          this.addError(`Missing required production environment variable: ${varName}`);
        }
      });
    }

    // Validate sensitive variables are not hardcoded
    const sensitiveVars = [
      'REACT_APP_WALLET_CONNECT_PROJECT_ID',
      'REACT_APP_INFURA_API_KEY',
      'REACT_APP_ALCHEMY_API_KEY',
    ];

    sensitiveVars.forEach(varName => {
      if (process.env[varName] && process.env[varName].includes('your-') || process.env[varName] === 'changeme') {
        this.addError(`${varName} appears to contain a placeholder value`);
      }
    });
  }

  checkSecurityHeaders() {
    this.addInfo('Checking security configuration...');
    
    // Check if source maps are disabled in production
    if (process.env.NODE_ENV === 'production' && process.env.GENERATE_SOURCEMAP === 'true') {
      this.addError('Source maps should be disabled in production for security');
    }

    // Check HTTPS configuration for production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.VITE_HTTPS !== 'true') {
        this.addWarning('HTTPS should be enabled in production');
      }

      if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.startsWith('http:')) {
        this.addError('CORS origin should use HTTPS in production');
      }
    }
  }

  checkDependencyVulnerabilities() {
    this.addInfo('Checking for dependency vulnerabilities...');
    
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addError('package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for known vulnerable packages
      const vulnerablePackages = [
        { name: 'postcss', minVersion: '8.4.31' },
        { name: 'nth-check', minVersion: '2.0.1' },
        { name: 'webpack-dev-server', minVersion: '5.2.1' },
      ];

      vulnerablePackages.forEach(({ name, minVersion }) => {
        const installedVersion = packageJson.dependencies?.[name] || packageJson.devDependencies?.[name];
        if (installedVersion) {
          const version = installedVersion.replace(/[^\d.]/g, '');
          if (this.compareVersions(version, minVersion) < 0) {
            this.addError(`${name} version ${version} is vulnerable. Minimum safe version: ${minVersion}`);
          }
        }
      });
    } catch (error) {
      this.addError(`Error reading package.json: ${error.message}`);
    }
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  checkFilePermissions() {
    this.addInfo('Checking critical file permissions...');
    
    const criticalFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'package.json',
    ];

    criticalFiles.forEach(filename => {
      const filepath = path.join(__dirname, '..', filename);
      if (fs.existsSync(filepath)) {
        try {
          const stats = fs.statSync(filepath);
          const mode = stats.mode;
          
          // Check if file is readable by others (basic check)
          if (mode & parseInt('044', 8)) {
            this.addWarning(`${filename} may have overly permissive read permissions`);
          }
        } catch (error) {
          this.addWarning(`Could not check permissions for ${filename}: ${error.message}`);
        }
      }
    });
  }

  generateCSPNonce() {
    if (process.env.NODE_ENV === 'production' && !process.env.CSP_NONCE) {
      const nonce = crypto.randomBytes(16).toString('base64');
      this.addInfo(`Generated CSP nonce: ${nonce}`);
      this.addInfo('Set CSP_NONCE environment variable to: ' + nonce);
    }
  }

  checkBuildSecurity() {
    this.addInfo('Checking build security configuration...');
    
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      // Check for source map files in production build
      const files = fs.readdirSync(distPath, { recursive: true });
      const sourceMapFiles = files.filter(file => file.endsWith('.map'));
      
      if (sourceMapFiles.length > 0 && process.env.NODE_ENV === 'production') {
        this.addError(`Found ${sourceMapFiles.length} source map files in production build`);
        sourceMapFiles.forEach(file => {
          this.addError(`  - ${file}`);
        });
      }
    }
  }

  run() {
    console.log(`${colors.cyan}🔒 Chain Academy V2 Security Check${colors.reset}`);
    console.log(`${colors.cyan}=====================================\n${colors.reset}`);

    this.checkEnvironmentVariables();
    this.checkSecurityHeaders();
    this.checkDependencyVulnerabilities();
    this.checkFilePermissions();
    this.generateCSPNonce();
    this.checkBuildSecurity();

    console.log(`\n${colors.cyan}Security Check Summary:${colors.reset}`);
    console.log(`${colors.red}Errors: ${this.errors.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.cyan}Info: ${this.info.length}${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}❌ Security check failed with ${this.errors.length} error(s)${colors.reset}`);
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Security check completed with ${this.warnings.length} warning(s)${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}✅ All security checks passed!${colors.reset}`);
      process.exit(0);
    }
  }
}

// Run the security checker
if (require.main === module) {
  const checker = new SecurityChecker();
  checker.run();
}

module.exports = SecurityChecker;