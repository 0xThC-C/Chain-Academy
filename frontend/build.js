#!/usr/bin/env node

/**
 * Simple Build Script for Vercel
 * Uses Vite build directly (works locally)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Chain Academy V2 build...');

try {
  // Use Vite build directly
  console.log('🔧 Building with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('✅ Build successful with Vite!');
  
  // Verify dist directory exists
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ Output directory confirmed: dist/');
  } else {
    throw new Error('❌ dist/ directory not found after build');
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  
  // Fallback to React Scripts
  try {
    console.log('\n🔧 Trying React Scripts fallback...');
    execSync('npx react-scripts build', { stdio: 'inherit' });
    
    // Rename build to dist
    const buildPath = path.join(__dirname, 'build');
    const distPath = path.join(__dirname, 'dist');
    
    if (fs.existsSync(buildPath)) {
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true });
      }
      fs.renameSync(buildPath, distPath);
      console.log('✅ React Scripts build successful!');
      process.exit(0);
    }
  } catch (fallbackError) {
    console.error('❌ All build methods failed!');
    process.exit(1);
  }
}