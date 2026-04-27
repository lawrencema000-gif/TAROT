import { defineConfig, type Plugin, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
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

// Sentry source-map upload plugin — only active when all three env vars are
// present (auth token + org + project). Locally and in CI without secrets,
// the plugin returns no-op so builds don't fail. The auth token is created
// from Sentry → Settings → Account → Auth Tokens with `project:releases`
// + `org:read` scopes.
function sentrySourceMaps(): Plugin | null {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  if (!token || !org || !project) return null;
  return sentryVitePlugin({
    org,
    project,
    authToken: token,
    release: { name: process.env.VITE_BUILD_SHA ?? undefined },
    sourcemaps: { assets: 'dist/**', filesToDeleteAfterUpload: 'dist/**/*.map' },
    silent: false,
  }) as unknown as Plugin;
}

// https://vitejs.dev/config/
export default defineConfig((): UserConfig => {
  const sentryPlugin = sentrySourceMaps();
  const config: UserConfig = {
    plugins: [react(), versionJsonPlugin(), ...(sentryPlugin ? [sentryPlugin] : [])],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: [
        // Shared zod schemas under supabase/functions/_schema/ use Deno's
        // `npm:zod@x.y.z` specifier so Supabase's edge-function bundler
        // resolves them correctly. For the client (Vite), we alias the
        // specifier to the package installed in node_modules.
        { find: /^npm:zod@[^/]+$/, replacement: 'zod' },
      ],
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      // Generate source maps for Sentry uploading. After upload, the .map
      // files are deleted from dist/ by sentryVitePlugin so they're never
      // shipped to clients. Browsers + Sentry use the SHAs to fetch them
      // from Sentry's servers when symbolicating stack traces.
      sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
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
              // LiveKit voice SDK — large (~360 KB), only used inside the
              // lazy-imported voice hook. Keep it in its own chunk so the
              // main bundle doesn't pay for users who never join voice.
              if (id.includes('livekit-client')) return 'vendor-livekit';
              if (id.includes('three')) return 'vendor-three';
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
