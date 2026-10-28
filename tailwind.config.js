/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand colour (deep indigo)
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Accent colour (warm amber) used for primary calls to action
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Deep navy for text and dark surfaces
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d5d9e8',
          300: '#aab1cc',
          400: '#7d86a8',
          500: '#5b6486',
          600: '#444c6b',
          700: '#323954',
          800: '#1f2540',
          900: '#12162b',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'ui-rounded',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 22, 43, 0.06), 0 8px 24px -12px rgba(18, 22, 43, 0.18)',
        lift: '0 2px 4px rgba(18, 22, 43, 0.06), 0 18px 36px -16px rgba(67, 56, 202, 0.35)',
      },
    },
  },
  plugins: [],
};
