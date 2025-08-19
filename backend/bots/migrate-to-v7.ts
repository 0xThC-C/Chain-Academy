#!/usr/bin/env ts-node

/**
 * Migration Script: V4 to V7 Bot Update
 * 
 * This script helps migrate from the old V4 bot implementation to the new V7 compatible bot
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface MigrationConfig {
  // Old V4 contract addresses
  v4Contracts: {
    [chainId: number]: string;
  };
  // New V7 contract addresses
  v7Contracts: {
    [chainId: number]: string;
  };
  // Backup directory
  backupDir: string;
  // Configuration files to update
  configFiles: string[];
}

const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  v4Contracts: {
    8453: process.env.BASE_PROGRESSIVE_ESCROW_V4 || '',
    10: process.env.OPTIMISM_PROGRESSIVE_ESCROW_V4 || '',
    42161: process.env.ARBITRUM_PROGRESSIVE_ESCROW_V4 || '',
    137: process.env.POLYGON_PROGRESSIVE_ESCROW_V4 || ''
  },
  v7Contracts: {
    8453: process.env.BASE_PROGRESSIVE_ESCROW_V7 || '',
    10: process.env.OPTIMISM_PROGRESSIVE_ESCROW_V7 || '',
    42161: process.env.ARBITRUM_PROGRESSIVE_ESCROW_V7 || '',
    137: process.env.POLYGON_PROGRESSIVE_ESCROW_V7 || ''
  },
  backupDir: './backup-v4-migration',
  configFiles: [
    './MainnetBotConfig.ts',
    '../.env',
    './data/session-tracker.json'
  ]
};

class V4ToV7Migration {
  private config: MigrationConfig;

  constructor(config: MigrationConfig = DEFAULT_MIGRATION_CONFIG) {
    this.config = config;
  }

  /**
   * Run the complete migration process
   */
  async migrate(): Promise<void> {
    console.log('🔄 Starting V4 to V7 Bot Migration');
    console.log('=====================================\n');

    try {
      // Step 1: Validation
      await this.validatePreMigration();
      
      // Step 2: Backup
      await this.createBackup();
      
      // Step 3: Update configurations
      await this.updateConfigurations();
      
      // Step 4: Initialize V7 components
      await this.initializeV7Components();
      
      // Step 5: Verify migration
      await this.verifyMigration();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update your environment variables with V7 contract addresses');
      console.log('2. Test the bot with: npm run test:v7');
      console.log('3. Deploy the updated bot configuration');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      console.log('\nRollback instructions:');
      console.log('1. Restore files from backup directory:', this.config.backupDir);
      console.log('2. Check your environment variables');
      throw error;
    }
  }

  /**
   * Validate environment and prerequisites before migration
   */
  private async validatePreMigration(): Promise<void> {
    console.log('1️⃣ Validating pre-migration conditions...');

    // Check for required V7 contract addresses
    const missingV7Contracts: string[] = [];
    
    Object.entries(this.config.v7Contracts).forEach(([chainId, address]) => {
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        missingV7Contracts.push(`Chain ${chainId}`);
      }
    });

    if (missingV7Contracts.length > 0) {
      throw new Error(`Missing V7 contract addresses for: ${missingV7Contracts.join(', ')}`);
    }

    // Check for bot private key
    if (!process.env.BOT_PRIVATE_KEY) {
      throw new Error('BOT_PRIVATE_KEY environment variable is required');
    }

    console.log('✅ Pre-migration validation passed');
  }

  /**
   * Create backup of current configuration
   */
  private async createBackup(): Promise<void> {
    console.log('2️⃣ Creating backup of current configuration...');

    if (!existsSync(this.config.backupDir)) {
      mkdirSync(this.config.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = resolve(this.config.backupDir, `backup-${timestamp}`);
    mkdirSync(backupSubDir, { recursive: true });

    // Backup configuration files
    this.config.configFiles.forEach(filePath => {
      const resolvedPath = resolve(filePath);
      if (existsSync(resolvedPath)) {
        const content = readFileSync(resolvedPath, 'utf8');
        const backupPath = resolve(backupSubDir, filePath.replace(/[/\\]/g, '_'));
        writeFileSync(backupPath, content);
        console.log(`   Backed up: ${filePath} -> ${backupPath}`);
      } else {
        console.log(`   Skipped (not found): ${filePath}`);
      }
    });

    console.log(`✅ Backup created at: ${backupSubDir}`);
  }

  /**
   * Update configuration files for V7 compatibility
   */
  private async updateConfigurations(): Promise<void> {
    console.log('3️⃣ Updating configurations for V7...');

    // Create sample environment file with V7 settings
    const envSample = this.generateV7EnvSample();
    const envSamplePath = resolve('.env.v7-sample');
    writeFileSync(envSamplePath, envSample);
    console.log(`   Created V7 environment sample: ${envSamplePath}`);

    // Create data directory for session tracking
    const dataDir = resolve('./data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`   Created data directory: ${dataDir}`);
    }

    console.log('✅ Configuration updates completed');
  }

  /**
   * Initialize V7 specific components
   */
  private async initializeV7Components(): Promise<void> {
    console.log('4️⃣ Initializing V7 components...');

    // Initialize empty session tracker
    const sessionTrackerPath = resolve('./data/session-tracker.json');
    const initialTracker = {
      sessions: [],
      lastFullScan: 0,
      scanInterval: 6 * 60 * 60 * 1000, // 6 hours
      migratedFrom: 'v4',
      migrationDate: new Date().toISOString()
    };
    
    writeFileSync(sessionTrackerPath, JSON.stringify(initialTracker, null, 2));
    console.log(`   Initialized session tracker: ${sessionTrackerPath}`);

    console.log('✅ V7 components initialized');
  }

  /**
   * Verify migration was successful
   */
  private async verifyMigration(): Promise<void> {
    console.log('5️⃣ Verifying migration...');

    // Check if session tracker was created
    const sessionTrackerPath = resolve('./data/session-tracker.json');
    if (!existsSync(sessionTrackerPath)) {
      throw new Error('Session tracker was not created');
    }

    // Check if V7 sample environment was created
    const envSamplePath = resolve('.env.v7-sample');
    if (!existsSync(envSamplePath)) {
      throw new Error('V7 environment sample was not created');
    }

    console.log('✅ Migration verification passed');
  }

  /**
   * Generate V7 environment sample file
   */
  private generateV7EnvSample(): string {
    return `# Chain Academy V7 Bot Configuration - Migration Generated
# Copy relevant values to your actual .env file

# =============================================================================
# CRITICAL: V7 Contract Addresses (UPDATE THESE)
# =============================================================================
BASE_PROGRESSIVE_ESCROW_V7=${this.config.v7Contracts[8453]}
OPTIMISM_PROGRESSIVE_ESCROW_V7=${this.config.v7Contracts[10]}
ARBITRUM_PROGRESSIVE_ESCROW_V7=${this.config.v7Contracts[42161]}
POLYGON_PROGRESSIVE_ESCROW_V7=${this.config.v7Contracts[137]}

# =============================================================================
# Bot Configuration
# =============================================================================
BOT_PRIVATE_KEY=${process.env.BOT_PRIVATE_KEY || 'your_bot_private_key_here'}
BOT_NAME=ChainAcademy-PaymentBot-V7-Mainnet
BOT_VERSION=2.0.0
BOT_ENABLED=true

# V7 Specific Settings
BOT_V7_SESSION_TRACKING_ENABLED=true
BOT_V7_HEARTBEAT_CHECK_ENABLED=false
BOT_V7_AUTOPAUSE_CHECK_ENABLED=false
BOT_V7_MIN_AUTO_RELEASE_DELAY=24
BOT_V7_SESSION_STORAGE_PATH=./data/session-tracker.json

# Migration Info
MIGRATED_FROM_V4=true
MIGRATION_DATE=${new Date().toISOString()}

# Old V4 Addresses (for reference)
# BASE_PROGRESSIVE_ESCROW_V4=${this.config.v4Contracts[8453]}
# OPTIMISM_PROGRESSIVE_ESCROW_V4=${this.config.v4Contracts[10]}
# ARBITRUM_PROGRESSIVE_ESCROW_V4=${this.config.v4Contracts[42161]}
# POLYGON_PROGRESSIVE_ESCROW_V4=${this.config.v4Contracts[137]}
`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Chain Academy V4 to V7 Bot Migration Tool

Usage:
  npm run migrate:v7              # Run migration with default settings
  npm run migrate:v7 -- --dry-run # Show what would be migrated without making changes
  npm run migrate:v7 -- --help    # Show this help message

Environment Variables Required:
  BOT_PRIVATE_KEY                 # Bot wallet private key
  BASE_PROGRESSIVE_ESCROW_V7      # Base V7 contract address
  OPTIMISM_PROGRESSIVE_ESCROW_V7  # Optimism V7 contract address
  ARBITRUM_PROGRESSIVE_ESCROW_V7  # Arbitrum V7 contract address
  POLYGON_PROGRESSIVE_ESCROW_V7   # Polygon V7 contract address

Optional Environment Variables:
  BASE_PROGRESSIVE_ESCROW_V4      # Base V4 contract (for reference)
  OPTIMISM_PROGRESSIVE_ESCROW_V4  # Optimism V4 contract (for reference)
  ARBITRUM_PROGRESSIVE_ESCROW_V4  # Arbitrum V4 contract (for reference)
  POLYGON_PROGRESSIVE_ESCROW_V4   # Polygon V4 contract (for reference)
`);
    return;
  }

  if (args.includes('--dry-run')) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
    
    console.log('Migration would:');
    console.log('1. Validate V7 contract addresses are set');
    console.log('2. Create backup of current configuration');
    console.log('3. Generate .env.v7-sample file');
    console.log('4. Create data/session-tracker.json');
    console.log('5. Verify all components were created');
    
    return;
  }

  const migration = new V4ToV7Migration();
  await migration.migrate();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { V4ToV7Migration, DEFAULT_MIGRATION_CONFIG };