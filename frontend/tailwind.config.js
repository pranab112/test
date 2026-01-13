/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Green Palace - Emerald color palette (clean, premium)
        'palace': {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',  // Primary emerald
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
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
          700: '#0d0d0d',
          800: '#0a0a0a',
          900: '#050505',
        },
        // Emerald accent colors
        'emerald': {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Legacy colors - Green Palace theme (Emerald)
        'primary-green': '#10B981',
        'secondary-green': '#059669',
        'accent-green': '#34D399',
        'neon-green': '#10B981',
        'neon-red': '#FF073A',
        'neon-blue': '#0DCDFF',
        'bg-dark': '#0a0a0a',
        'bg-darker': '#050505',
        'card-dark': '#111111',
        // Network node colors
        'node-primary': '#10B981',
        'node-secondary': '#059669',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'green-lg': '0 0 30px rgba(16, 185, 129, 0.4)',
        'green-xl': '0 0 40px rgba(16, 185, 129, 0.5)',
        'neon': '0 0 10px rgba(16, 185, 129, 0.6)',
        'neon-lg': '0 0 20px rgba(16, 185, 129, 0.7)',
        'node': '0 0 15px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)',
        'emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      backgroundImage: {
        'green-gradient': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'green-radial': 'radial-gradient(circle, #10B981 0%, #047857 100%)',
        'dark-gradient': 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
        'network-gradient': 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
        'palace-gradient': 'linear-gradient(135deg, #0d0d0d 0%, #111827 50%, #0d0d0d 100%)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'node-pulse': 'nodePulse 2s ease-in-out infinite',
        'network-flow': 'networkFlow 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)' },
        },
        nodePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        networkFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
