/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['"Cinzel"', '"Crimson Pro"', 'serif'],
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.35)' },
        },
        bossShake: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '15%': { transform: 'translate(-14px, -6px) scale(0.96) rotate(-2deg)' },
          '30%': { transform: 'translate(12px, 5px) scale(1.03) rotate(2deg)' },
          '45%': { transform: 'translate(-10px, 4px) scale(0.98) rotate(-1deg)' },
          '60%': { transform: 'translate(8px, -4px) scale(1.01) rotate(1deg)' },
          '75%': { transform: 'translate(-4px, 2px) scale(1)' },
        }
      },
      animation: {
        'float-slow': 'floatSlow 4.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.8s ease-in-out infinite',
        'boss-shake': 'bossShake 0.55s cubic-bezier(.36,.07,.19,.97) both',
      }
    },
  },
  plugins: [],
}
