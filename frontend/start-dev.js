const { spawn } = require('child_process');
const path = require('path');

console.log('[Chain Academy V2] Starting development server...');

const env = {
  ...process.env,
  SKIP_PREFLIGHT_CHECK: 'true',
  PORT: '3000',
  HOST: '127.0.0.1',
  GENERATE_SOURCEMAP: 'false',
  DISABLE_ESLINT_PLUGIN: 'true'
};

const child = spawn('npx', ['react-scripts', 'start'], {
  cwd: __dirname,
  env,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});