import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * One title owner per screen.
 *
 * The app shell used to render its own <h1> and a tagline above every route,
 * and the page beneath rendered a second <h1>. Four of five primary tabs
 * titled themselves twice; every deep route wore "Today / Your daily ritual
 * awaits" over its own header. Nothing reads more unfinished than a screen
 * that names itself twice, and nothing in typecheck, lint or the suite could
 * see it.
 *
 * So: the shell must not title, and a page must not hand-roll an <h1>. The
 * title comes from PageHeader (or ResultLayout on result screens, or the
 * LearnEntryTemplate that wraps one), which is the only way the type,
 * spacing and back-affordance stay consistent across routes.
 *
 * The gate cuts both ways. Removing the shell h1 silently demoted every
 * page that had been deferring to it with `as="h2"` — the three report
 * screens, both ResultLayout consumers, Dice and Runes had no h1 at all
 * for one commit — so the second half checks that every routed page still
 * OWNS a title, not merely that it doesn't own two.
 */

const ROOT = process.cwd();
const PAGES = join(ROOT, 'src', 'pages');

/**
 * Screens whose title block is rebuilt wholesale in Phase 5 (home hero,
 * onboarding, auth, landing) or that are not user-facing. Each entry is a
 * debt, not a permission: remove it when the screen is rebuilt.
 */
const DEFERRED = new Set([
  'HomePage.tsx',        // Phase 5 — becomes one hero + a list
  'OnboardingPage.tsx',  // Phase 5 — shows the deck, not a medallion
  'AuthPage.tsx',        // Phase 5 — with onboarding
  'LandingPage.tsx',     // Phase 5 — hero is the thesis; keeps its own h1
  'PickACardPage.tsx',   // Phase 5 — motion.h1 over the deck; rebuilt with it
  'RedesignShowcasePage.tsx', // /dev/ route; titles itself with HeroGreeting
  'SandboxPage.tsx',     // flag-off preview
  'AdminPage.tsx',       // internal
]);

/**
 * Routed screens that have no page title by design. Also a claim, not a
 * permission: an entry that grows a title owner is flagged as stale.
 */
const UNTITLED = new Set([
  'OAuthOnboardingPage.tsx',   // full-screen stepper shown in place of the app; Phase 5 with onboarding
]);

/**
 * A heading is a heading whether it is `<h1>`, framer-motion's
 * `<motion.h1>`, or the `HeroGreeting` ornament, which renders an h1
 * unless told otherwise. The first version of this gate saw only the
 * first and walked straight past PickACardPage's animated title and the
 * showcase page's hero.
 */
// HomeHero owns the Home title the way HeroGreeting owns a landing hero:
// the page passes the words, the component renders the <h1>.
const H1 = /<(?:motion\.|m\.)?h1\b|<(?:HeroGreeting|HomeHero)\b(?![^>]*\bas=["']h[2-6]["'])/;

/** The components that may own a page title. */
const OWNER = /<(?:PageHeader|ResultLayout|LearnEntryTemplate)\b/g;

function pageFiles(): string[] {
  return readdirSync(PAGES).filter((f) => /\.tsx$/.test(f));
}

/** Blank comments, keeping newlines so reported line numbers stay honest. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
}

/** Pages App.tsx actually routes — imported statically or through lazy(). */
function routedPages(): string[] {
  const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
  const names = new Set<string>();
  for (const m of app.matchAll(/pages\/([A-Za-z0-9_]+)['"]/g)) names.add(`${m[1]}.tsx`);
  return [...names].filter((n) => existsSync(join(PAGES, n))).sort();
}

/**
 * True when `<h1` on this line sits inside a string or regex literal rather
 * than in JSX — BlogPostPage strips a duplicate heading out of generator HTML
 * with a regex, and that pattern is not a heading. An unbalanced quote or an
 * open regex before the match is the tell; a bare `.replace(` on the line is
 * not, because `<h1>{name.replace(…)}</h1>` is a real heading.
 */
function insideLiteral(line: string): boolean {
  const before = line.slice(0, line.search(H1));
  const unbalanced = ["'", '"', '`'].some((q) => (before.split(q).length - 1) % 2 === 1);
  return unbalanced || /(?:\.replace\(\s*\/|new RegExp\(|\/\^)/.test(before);
}

/**
 * The open tag starting at `rest[0]`: everything up to the first `>` at
 * brace depth 0 that is not part of `=>`. A JSX-valued prop such as
 * `icon={<Calendar />}` closes its own tag inside the braces, so a plain
 * search for `>` would end the tag there and hide an `as="h2"` after it.
 */
function openTag(rest: string): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && rest[i - 1] !== '=') return rest.slice(0, i + 1);
  }
  return rest;
}

/** True when the page renders at least one title owner that is not demoted to h2. */
function ownsTitle(code: string): boolean {
  const re = new RegExp(OWNER.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (!/\bas=["']h2["']/.test(openTag(code.slice(m.index)))) return true;
  }
  return false;
}

describe('one title owner per screen', () => {
  it('the shell header renders no title', () => {
    const header = readFileSync(join(ROOT, 'src', 'components', 'layout', 'Header.tsx'), 'utf8');
    expect(H1.test(stripComments(header))).toBe(false);
  });

  it('no page hand-rolls an <h1> outside the deferred list', () => {
    const offenders: string[] = [];
    for (const f of pageFiles()) {
      if (DEFERRED.has(f)) continue;
      const code = stripComments(readFileSync(join(PAGES, f), 'utf8'));
      code.split('\n').forEach((line, i) => {
        if (!H1.test(line) || insideLiteral(line)) return;
        offenders.push(`src/pages/${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every routed page owns its title', () => {
    const missing: string[] = [];
    for (const f of routedPages()) {
      if (UNTITLED.has(f)) continue;
      const code = stripComments(readFileSync(join(PAGES, f), 'utf8'));
      const owns = DEFERRED.has(f) ? H1.test(code) : ownsTitle(code);
      if (!owns) missing.push(`src/pages/${f}`);
    }
    expect(missing).toEqual([]);
  });

  it('the deferred and untitled lists only name files that still need it', () => {
    // A stale allow-list is how a gate rots. If a deferred page no longer
    // has an <h1>, or an untitled page has grown a title owner, its entry
    // must go.
    const stale: string[] = [];
    for (const f of DEFERRED) {
      if (!existsSync(join(PAGES, f))) { stale.push(`${f} (missing)`); continue; }
      if (!H1.test(stripComments(readFileSync(join(PAGES, f), 'utf8')))) stale.push(f);
    }
    const routed = new Set(routedPages());
    for (const f of UNTITLED) {
      if (!routed.has(f)) { stale.push(`${f} (not routed)`); continue; }
      const code = stripComments(readFileSync(join(PAGES, f), 'utf8'));
      if (ownsTitle(code) || H1.test(code)) stale.push(`${f} (now titled)`);
    }
    expect(stale).toEqual([]);
  });
});
