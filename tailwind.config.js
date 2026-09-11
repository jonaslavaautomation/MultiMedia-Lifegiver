/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep teal-green, matched to the LIFEGIVER wordmark — primary brand accent
        // (buttons, active nav, focus rings). Replaces the old off-brand maroon.
        brand: {
          50: '#eef6f4',
          100: '#d7ece7',
          200: '#b0d9d0',
          300: '#7fbfb0',
          400: '#4f9f8c',
          500: '#2f8271',
          600: '#23695b',
          700: '#1c544a',
          800: '#17443c',
          900: '#143832',
          950: '#0b211d',
        },
        // Leaf green, matched to the logo's leaf mark — secondary accent used
        // sparingly for highlights, glows, and the occasional gradient pairing.
        leaf: {
          50: '#f2f8ea',
          100: '#e2eece',
          200: '#c7dea3',
          300: '#a3c877',
          400: '#82b354',
          500: '#6b9e3f',
          600: '#547d32',
          700: '#43632a',
          800: '#375024',
          900: '#2f4321',
          950: '#17240f',
        },
        // Cyber-broadcast HUD surfaces — scoped to live/broadcast screens
        // (Operator console, Stage Display, Overlay) rather than the main
        // admin UI, which keeps the brand/leaf palette above.
        hud: {
          bg: '#0B0F17',
          panel: '#0E1420',
          border: '#1E2A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hud-grid':
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      backgroundSize: {
        'hud-grid': '32px 32px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.55)' },
          '50%': { opacity: '0.75', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
        },
        'pulse-glow-red': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.55)' },
          '50%': { opacity: '0.75', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-red': 'pulse-glow-red 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
