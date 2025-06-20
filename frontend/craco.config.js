const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Enhanced webpack configuration for stability and performance
      if (env === 'development') {
        // Optimize for development stability
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
          runtimeChunk: false,
          sideEffects: false,
          // Add module concatenation for better performance
          concatenateModules: false,
        };

        // Enhanced file watching for better stability
        webpackConfig.watchOptions = {
          poll: false,
          ignored: /node_modules/,
          aggregateTimeout: 500,
          followSymlinks: false,
        };

        // Source maps configuration for debugging - disabled by default for security
        webpackConfig.devtool = process.env.GENERATE_SOURCEMAP === 'true' ? 'eval-source-map' : false;

        // Enhanced error reporting while maintaining stability
        webpackConfig.stats = {
          all: false,
          errors: true,
          warnings: process.env.NODE_ENV !== 'production',
          moduleTrace: false,
          errorDetails: true,
          builtAt: false,
          timings: false,
        };

        // Enhanced dev-specific configuration

        // Configure experiments for stability
        webpackConfig.experiments = {
          ...webpackConfig.experiments,
          topLevelAwait: false,
          asyncWebAssembly: false,
        };

        // Enhanced caching strategy
        webpackConfig.cache = {
          type: 'filesystem',
          buildDependencies: {
            config: [__filename],
          },
          cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
        };
      } else {
        // Production optimizations
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                enforce: true,
              },
            },
          },
        };
      }

      // Apply path aliases to both dev and prod
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        alias: {
          ...webpackConfig.resolve.alias,
          '@': path.resolve(__dirname, 'src'),
          '@components': path.resolve(__dirname, 'src/components'),
          '@pages': path.resolve(__dirname, 'src/pages'),
          '@hooks': path.resolve(__dirname, 'src/hooks'),
          '@utils': path.resolve(__dirname, 'src/utils'),
          '@types': path.resolve(__dirname, 'src/types'),
          '@contexts': path.resolve(__dirname, 'src/contexts'),
          '@contracts': path.resolve(__dirname, 'src/contracts'),
          '@config': path.resolve(__dirname, 'src/config'),
          '@styles': path.resolve(__dirname, 'src/styles'),
        },
        modules: [
          path.resolve(__dirname, 'src'),
          'node_modules'
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        fallback: {
          ...webpackConfig.resolve.fallback,
          "crypto": false,
          "stream": false,
          "assert": false,
          "http": false,
          "https": false,
          "os": false,
          "url": false,
          "zlib": false,
          "buffer": false,
          "util": false,
        },
      };

      return webpackConfig;
    },
  },
  devServer: (devServerConfig, { env, paths }) => {
    // Clean config for webpack-dev-server v5+ compatibility
    return {
      port: process.env.PORT || 3000,
      host: '127.0.0.1',
      hot: true,
      liveReload: false,
      historyApiFallback: true,
      allowedHosts: 'all',
      compress: true,
      static: {
        directory: paths.appPublic,
        publicPath: ['/'],
        serveIndex: true,
        watch: true,
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: false,
        reconnect: true,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      },
    };
  },
};