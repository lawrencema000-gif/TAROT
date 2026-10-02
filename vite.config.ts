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

// A lazily imported locale bundle: src/i18n/locales/<lng>/<ns>.json. The
// three non-English locales are dynamic imports in src/i18n/config.ts, so
// each file is its own chunk; this names them legibly (assets/i18n-ja-app-
// <hash>.js) and lets the preload plugin below find them in the bundle.
// The learn-library overlays (learn-astrology.json …, src/i18n/learnOverlay.ts)
// match too and are named the same way, but see ON_DEMAND_BUNDLE_RE: they are
// fetched by the learn pages, not at boot.
const LOCALE_BUNDLE_RE = /[/\\]src[/\\]i18n[/\\]locales[/\\]([a-z]+)[/\\]([a-z-]+)\.json$/;

// Namespaces a route loads on demand. They must NOT be modulepreloaded with
// the UI bundles: the four learn overlays are 25–60 KB gz each per locale,
// and only a visitor who opens /astrology, /numerology, /glossary or
// /crystals in that language should download the one that page reads.
const ON_DEMAND_BUNDLE_RE = /^learn-/;

// Starts the locale chunks downloading before the main bundle has parsed.
//
// A ja/ko/zh visitor's first paint waits for that locale's five bundles,
// which config.ts only requests once the main chunk has executed — one
// extra round trip on top of the entry. This inlines a tiny script into
// index.html at build time that reads the same signals the language
// detector does (`?lang`, then localStorage 'arcana_locale' — keep in step
// with `detection` in src/i18n/config.ts) and adds a <link rel=modulepreload>
// for each of that locale's hashed chunks, so they load in parallel with the
// entry. English has no lazy bundles and the script is a no-op for it; an
// unsupported value is ignored. The prerender step reuses dist/index.html as
// the template for every route, so every entry point carries it.
function localePreloadPlugin(): Plugin {
  let base = '/';
  return {
    name: 'arcana-locale-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const byLocale: Record<string, string[]> = {};
        for (const [fileName, output] of Object.entries(ctx.bundle)) {
          if (output.type !== 'chunk' || !output.facadeModuleId) continue;
          const m = LOCALE_BUNDLE_RE.exec(output.facadeModuleId);
          if (!m || m[1] === 'en' || ON_DEMAND_BUNDLE_RE.test(m[2])) continue;
          (byLocale[m[1]] ??= []).push(`${base}${fileName}`);
        }
        if (Object.keys(byLocale).length === 0) return;
        for (const list of Object.values(byLocale)) list.sort();
        const script =
          `(function(){try{var m=${JSON.stringify(byLocale)};` +
          `var q=new URLSearchParams(location.search).get('lang');var s=null;` +
          `try{s=localStorage.getItem('arcana_locale')}catch(e){}` +
          `var l=String(q||s||'').toLowerCase().split('-')[0];var f=m[l];if(!f)return;` +
          `for(var i=0;i<f.length;i++){var e=document.createElement('link');e.rel='modulepreload';` +
          `e.setAttribute('crossorigin','');e.href=f[i];document.head.appendChild(e)}}catch(e){}})();`;
        return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig((): UserConfig => {
  const sentryPlugin = sentrySourceMaps();
  const config: UserConfig = {
    plugins: [react(), versionJsonPlugin(), localePreloadPlugin(), ...(sentryPlugin ? [sentryPlugin] : [])],
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
          chunkFileNames(chunk) {
            const m = chunk.facadeModuleId ? LOCALE_BUNDLE_RE.exec(chunk.facadeModuleId) : null;
            return m ? `assets/i18n-${m[1]}-${m[2]}-[hash].js` : 'assets/[name]-[hash].js';
          },
          // Only node_modules are grouped by hand. Rollup pulls every static
          // dependency of a manual chunk's modules into that chunk unless the
          // dependency is itself assigned to one, and app code is never
          // assigned — so a manual chunk for src/data/* used to swallow
          // whatever those files imported: `horoscopes.ts` dragged
          // `i18n/config.ts` (and with it every locale's UI bundles) into
          // data-horoscopes, and `tarotDeck.ts` took `utils/cardDraw.ts`
          // into data-tarot. The main chunk needed both, so every visitor
          // downloaded ~1.3 MB of horoscope and tarot data at startup. With
          // no manual app chunks, Rollup splits src/data/* by who imports it:
          // a module only a lazy route reaches ships with that route, and a
          // module several routes share gets a shared chunk.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
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
            // Route-only libraries get their own chunk so the catch-all
            // `vendor` chunk — which the entry imports for i18next, zod and
            // the Capacitor core — stops carrying them to every visitor.
            // d3 + topojson: the celestial map. tz-lookup: birth-time zone
            // resolution on the horoscope, people and profile screens.
            // DOMPurify: rendering a blog post.
            if (/[/\\]node_modules[/\\](d3-[a-z-]+|topojson-client)[/\\]/.test(id)) return 'vendor-d3';
            if (/[/\\]node_modules[/\\]tz-lookup[/\\]/.test(id)) return 'vendor-tz';
            if (/[/\\]node_modules[/\\]dompurify[/\\]/.test(id)) return 'vendor-sanitize';
            return 'vendor';
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
