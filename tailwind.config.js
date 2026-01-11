/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mystic: {
          950: '#080812',
          900: '#0d0d1a',
          850: '#131320',
          800: '#1a1a2e',
          700: '#252542',
          600: '#353556',
          500: '#484870',
          400: '#6b6b8a',
          300: '#9494ab',
          200: '#bdbdcc',
          100: '#e6e6ed',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f4d668',
          dark: '#b8960f',
          glow: 'rgba(212, 175, 55, 0.3)',
        },
        coral: {
          DEFAULT: '#e07a5f',
          light: '#f4a390',
          dark: '#c55a3f',
        },
        teal: {
          DEFAULT: '#4ecdc4',
          light: '#7ee8e1',
          dark: '#2ab3aa',
        },
        cosmic: {
          blue: '#4a7eb8',
          rose: '#d4848c',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'constellation': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(212, 175, 55, 0.15)',
        'glow-md': '0 0 30px rgba(212, 175, 55, 0.2), 0 0 60px rgba(212, 175, 55, 0.1)',
        'glow-lg': '0 0 40px rgba(212, 175, 55, 0.25), 0 0 80px rgba(212, 175, 55, 0.15)',
        'glow-coral': '0 0 20px rgba(224, 122, 95, 0.2)',
        'glow-teal': '0 0 20px rgba(78, 205, 196, 0.2)',
        'inner-glow': 'inset 0 0 20px rgba(212, 175, 55, 0.1)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(212, 175, 55, 0.08)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 60px rgba(212, 175, 55, 0.12)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-gentle': 'floatGentle 4s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'tarot-reveal': 'tarotReveal 0.8s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'confetti': 'confetti 3s ease-out forwards',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        tarotReveal: {
          '0%': { transform: 'rotateY(0deg) scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'rotateY(90deg) scale(1)' },
          '100%': { transform: 'rotateY(0deg) scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(212, 175, 55, 0.25), 0 0 60px rgba(212, 175, 55, 0.1)' },
        },
      },
    },
  },
  plugins: [],
};
