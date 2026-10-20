import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Keys nothing reads since p10: the header search's invented recent
 * searches and its "results will appear here" placeholder (d3-ko-13; the
 * sheet now lists the member's own searches and real results), and the bare
 * hexagram prefix 第 / 제 (d2-ja-14; iching.hexagramNumber writes the whole
 * 第{{n}}卦). A key left in the files is translated and reviewed for
 * nothing, and can be wired back in by mistake.
 */
const RETIRED = [
  'search.recent.towerMeaning',
  'search.recent.loveCompatibilityAries',
  'search.recent.threeCardSpread',
  'search.resultsFor',
  'iching.hexagramLabel',
];

function flat(node: unknown, prefix: string, out: string[]): string[] {
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flat(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.push(prefix);
  }
  return out;
}

describe('retired locale keys', () => {
  it.each(['en', 'ja', 'ko', 'zh'])('%s/app.json no longer carries them', (lng) => {
    const app = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'app.json'), 'utf8')) as Record<string, Record<string, unknown>>;
    const keys = flat(app, '', []);
    expect(RETIRED.filter((k) => keys.includes(k))).toEqual([]);
    // The emptied search.recent went with its three keys.
    expect(app.search).not.toHaveProperty('recent');
  });
});
