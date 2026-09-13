import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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
 * title comes from PageHeader (or ResultLayout on result screens), which is
 * the only way the type, spacing and back-affordance stay consistent across
 * routes. This test is the CI gate the migration was measured against.
 */

const PAGES = join(process.cwd(), 'src', 'pages');

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
  'SandboxPage.tsx',     // flag-off preview
  'AdminPage.tsx',       // internal
]);

function pageFiles(): string[] {
  return readdirSync(PAGES).filter((f) => /\.tsx$/.test(f));
}

describe('one title owner per screen', () => {
  it('the shell header renders no title', () => {
    const header = readFileSync(join(process.cwd(), 'src', 'components', 'layout', 'Header.tsx'), 'utf8');
    expect(header.includes('<h1')).toBe(false);
  });

  it('no page hand-rolls an <h1> outside the deferred list', () => {
    const offenders: string[] = [];
    for (const f of pageFiles()) {
      if (DEFERRED.has(f)) continue;
      const src = readFileSync(join(PAGES, f), 'utf8');
      // Blank comments (keeping newlines so line numbers stay honest) and
      // skip regex/string literals: BlogPostPage strips a duplicate <h1> from
      // generator HTML, and the pattern that does it is not a heading.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
        .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
      code.split('\n').forEach((line, i) => {
        if (!/<h1\b/.test(line)) return;
        if (/\.replace\(|\/\^|new RegExp|['"`][^'"`]*<h1/.test(line)) return;
        offenders.push(`src/pages/${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the deferred list only names files that still need it', () => {
    // A stale allow-list is how a gate rots. If a deferred page no longer
    // has an <h1>, its entry must go.
    const stale: string[] = [];
    for (const f of DEFERRED) {
      let src = '';
      try { src = readFileSync(join(PAGES, f), 'utf8'); } catch { stale.push(`${f} (missing)`); continue; }
      if (!/<h1\b/.test(src)) stale.push(f);
    }
    expect(stale).toEqual([]);
  });
});
