import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// import { visualizer } from 'rollup-plugin-visualizer';
import crypto from 'crypto';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  // Generate CSP nonce for production builds
  const cspNonce = isProduction ? crypto.randomBytes(16).toString('base64') : null;
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh (handled automatically in newer versions)
        
        // JSX runtime configuration
        jsxRuntime: 'automatic',
        
        // Babel configuration for development
        babel: {
          plugins: isDevelopment ? ['react-refresh/babel'] : [],
        },
      }),
      
      // Bundle analyzer (only in build mode when ANALYZE=true)
      // Note: visualizer plugin commented out - install rollup-plugin-visualizer if needed
      ...(isProduction && env.ANALYZE
        ? [
            // visualizer({
            //   filename: 'dist/stats.html',
            //   open: true,
            //   gzipSize: true,
            //   brotliSize: true,
            // }),
          ]
        : []),
    ],
    
    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      host: isDevelopment ? 'localhost' : false, // Restrict external connections in production
      open: isDevelopment, // Only auto-open in development
      cors: isDevelopment ? true : {
        origin: env.VITE_ALLOWED_ORIGINS?.split(',') || ['https://localhost:5173'],
        credentials: true,
      },
      
      // Security headers for development server
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        ...(isProduction && {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${cspNonce}'; style-src 'self' 'nonce-${cspNonce}' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: wss: https://api.web3modal.com https://rpc.walletconnect.com https://relay.walletconnect.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`,
        }),
      },
      
      // Proxy configuration for API calls
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: isProduction,
          ws: true, // Enable WebSocket proxying
          configure: (proxy) => {
            // Add security headers to proxied requests
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Forwarded-Proto', 'https');
            });
          },
        },
      },
      
      // HMR configuration
      hmr: {
        overlay: isDevelopment,
        port: parseInt(env.VITE_HMR_PORT) || 24678,
      },
      
      // HTTPS configuration for production-like development
      https: env.VITE_HTTPS === 'true' && env.VITE_SSL_KEY && env.VITE_SSL_CERT ? {
        key: env.VITE_SSL_KEY,
        cert: env.VITE_SSL_CERT,
      } : undefined,
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
      
      // Source maps - disabled in production for security
      sourcemap: isDevelopment ? 'inline' : false,
      
      // Minification
      minify: isProduction ? 'esbuild' : false,
      
      // Asset inline threshold (4kb)
      assetsInlineLimit: 4096,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Rollup options
      rollupOptions: {
        // input defaults to index.html in root directory
        
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vendor chunks
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            web3: ['wagmi', 'viem', '@web3modal/wagmi'],
            ui: ['@heroicons/react'],
            utils: ['dompurify'],
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
        '@contexts': resolve(__dirname, './src/contexts'),
        '@contracts': resolve(__dirname, './src/contracts'),
        '@config': resolve(__dirname, './src/config'),
        '@styles': resolve(__dirname, './src/styles'),
      },
    },
    
    // CSS configuration
    css: {
      modules: {
        localsConvention: 'camelCase',
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
      __CSP_NONCE__: cspNonce ? JSON.stringify(cspNonce) : 'null',
      
      // Security-focused environment validation
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'Chain Academy V2'),
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'wagmi',
        'viem',
        '@web3modal/wagmi',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        'dompurify',
        'ethers',
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