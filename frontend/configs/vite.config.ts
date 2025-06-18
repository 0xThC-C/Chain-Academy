import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: isDevelopment,
        
        // JSX runtime configuration
        jsxRuntime: 'automatic',
        
        // Babel configuration for development
        babel: {
          plugins: isDevelopment ? ['react-refresh/babel'] : [],
        },
      }),
      
      // Bundle analyzer (only in build mode when ANALYZE=true)
      ...(isProduction && env.ANALYZE
        ? [
            visualizer({
              filename: 'dist/stats.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    
    // Development server configuration
    server: {
      port: 5173,
      host: true, // Allow external connections
      open: true, // Open browser on start
      cors: true,
      
      // Proxy configuration for API calls
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
      
      // HMR configuration
      hmr: {
        overlay: true,
      },
    },
    
    // Preview server configuration (for production builds)
    preview: {
      port: 4173,
      host: true,
      open: true,
    },
    
    // Build configuration
    build: {
      target: 'esnext',
      outDir: 'dist',
      assetsDir: 'assets',
      
      // Source maps
      sourcemap: !isProduction,
      
      // Minification
      minify: isProduction ? 'esbuild' : false,
      
      // Asset inline threshold (4kb)
      assetsInlineLimit: 4096,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Rollup options
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vendor chunks
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            web3: ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
            ui: ['@headlessui/react', '@heroicons/react'],
            utils: ['clsx', 'tailwind-merge'],
          },
          
          // Naming patterns
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const extType = info[info.length - 1];
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(extType)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[ext]/[name]-[hash][extname]`;
          },
        },
        
        // External dependencies (if needed)
        external: [],
      },
      
      // Bundle size warnings
      chunkSizeWarningLimit: 1000,
    },
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
        '@types': resolve(__dirname, './src/types'),
        '@constants': resolve(__dirname, './src/constants'),
        '@assets': resolve(__dirname, './src/assets'),
        '@styles': resolve(__dirname, './src/styles'),
        '@contracts': resolve(__dirname, './contracts'),
        '@test': resolve(__dirname, './src/test'),
      },
    },
    
    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
      
      // PostCSS configuration (if needed)
      postcss: {
        plugins: [],
      },
    },
    
    // ESBuild configuration
    esbuild: {
      // Remove console and debugger statements in production
      drop: isProduction ? ['console', 'debugger'] : [],
      
      // JSX configuration
      jsx: 'automatic',
      jsxDev: isDevelopment,
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDevelopment,
      __PROD__: isProduction,
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'wagmi',
        'viem',
        '@rainbow-me/rainbowkit',
        '@headlessui/react',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        'clsx',
        'tailwind-merge',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    
    // Worker configuration
    worker: {
      format: 'es',
    },
    
    // JSON configuration
    json: {
      namedExports: true,
      stringify: false,
    },
    
    // Log level
    logLevel: isDevelopment ? 'info' : 'warn',
    
    // Clear screen during dev
    clearScreen: false,
  };
});