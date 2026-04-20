import { defineConfig, type Plugin, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Emits dist/version.json at build time. Served with no-store via netlify.toml.
function versionJsonPlugin(): Plugin {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  return {
    name: 'emit-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          sha: process.env.VITE_BUILD_SHA ?? 'local',
          builtAt: new Date().toISOString(),
          version: pkg.version,
        }),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig((): UserConfig => {
  const config: UserConfig = {
    plugins: [react(), versionJsonPlugin()],
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
              // React core must include `react` itself, not just react-dom /
              // react-router. Splitting react into a different chunk causes
              // hook references (useRef, useState, …) to resolve as undefined
              // when the vendor chunk loads after vendor-react.
              if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler)[/\\]/.test(id)) {
                return 'vendor-react';
              }
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
