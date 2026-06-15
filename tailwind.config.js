/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#F2ECE0',
        ink: '#2A251D',
        muted: '#9A8F7E',
        area: {
          body: { from: '#FFD6A5', to: '#FF9E7D' },
          mind: { from: '#C3F0CA', to: '#7DD8A4' },
          work: { from: '#FFE8A3', to: '#FCB454' },
          people: { from: '#FFC9D6', to: '#FF8FA8' },
          inner: { from: '#D6C9FF', to: '#A88FE8' },
        }
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fillUp: {
          '0%': { height: '0%' },
          '100%': { height: '100%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        }
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        popIn: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        fillUp: 'fillUp linear forwards',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
