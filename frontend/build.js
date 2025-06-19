#!/usr/bin/env node

/**
 * Custom Build Script for Vercel
 * Bypasses all the dependency issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting custom build process...');

// Check which builder is available and use it
const builders = [
  {
    name: 'Vite',
    command: 'npx vite build',
    check: () => {
      try {
        // Check if vite is in package.json
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const hasVite = packageJson.dependencies?.vite || packageJson.devDependencies?.vite;
        
        if (!hasVite) {
          console.log('❌ Vite not found in dependencies');
          return false;
        }
        
        // Fix index.html for Vite
        const indexPath = path.join(__dirname, 'index.html');
        if (!fs.existsSync(indexPath)) {
          const publicIndex = path.join(__dirname, 'public', 'index.html');
          if (fs.existsSync(publicIndex)) {
            let content = fs.readFileSync(publicIndex, 'utf8');
            // Add script tag for Vite
            content = content.replace(
              '</body>',
              '    <script type="module" src="/src/index.tsx"></script>\n  </body>'
            );
            fs.writeFileSync(indexPath, content);
            console.log('✅ Created index.html for Vite');
          }
        }
        return true;
      } catch (e) {
        console.log('❌ Vite check failed:', e.message);
        return false;
      }
    }
  },
  {
    name: 'React Scripts',
    command: 'npx react-scripts build',
    check: () => {
      try {
        // Check if react-scripts is in package.json
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        const hasReactScripts = packageJson.dependencies?.['react-scripts'] || packageJson.devDependencies?.['react-scripts'];
        
        if (!hasReactScripts) {
          console.log('❌ React Scripts not found in dependencies');
          return false;
        }
        
        // Remove index.html from root for react-scripts
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          fs.unlinkSync(indexPath);
          console.log('✅ Removed root index.html for react-scripts');
        }
        return true;
      } catch (e) {
        console.log('❌ React Scripts check failed:', e.message);
        return false;
      }
    }
  }
];

// Try each builder
for (const builder of builders) {
  console.log(`\n🔧 Trying ${builder.name}...`);
  
  if (builder.check()) {
    try {
      execSync(builder.command, { stdio: 'inherit' });
      console.log(`\n✅ Build successful with ${builder.name}!`);
      
      // Rename build to dist if needed
      const buildPath = path.join(__dirname, 'build');
      const distPath = path.join(__dirname, 'dist');
      
      if (fs.existsSync(buildPath) && !fs.existsSync(distPath)) {
        fs.renameSync(buildPath, distPath);
        console.log('✅ Renamed build/ to dist/');
      }
      
      process.exit(0);
    } catch (error) {
      console.log(`❌ ${builder.name} failed, trying next...`);
    }
  }
}

console.error('\n❌ All build methods failed!');
process.exit(1);