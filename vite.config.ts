import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig((): UserConfig => {
  const config: UserConfig = {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('react-router') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('@capacitor-community/admob') || id.includes('@revenuecat')) return 'vendor-monetization';
              if (id.includes('@sentry')) return 'vendor-sentry';
              return 'vendor';
            }
            // Split large data files into their own chunks
            if (id.includes('src/data/')) {
              if (id.includes('tarotDeck')) return 'data-tarot';
              if (id.includes('horoscopes')) return 'data-horoscopes';
              if (id.includes('planetInSign') || id.includes('planetInHouse') || id.includes('aspects') || id.includes('transits')) return 'data-astrology';
              if (id.includes('Quiz') || id.includes('quiz') || id.includes('mbtiCognitive') || id.includes('zodiacContent')) return 'data-quizzes';
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    preview: {
      port: 4173,
      strictPort: false,
    },
  };

  return config;
});
