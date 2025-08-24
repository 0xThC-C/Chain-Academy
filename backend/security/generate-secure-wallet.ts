#!/usr/bin/env node

/**
 * Secure Wallet Generation Script
 * 
 * This script generates new wallets OFFLINE and provides secure storage options.
 * 
 * Usage:
 * - Run this script on an air-gapped machine for maximum security
 * - Store the output in secure, encrypted storage
 * - Never store private keys in code repositories
 */

import { SecureWalletManager } from './WalletManager';
import * as fs from 'fs';
import * as path from 'path';

interface WalletGenerationOptions {
  count?: number;
  outputFormat?: 'console' | 'encrypted-file' | 'both';
  masterPassword?: string;
  outputDir?: string;
}

class SecureWalletGenerator {
  
  /**
   * Generate secure wallets with multiple output options
   */
  static generateWallets(options: WalletGenerationOptions = {}): void {
    const {
      count = 1,
      outputFormat = 'console',
      masterPassword,
      outputDir = './secure-wallets'
    } = options;

    console.log('🔐 Generating Secure Wallets...\n');
    console.log('⚠️  SECURITY WARNING: Run this on an air-gapped machine!');
    console.log('⚠️  NEVER store private keys in code repositories!');
    console.log('⚠️  ALWAYS use hardware wallets for production!\n');

    const wallets = [];

    for (let i = 0; i < count; i++) {
      const wallet = SecureWalletManager.generateSecureWallet();
      wallets.push(wallet);

      console.log(`📱 Wallet ${i + 1}:`);
      console.log(`   Address: ${wallet.address}`);
      console.log(`   Mnemonic: ${wallet.mnemonic}`);
      
      if (outputFormat === 'console') {
        console.log(`   Private Key: ${wallet.privateKey}`);
      }
      console.log('');
    }

    // Save to encrypted files if requested
    if (outputFormat === 'encrypted-file' || outputFormat === 'both') {
      if (!masterPassword) {
        console.error('❌ Master password required for encrypted file output');
        process.exit(1);
      }

      this.saveEncryptedWallets(wallets, masterPassword, outputDir);
    }

    console.log('✅ Wallet generation completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Store private keys in secure, encrypted storage');
    console.log('2. Update environment variables on production server');
    console.log('3. Test wallet functionality before deploying');
    console.log('4. Set up monitoring for wallet balance');
    console.log('5. Implement key rotation schedule');
  }

  /**
   * Save wallets to encrypted files
   */
  private static saveEncryptedWallets(
    wallets: Array<{ address: string; privateKey: string; mnemonic: string }>,
    masterPassword: string,
    outputDir: string
  ): void {
    // Create secure directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { mode: 0o700 }); // Owner read/write/execute only
    }

    wallets.forEach((wallet) => {
      // Encrypt private key
      const encryptedKey = SecureWalletManager.encryptPrivateKey(wallet.privateKey, masterPassword);
      
      // Create secure wallet file
      const walletData = {
        address: wallet.address,
        encryptedPrivateKey: encryptedKey,
        mnemonic: wallet.mnemonic,
        createdAt: new Date().toISOString(),
        version: '1.0'
      };

      const filename = `wallet_${wallet.address.toLowerCase()}.json`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(
        filepath, 
        JSON.stringify(walletData, null, 2),
        { mode: 0o600 } // Owner read/write only
      );

      console.log(`💾 Encrypted wallet saved: ${filepath}`);
    });
  }

  /**
   * Create environment template for production
   */
  static createEnvTemplate(walletAddress: string): void {
    const envTemplate = `# Chain Academy V8 - Secure Wallet Configuration
# 
# SECURITY GUIDELINES:
# 1. Set these variables in your production environment (not in code)
# 2. Use external secret management (AWS Secrets, Azure Key Vault, etc.)
# 3. Rotate keys regularly (recommended: monthly)
# 4. Monitor wallet balance and transactions
# 5. Use hardware wallets for maximum security

# Primary Bot Wallet (Generated: ${new Date().toISOString()})
# Address: ${walletAddress}
CHAIN_ACADEMY_BOT_PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Master password for encrypted key files (if using file storage)
WALLET_MASTER_PASSWORD=your_secure_master_password_here

# Key rotation settings
ENABLE_KEY_ROTATION=true
KEY_ROTATION_INTERVAL_HOURS=720  # 30 days

# Security monitoring
ENABLE_WALLET_MONITORING=true
WALLET_BALANCE_ALERT_THRESHOLD=0.01  # Alert if balance drops below this

# Backup wallet addresses (for emergency use)
BACKUP_WALLET_1_ADDRESS=
BACKUP_WALLET_2_ADDRESS=
`;

    const envPath = './env.production.template';
    fs.writeFileSync(envPath, envTemplate);
    
    console.log(`📝 Environment template created: ${envPath}`);
    console.log('   Copy this to your production server and fill in the values');
  }

  /**
   * Validate wallet security configuration
   */
  static validateSecurityConfig(): void {
    console.log('🔍 Validating Security Configuration...\n');

    const checks = [
      {
        name: 'Private key not in code',
        check: () => !process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_private_key_here',
        message: 'Private key found in environment - ensure it\'s not in code!'
      },
      {
        name: 'Master password set',
        check: () => !!process.env.WALLET_MASTER_PASSWORD,
        message: 'Master password should be set for encrypted storage'
      },
      {
        name: 'Key rotation enabled',
        check: () => process.env.ENABLE_KEY_ROTATION === 'true',
        message: 'Key rotation should be enabled for security'
      },
      {
        name: 'Monitoring enabled',
        check: () => process.env.ENABLE_WALLET_MONITORING === 'true',
        message: 'Wallet monitoring should be enabled'
      }
    ];

    let allPassed = true;
    
    checks.forEach(({ name, check, message }) => {
      const passed = check();
      console.log(`${passed ? '✅' : '❌'} ${name}`);
      if (!passed) {
        console.log(`   ${message}`);
        allPassed = false;
      }
    });

    console.log(`\n${allPassed ? '✅' : '❌'} Security validation ${allPassed ? 'passed' : 'failed'}`);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';

  switch (command) {
    case 'generate':
      const count = parseInt(args[1]) || 1;
      const outputFormat = args[2] as 'console' | 'encrypted-file' | 'both' || 'console';
      const masterPassword = args[3];
      
      SecureWalletGenerator.generateWallets({
        count,
        outputFormat,
        masterPassword
      });
      break;

    case 'template':
      const address = args[1] || 'YOUR_WALLET_ADDRESS_HERE';
      SecureWalletGenerator.createEnvTemplate(address);
      break;

    case 'validate':
      SecureWalletGenerator.validateSecurityConfig();
      break;

    default:
      console.log('Usage:');
      console.log('  generate [count] [format] [password] - Generate secure wallets');
      console.log('  template [address]                   - Create environment template');
      console.log('  validate                             - Validate security configuration');
  }
}

export { SecureWalletGenerator };