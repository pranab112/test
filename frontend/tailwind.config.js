/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gold color palette
        'gold': {
          50: '#FFFDF7',
          100: '#FFF9E6',
          200: '#FFF0C2',
          300: '#FFE89D',
          400: '#FFE079',
          500: '#FFD700',  // Primary gold
          600: '#F0C800',
          700: '#D4AF37',  // Darker gold
          800: '#B8960C',
          900: '#8B7500',
        },
        // Dark color palette
        'dark': {
          50: '#D1D5DB',
          100: '#9CA3AF',
          200: '#6B7280',
          300: '#4B5563',
          400: '#374151',
          500: '#1F2937',
          600: '#111827',
          700: '#0a0a0a',
          800: '#050505',
          900: '#000000',
        },
        // Legacy colors
        'primary-gold': '#FFD700',
        'secondary-gold': '#FFA500',
        'neon-red': '#FF073A',
        'neon-blue': '#0DCDFF',
        'neon-green': '#39FF14',
        'casino-red': '#CC0000',
        'casino-green': '#00AA00',
        'bg-dark': '#0a0a0a',
        'bg-darker': '#000000',
        'card-dark': '#1a1a1a',
        'border-gold': '#FFD70030',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'gold-lg': '0 0 30px rgba(255, 215, 0, 0.4)',
        'gold-xl': '0 0 40px rgba(255, 215, 0, 0.5)',
        'neon': '0 0 10px rgba(57, 255, 20, 0.5)',
        'neon-lg': '0 0 20px rgba(57, 255, 20, 0.6)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'gold-radial': 'radial-gradient(circle, #FFD700 0%, #FFA500 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
