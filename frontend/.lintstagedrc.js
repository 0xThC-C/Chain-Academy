export default {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    'git add',
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
    'git add',
  ],
  
  // CSS and styling files
  '*.{css,scss,less}': [
    'prettier --write',
    'git add',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'git add',
  ],
  
  // Package.json specifically
  'package.json': [
    'prettier --write',
    'git add',
  ],
  
  // TypeScript type checking for staged files
  '*.{ts,tsx}': () => 'tsc --noEmit',
};