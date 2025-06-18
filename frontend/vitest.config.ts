import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Setup files
    setupFiles: ['./src/setupTests.ts'],
    
    // Include patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'build',
      'coverage',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/reportWebVitals.ts',
        'src/react-app-env.d.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // Watch options
    watch: true,
    
    // Reporters
    reporters: ['verbose', 'json', 'html'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Retry failed tests
    retry: 1,
    
    // Pool options
    pool: 'threads',
    
    // UI configuration
    ui: true,
    
    // API configuration
    api: {
      port: 51204,
    },
    
    // Mock options
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Environment options
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@contracts': resolve(__dirname, './src/contracts'),
      '@config': resolve(__dirname, './src/config'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
});