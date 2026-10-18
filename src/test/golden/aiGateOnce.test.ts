import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The AI killswitch and the member's daily AI ceiling must run once per
 * request. The shared handler runs them for a function declared with
 * `ai: true`; a function that also calls aiGate() ran them a second time and
 * counted every request twice against the ceiling (ai-dream-interpret and
 * celestial-travel-reading did, p9 QZ). A function that needs the gate at a
 * later point (ai-journal-coach: after its crisis check) leaves `ai: true`
 * off and calls aiGate() itself.
 */

const FUNCTIONS = join(__dirname, '..', '..', '..', 'supabase', 'functions');

/** The source without // and /* *\/ comments, so a comment that names aiGate() does not count. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the AI gate runs once per request', () => {
  const dirs = readdirSync(FUNCTIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .filter((name) => existsSync(join(FUNCTIONS, name, 'index.ts')));

  it('finds the edge functions', () => {
    expect(dirs.length).toBeGreaterThan(10);
  });

  it.each(dirs)('%s does not both declare ai: true and call aiGate()', (name) => {
    const src = code(readFileSync(join(FUNCTIONS, name, 'index.ts'), 'utf8'));
    const declares = /\bai:\s*true\b/.test(src);
    const calls = /\baiGate\s*(?:<[^>]*>)?\s*\(/.test(src);
    expect(declares && calls).toBe(false);
  });
});
