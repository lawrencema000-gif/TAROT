// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import postcss, { type AtRule, type Node, type Rule } from 'postcss';

/**
 * Why a bottom-anchored overlay inside <main> is a bug (social-ai-01).
 *
 * The shell's <main> is `relative z-10` (App.tsx), a stacking context of its
 * own, and the bottom nav (`nav[data-main-nav]`, fixed, z-40) is its sibling.
 * Any `fixed inset-0 … z-50` overlay drawn from a route inside <main> only
 * ranks inside main, so the nav paints over it. The community report dialog
 * was such an overlay, bottom-anchored below `md`: on every phone its Cancel
 * and Report sat exactly under the nav, a tap opened the Readings or Quizzes
 * tab, and no report was ever filed (community_reports never had a row).
 *
 * Two rules keep that from coming back:
 *   1. The shared Sheet holds the page with `body.sheet-open`, and index.css
 *      hides the nav while that class is set. Every sheet relies on it.
 *   2. An overlay that pins itself to the bottom of the screen
 *      (`fixed inset-0` with `items-end`) is drawn on <body> through a portal,
 *      or is one of the two the shell mounts beside <main>.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const posix = (p: string) => p.split(sep).join('/');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return [p];
  });
}

describe('the bottom nav hides while a sheet holds the page', () => {
  it('index.css hides nav[data-main-nav] under body.sheet-open, outside any media query', () => {
    const root = postcss.parse(readFileSync(join(SRC, 'index.css'), 'utf8'));
    const hiding: Rule[] = [];
    root.walkRules((rule) => {
      if (!rule.selectors.map((s) => s.trim()).includes('body.sheet-open nav[data-main-nav]')) return;
      let declaresNone = false;
      rule.walkDecls('display', (decl) => {
        if (decl.value.trim() === 'none') declaresNone = true;
      });
      if (declaresNone) hiding.push(rule);
    });
    expect(hiding.length).toBeGreaterThan(0);
    // At every width: a phone is where the nav covers a sheet's last row.
    const unconditional = hiding.filter((rule) => {
      for (let p = rule.parent as Node | undefined; p && p.type !== 'root'; p = p.parent as Node | undefined) {
        if (p.type === 'atrule' && /^(media|supports|container)$/i.test((p as AtRule).name)) return false;
      }
      return true;
    });
    expect(unconditional.length).toBeGreaterThan(0);
  });
});

describe('a bottom-anchored overlay is drawn on <body>, never inside <main>', () => {
  // Mounted beside <main> by App.tsx (the More menu inside the nav, and the
  // trial reminder after the route tree), so the nav does not cover them.
  const ALLOWED = new Set([
    'src/components/layout/BottomNav.tsx',
    'src/components/premium/TrialReminderModal.tsx',
  ]);

  const files = walk(SRC)
    .map((f) => posix(relative(ROOT, f)))
    .filter((f) => f.endsWith('.tsx') && !f.includes('/__tests__/') && !f.endsWith('.test.tsx'));

  const anchored = files
    .map((file) => {
      const text = readFileSync(join(ROOT, file), 'utf8');
      const lines = text.split('\n').flatMap((line, i) => (line.includes('fixed inset-0') && line.includes('items-end') ? [i + 1] : []));
      return { file, text, lines };
    })
    .filter((f) => f.lines.length > 0);

  it('finds bottom-anchored overlays at all (guards the scan itself)', () => {
    // CrisisBanner (portalled) and the two shell overlays match today. If this
    // drops to zero the test has silently stopped looking.
    expect(anchored.length).toBeGreaterThan(0);
  });

  it('every one portals to <body> or is mounted beside <main>', () => {
    const offenders = anchored
      .filter((f) => !f.text.includes('createPortal(') && !ALLOWED.has(f.file))
      .map((f) => `${f.file}:${f.lines.join(',')}`);
    expect(offenders).toEqual([]);
  });
});
