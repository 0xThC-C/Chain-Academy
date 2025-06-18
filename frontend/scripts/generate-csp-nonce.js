#!/usr/bin/env node

/**
 * CSP Nonce Generator for Chain Academy V2
 * Generates secure nonces for Content Security Policy
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateCSPNonce() {
  const nonce = crypto.randomBytes(16).toString('base64');
  return nonce;
}

function updateIndexHtml(nonce) {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found');
    return false;
  }

  try {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace nonce placeholder in production CSP
    content = content.replace(/NONCE_PLACEHOLDER/g, nonce);
    
    // Enable production CSP by uncommenting it
    content = content.replace(/<!--\s*<meta http-equiv="Content-Security-Policy" content="/g, '<meta http-equiv="Content-Security-Policy" content="');
    content = content.replace(/"\s*\/>\s*-->/g, '" />');
    
    // Disable development CSP
    content = content.replace(/<meta http-equiv="Content-Security-Policy" content="\s*default-src 'self';[\s\S]*?upgrade-insecure-requests;\s*" \/>/g, 
      '<!-- Development CSP disabled for production -->'
    );

    fs.writeFileSync(indexPath, content);
    console.log('✅ index.html updated with production CSP and nonce:', nonce);
    return true;
  } catch (error) {
    console.error('❌ Error updating index.html:', error.message);
    return false;
  }
}

function updateEnvFile(nonce) {
  const envPath = path.join(__dirname, '..', '.env.production');
  
  try {
    let content = '';
    
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add CSP_NONCE
    if (content.includes('CSP_NONCE=')) {
      content = content.replace(/CSP_NONCE=.*$/m, `CSP_NONCE=${nonce}`);
    } else {
      content += `\nCSP_NONCE=${nonce}\n`;
    }
    
    fs.writeFileSync(envPath, content);
    console.log('✅ .env.production updated with CSP nonce');
    return true;
  } catch (error) {
    console.error('❌ Error updating .env.production:', error.message);
    return false;
  }
}

function main() {
  console.log('🔒 Generating CSP Nonce for Production Build...');
  
  const nonce = generateCSPNonce();
  console.log('🎲 Generated nonce:', nonce);
  
  const htmlUpdated = updateIndexHtml(nonce);
  const envUpdated = updateEnvFile(nonce);
  
  if (htmlUpdated && envUpdated) {
    console.log('✅ CSP nonce generation completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Set CSP_NONCE environment variable to:', nonce);
    console.log('   2. Run production build');
    console.log('   3. Configure server to use the same nonce for inline scripts');
    process.exit(0);
  } else {
    console.log('❌ CSP nonce generation failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateCSPNonce,
  updateIndexHtml,
  updateEnvFile,
};