/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9cfd6',
          300: '#f3a5b3',
          400: '#ea7088',
          500: '#dc4262',
          600: '#c52d4e',
          700: '#a31f3e',
          800: '#881e3a',
          900: '#711d36',
          950: '#3d0d1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
