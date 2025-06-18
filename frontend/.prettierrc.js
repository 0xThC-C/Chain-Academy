/** @type {import("prettier").Config} */
export default {
  // Basic formatting
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // JSX specific
  jsxSingleQuote: false,
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // Trailing commas
  trailingComma: 'es5',
  
  // Line endings
  endOfLine: 'auto',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // HTML whitespace handling
  htmlWhitespaceSensitivity: 'css',
  
  // Prose wrapping
  proseWrap: 'preserve',
  
  // Vue files
  vueIndentScriptAndStyle: false,
  
  // Plugin-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{css,scss,less}',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        singleQuote: false,
      },
    },
  ],
};