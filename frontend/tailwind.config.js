/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Chain Academy Brand Colors
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Main red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          red: '#dc2626', // Alias for bg-primary-red
        },
        // Enhanced neutral palette
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
          1000: '#000000',
        },
        // Status colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"Menlo"',
          '"Monaco"',
          '"Consolas"',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-lg': '0 0 30px rgba(239, 68, 68, 0.4)',
      },
      // Component-specific utilities
      screens: {
        'xs': '475px',
        '3xl': '1680px',
        '4xl': '2560px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    // Custom plugin for component classes
    function({ addComponents, theme }) {
      addComponents({
        // Button component classes
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '500',
          borderRadius: '0.5rem',
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme('colors.primary.500')}`,
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          },
        },
        '.btn-primary': {
          backgroundColor: theme('colors.primary.600'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.primary.700'),
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.neutral.100'),
          color: theme('colors.neutral.900'),
          border: `1px solid ${theme('colors.neutral.300')}`,
          '&:hover': {
            backgroundColor: theme('colors.neutral.200'),
          },
          '.dark &': {
            backgroundColor: theme('colors.neutral.800'),
            color: theme('colors.neutral.100'),
            borderColor: theme('colors.neutral.600'),
            '&:hover': {
              backgroundColor: theme('colors.neutral.700'),
            },
          },
        },
        
        // Card component classes
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: '0.75rem',
          boxShadow: theme('boxShadow.soft'),
          border: `1px solid ${theme('colors.neutral.200')}`,
          '.dark &': {
            backgroundColor: theme('colors.neutral.900'),
            borderColor: theme('colors.neutral.800'),
          },
        },
        
        // Input component classes
        '.input': {
          display: 'block',
          width: '100%',
          borderRadius: '0.5rem',
          border: `1px solid ${theme('colors.neutral.300')}`,
          backgroundColor: theme('colors.white'),
          padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
          fontSize: theme('fontSize.sm'),
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.primary.500'),
            boxShadow: `0 0 0 1px ${theme('colors.primary.500')}`,
          },
          '.dark &': {
            backgroundColor: theme('colors.neutral.800'),
            borderColor: theme('colors.neutral.600'),
            color: theme('colors.white'),
          },
        },
        
        // Loading states
        '.loading': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '1rem',
            height: '1rem',
            marginTop: '-0.5rem',
            marginLeft: '-0.5rem',
            border: `2px solid ${theme('colors.neutral.300')}`,
            borderTopColor: theme('colors.primary.500'),
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          },
        },
      });
    },
  ],
}