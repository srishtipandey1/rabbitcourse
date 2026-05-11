/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        canvas: '#faf9f6',
        warm: {
          50:  '#fdf8f0',
          100: '#f5e6cc',
          200: '#eacea0',
          300: '#d9a96a',
          400: '#c47e35',
          500: '#a66220',
          600: '#834c18',
          700: '#5e3611',
          800: '#3d220a',
          900: '#1e1005',
        },
        sage: {
          50:  '#f2f5f2',
          100: '#d8e4d8',
          200: '#b6ccb6',
          300: '#88aa88',
          400: '#5c865c',
          500: '#3d6b3d',
          600: '#2d522d',
          700: '#1f3b1f',
          800: '#122412',
          900: '#080f08',
        },
      },
    },
  },
  plugins: [],
}
