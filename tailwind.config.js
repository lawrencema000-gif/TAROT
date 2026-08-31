/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // A real lightness ladder, split into a SURFACE tier and an INK tier.
        //
        // The old scale had neither. A default Card (bg-mystic-900/80 over
        // mystic-950) computed to 1.03:1 against the page and its border to
        // 1.13:1 — literally invisible — which is why 75 cards ended up
        // carrying variant="glow". The amber bloom was not decoration, it was
        // the only thing separating a card from the background. Fix the
        // surfaces and the glow becomes deletable instead of load-bearing.
        //
        // The ink tier was failing WCAG AA everywhere at body sizes:
        // 400 was 3.76:1 (652 uses), 500 was 2.24:1 (607), 600 was 1.65:1 (90).
        // Retinting in place fixes ~1,300 text nodes across all 69 pages with
        // no markup churn, because 300-500 are 98% text usages and 700-950 are
        // ~99% surface usages (counted, not assumed).
        mystic: {
          // ── surfaces ──
          950: '#07070f',  // canvas
          900: '#101024',  // sunken / nav
          850: '#16162e',  // surface-1 — Card
          800: '#1f1f3a',  // surface-2 — input, chip
          700: '#2c2c4c',  // hairline / border
          // ── ink ──
          600: '#7e7e9e',  // faintest legible text
          500: '#8f8fae',
          400: '#a3a3bd',  // default muted body text
          300: '#c6c6d8',
          200: '#dcdce6',
          100: '#f2f2f7',
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
          // VERIFIED MISSING: `cosmic-violet` is used 84 times across 27 files
          // and was never defined here, so `.text-cosmic-violet` was never
          // generated and every violet accent in the product rendered as
          // inherited colour — on Home, Profile, Oracle, ChartWheel, Ziwei and
          // DailyWisdom. The palette was designed as three hues and users have
          // only ever seen two.
          //
          // The value is recovered, not invented: HomeRow.tsx already hardcodes
          // bg-[#8e6eb5]/20 and index.css's nebula-veil uses rgba(142,110,181).
          // violetLight exists because bare #8e6eb5 is 4.10:1 on a card and
          // fails AA as text.
          violet: '#8e6eb5',
          violetLight: '#a98fd0',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Noto Serif JP', 'Noto Serif KR', 'Noto Serif SC', 'Georgia', 'serif'],
        body: ['Inter', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'system-ui', 'sans-serif'],
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
      // ── Motion scale ───────────────────────────────────────────────
      //
      // There was no `transitionDuration` and no `transitionTimingFunction`
      // here at all, which is why 378 transition utilities across src/ ran
      // on values nobody chose: ~300 of them on Tailwind's unstated 150ms
      // and ~355 on its unstated cubic-bezier(0.4,0,0.2,1), with the
      // remainder split over six ad-hoc durations.
      //
      // These resolve to the --dur-* / --ease-* tokens defined in
      // src/index.css :root, so `duration-slow` in a class list and
      // `var(--dur-slow)` in a stylesheet are the same number by
      // construction. The literal fallbacks are only there in case a
      // consumer loads the compiled CSS without index.css.
      //
      // Numeric durations (duration-300 etc.) still work — `extend` adds
      // to the defaults rather than replacing them — but named ones say
      // what the motion is FOR, which is the point. `out` and `in` are
      // deliberately redefined over Tailwind's defaults so that every
      // `ease-out` in the app means the same arriving curve.
      transitionDuration: {
        fast: 'var(--dur-fast, 150ms)',              // press, hover, colour
        base: 'var(--dur-base, 220ms)',              // a state change
        slow: 'var(--dur-slow, 300ms)',              // arriving / leaving
        deliberate: 'var(--dur-deliberate, 500ms)',  // a watched moment
        // Not interaction feedback: a bar filling, a backdrop crossfading.
        // These are watched for their own sake and read as sluggish only if
        // you are waiting on them, which you are not.
        ambient: 'var(--dur-ambient, 700ms)',        // a quantity moving
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1))',
        'in-out': 'var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1))',
        out: 'var(--ease-out, cubic-bezier(0.22, 0.8, 0.25, 1))',
        in: 'var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45))',
        spring: 'var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))',
        emphasized: 'var(--ease-emphasized, cubic-bezier(0.16, 1, 0.3, 1))',
      },

      // Five entries were deleted here because nothing in src/ or
      // index.html referenced them: `float`, `card-flip`, `tarot-reveal`,
      // `bounce-in` and `glow-pulse` (the last two never had a single call
      // site in the app's history). Three more — fade-in, scale-in,
      // spin-slow — were being silently overridden by same-named rules in
      // src/index.css, which is emitted after `@tailwind utilities` and so
      // won at equal specificity. That made this file a decoy: editing
      // `fade-in` here changed nothing on screen. The winning behaviour has
      // been folded in below and the index.css copies deleted, so this is
      // now the only definition of every `animate-*` utility.
      //
      // Values are literal rather than var(). Tailwind parses this
      // shorthand to work out which @keyframes block to emit, and a var()
      // carrying a cubic-bezier() — commas and all — is what breaks that
      // parser. Keep them in step with --dur-*/--ease-* in src/index.css.
      animation: {
        // ── state: something is happening ──
        'shimmer': 'shimmer 1.6s linear infinite',   // "content is loading"
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 8s linear infinite',

        // ── entrance: something arrived (--dur-slow / --ease-out) ──
        'fade-in': 'fade-in 300ms cubic-bezier(0.22, 0.8, 0.25, 1) forwards',
        'scale-in': 'scale-in 300ms cubic-bezier(0.22, 0.8, 0.25, 1) forwards',
        'slide-up': 'slide-up 300ms cubic-bezier(0.22, 0.8, 0.25, 1) forwards',

        // ── ambient: transform-only, so it stays on the compositor ──
        'float-gentle': 'float-gentle 4s ease-in-out infinite',

        // ── a moment, once per interaction ──
        'confetti': 'confetti 3s ease-out forwards',
      },
      keyframes: {
        // Skeleton sweep. background-position is a repaint rather than a
        // composite, but it is confined to small placeholder blocks and is
        // the only signal a skeleton has. Turning it into a translated
        // overlay needs a markup change in src/components/ui/Skeleton.tsx,
        // which builds the gradient from Tailwind classes.
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Owns its own keyframe instead of borrowing core `spin`, so the
        // 8s period is stated where the 8s is read.
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        // The 10px rise came from the index.css override and is what all
        // 24 call sites have actually been rendering. Kept: a fade with a
        // small displacement reads as "this arrived", a bare opacity fade
        // reads as a repaint.
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  // Classes built at runtime rather than written literally, so Tailwind's
  // scanner cannot see them. QuizzesPage composes `text-${metadata.color}`
  // and `text-${color}` from data. Every value happens to be emitted today
  // only because unrelated files use the same literals — change a quiz colour
  // to anything not used elsewhere and the icon silently renders colourless,
  // with nothing failing. Naming them here makes that dependency real.
  safelist: [
    'text-cosmic-blue',
    'text-cosmic-rose',
    'text-emerald-400',
    'text-gold',
    'text-mystic-300',
  ],

  plugins: [],
};
