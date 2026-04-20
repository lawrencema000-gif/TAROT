import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// --------------------------------------------------------------------------
// Layering enforcement (Phase 1 — SCALABILITY-PLAN.md Part 3)
//
//   UI (components, pages) -> Hooks -> Services -> DAL -> lib/supabase
//
// Rules of thumb:
//   * UI code (components, pages) must NEVER import `src/lib/supabase`. Data
//     access belongs in services / DAL. Hooks act as the UI entry point.
//   * Hooks may not import `src/lib/supabase` directly either (they use
//     services). `src/context/AuthContext.tsx` is a temporary exception —
//     it acts as the profiles DAL through Phase 1.
//   * Only `src/context/AuthContext.tsx`, `src/dal/**`, and `src/services/**`
//     may import `src/lib/supabase`.
//   * Services may not import UI (no upward arrows from services into
//     components/pages).
//
// We implement this with `eslint-plugin-boundaries` (layering) plus
// `no-restricted-imports` (belt-and-braces ban of the supabase client from
// UI-layer files) plus `no-restricted-syntax` (ban `i18n.language` outside
// `src/i18n/config.ts` — engineers must use `getLocale()`).
// --------------------------------------------------------------------------

export default tseslint.config(
  { ignores: ['dist', 'android', 'node_modules', 'scripts', 'supabase/functions', 'e2e', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // ------------------------------------------------------------------------
  // Boundaries: layering for src/**
  // ------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Tell boundaries how to classify a file into an element type.
      // Order matters — first match wins.
      'boundaries/elements': [
        { type: 'pages', pattern: 'src/pages/**' },
        { type: 'components', pattern: 'src/components/**' },
        { type: 'hooks', pattern: 'src/hooks/**' },
        { type: 'services', pattern: 'src/services/**' },
        { type: 'dal', pattern: 'src/dal/**' },
        { type: 'context', pattern: 'src/context/**' },
        { type: 'i18n', pattern: 'src/i18n/**' },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'utils', pattern: 'src/utils/**' },
        { type: 'data', pattern: 'src/data/**' },
        { type: 'config', pattern: 'src/config/**' },
        { type: 'types', pattern: 'src/types/**' },
        { type: 'styles', pattern: 'src/styles/**' },
        { type: 'test', pattern: 'src/test/**' },
        // Top-level files (App.tsx, main.tsx, etc.) are untyped on purpose.
      ],
      'boundaries/include': ['src/**/*'],
      // Treat anything that doesn't match an element as unknown — we don't
      // want boundaries to error on App.tsx / main.tsx.
      'boundaries/default': 'allow',
      // Resolve TS paths so that imports like `../components/ui` land on
      // `src/components/ui/index.ts` and the element-type matcher fires.
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
    rules: {
      // `element-types`: each element type declares what it is ALLOWED to
      // import. Anything not listed is a violation.
      //
      // SEVERITY NOTE: set to 'warn' during Phase 1 because the DAL
      // migration is still in flight — there are ~20 existing boundary
      // crossings (UI→lib, pages→dal, i18n→data, utils→context) that the
      // DAL agent is cleaning up. Flip this to 'error' in Phase 2 once
      // those are gone. See .audit/SCALABILITY-PLAN.md.
      'boundaries/element-types': [
        'warn',
        {
          default: 'disallow',
          rules: [
            // UI: pages + components. May use hooks, services, DAL (direct
            // read/write through typed modules), context, utils, i18n,
            // data, config, types, styles, and peer components. MAY NOT
            // import lib/supabase.
            {
              from: ['pages', 'components'],
              allow: [
                'pages',
                'components',
                'hooks',
                'services',
                'dal',
                'context',
                'utils',
                'i18n',
                'data',
                'config',
                'types',
                'styles',
              ],
            },
            // Hooks: may use services, DAL (typed data-access modules),
            // context, utils, i18n, lib, data, config, types, plus peer
            // hooks. Hooks are NOT allowed to reach lib/supabase directly
            // — `no-restricted-imports` below enforces that with a clearer
            // error message.
            {
              from: ['hooks'],
              allow: [
                'hooks',
                'services',
                'dal',
                'context',
                'utils',
                'i18n',
                'lib',
                'data',
                'config',
                'types',
              ],
            },
            // Services: DAL, utils, i18n, lib, data, config, types. NO UI.
            {
              from: ['services'],
              allow: [
                'services',
                'dal',
                'utils',
                'i18n',
                'lib',
                'data',
                'config',
                'types',
              ],
            },
            // DAL: the only layer (besides context/AuthContext) that owns
            // raw supabase access. May use lib, utils, types, config.
            {
              from: ['dal'],
              allow: ['dal', 'lib', 'utils', 'types', 'config'],
            },
            // Context: may use services, DAL, lib, utils, i18n, data,
            // config, types. AuthContext's lib/supabase import rides on
            // this allowance (temporary — Phase 1).
            {
              from: ['context'],
              allow: [
                'context',
                'services',
                'dal',
                'lib',
                'utils',
                'i18n',
                'data',
                'config',
                'types',
                'hooks',
              ],
            },
            // i18n: utility layer, may touch types + config + read `data`
            // (for type-only imports like ZodiacProfile, and because
            // localize* helpers merge app-bundled data with locale JSON).
            {
              from: ['i18n'],
              allow: ['i18n', 'utils', 'types', 'config', 'data'],
            },
            // Utils: pure, may import lib + types only.
            {
              from: ['utils'],
              allow: ['utils', 'lib', 'types', 'config'],
            },
            // Lib: supabase client + local wrappers. Leaves only.
            { from: ['lib'], allow: ['lib', 'types', 'config'] },
            // Data/config/types/styles: leaves.
            { from: ['data'], allow: ['data', 'types', 'config', 'utils', 'i18n'] },
            { from: ['config'], allow: ['config', 'types'] },
            { from: ['types'], allow: ['types'] },
            { from: ['styles'], allow: ['styles'] },
            // Tests can import anything.
            {
              from: ['test'],
              allow: [
                'pages',
                'components',
                'hooks',
                'services',
                'dal',
                'context',
                'i18n',
                'lib',
                'utils',
                'data',
                'config',
                'types',
                'styles',
                'test',
              ],
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------------------------------
  // Belt-and-braces: forbid `lib/supabase` imports from UI layer directly,
  // with a friendly message. Boundaries above would already block this, but
  // this surfaces the right remediation ("use a service/hook") instead of
  // the generic "element-types violation".
  //
  // SEVERITY NOTE: set to 'warn' during Phase 1 because the DAL migration
  // is still in flight — there are ~16 existing UI→supabase imports that
  // the DAL agent is moving into src/services/** and src/dal/**. Flip this
  // to 'error' in Phase 2 once the DAL lands. See .audit/SCALABILITY-PLAN.md.
  // ------------------------------------------------------------------------
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '**/lib/supabase',
                '**/lib/supabase.*',
                '@/lib/supabase',
              ],
              message:
                'UI code (components/pages) must not import lib/supabase directly. Call a service in src/services/** (or a hook that wraps one). See .audit/SCALABILITY-PLAN.md Part 3. [Phase 1 warn; becomes error after DAL migration lands.]',
            },
          ],
        },
      ],
    },
  },

  // Hooks also must not hit supabase directly (use a service).
  // Also 'warn' during Phase 1 — useAstrology + useBlogPosts currently
  // import supabase and will be refactored to call services.
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '**/lib/supabase',
                '**/lib/supabase.*',
                '@/lib/supabase',
              ],
              message:
                'Hooks must not import lib/supabase directly. Wrap a service from src/services/** instead. (AuthContext is the one allowed exception and lives in src/context/.) [Phase 1 warn; becomes error after DAL migration lands.]',
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------------------------------
  // Ban `i18n.language` everywhere except `src/i18n/config.ts`.
  // Use `getLocale()` from `src/i18n/config.ts` so we get one normalized
  // source of truth for the active locale (see arch audit — BlogPage.tsx:55,
  // BlogPostPage.tsx:62 are the remaining violators).
  // ------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/i18n/config.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.name="i18n"][property.name="language"]',
          message:
            'Do not read `i18n.language` directly. Import `getLocale()` from src/i18n/config.ts — it normalizes the locale and is the single source of truth.',
        },
      ],
    },
  }
);
