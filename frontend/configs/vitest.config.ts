import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test settings
    globals: true,
    
    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'test/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'test/e2e/**',
      'test/foundry/**',
      'contracts/**',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'dist/**',
        'public/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/index.html',
    },
    
    // Browser testing for integration tests
    browser: {
      enabled: false, // Enable when needed for browser-specific tests
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          headless: true,
        },
      ],
    },
    
    // Workspace configuration for different test types
    workspace: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.unit.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'components',
          include: ['src/components/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'hooks',
          include: ['src/hooks/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        test: {
          name: 'utils',
          include: ['src/utils/**/*.{test,spec}.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Watch configuration
    watch: true,
    
    // Performance settings
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true,
      },
    },
    
    // Retry configuration
    retry: 1,
    
    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.test.${snapExtension}.$1`);
    },
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@constants': resolve(__dirname, './src/constants'),
      '@contracts': resolve(__dirname, './contracts'),
      '@test': resolve(__dirname, './src/test'),
    },
  },
  
  // Define global variables for tests
  define: {
    __TEST__: true,
    __DEV__: false,
  },
});