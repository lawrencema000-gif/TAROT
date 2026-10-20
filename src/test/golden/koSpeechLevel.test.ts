import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p10 d3-ko-12: the Whispering Well's intro changed speech level from one
 * sentence to the next — 「…모든 게시물은 익명입니다. 서로에 대한 존중이 유일한
 * 규칙이에요. 도움이 필요하면 분명히 말해 주세요 — 누군가 듣고 있습니다.」 The app
 * speaks 해요체, and the community's other strings had the same slips: the
 * sign-in prompt (「…로그인이 필요합니다」), the notices after a post or a
 * comment goes to review (「게시되었습니다 — 곧 검토하겠습니다.」), the blocked-
 * content notice and the thanks for a report. Every Korean community string
 * keeps to 해요체 now.
 *
 * A formal (하십시오체) ending is a syllable closed by ㅂ before 니다 or 니까:
 * 합니다, 습니다, 입니다, 됩니다, 갑니다, 습니까.
 */

function formalEndings(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/([가-힣])니[다까]/g)) {
    // A precomposed syllable's final consonant is its offset from 가, mod 28; ㅂ is 17.
    if ((m[1].charCodeAt(0) - 0xac00) % 28 === 17) out.push(m[0]);
  }
  return out;
}

function flat(node: unknown, path: string, out: Array<[string, string]>): Array<[string, string]> {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) flat(v, path ? `${path}.${k}` : k, out);
  return out;
}

const ko = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'ko', 'app.json'), 'utf8'));

describe('Korean community strings keep one speech level, 해요체 (p10 d3-ko-12)', () => {
  it('the detector reads the endings the QA found, and passes the ones the app uses', () => {
    expect(formalEndings('모든 게시물은 익명입니다. 누군가 듣고 있습니다.')).toEqual(['입니다', '습니다']);
    expect(formalEndings('게시되었습니다 — 곧 검토하겠습니다.')).toEqual(['습니다', '습니다']);
    expect(formalEndings('반응하려면 로그인이 필요합니다')).toEqual(['합니다']);
    expect(formalEndings('모든 게시물은 익명이에요. 누군가 듣고 있어요. 곧 검토할게요.')).toEqual([]);
  });

  it('the Whispering Well’s intro is 해요체 throughout', () => {
    const intro = ko.community.whisperingWell.intro as string;
    expect(formalEndings(intro)).toEqual([]);
    expect(intro).toMatch(/익명이에요/);
    expect(intro).toMatch(/듣고 있어요/);
  });

  it('no community string ends in 하십시오체', () => {
    const hits = flat(ko.community, 'community', [])
      .filter(([, v]) => formalEndings(v).length > 0)
      .map(([k, v]) => `${k}: ${v}`);
    expect(hits).toEqual([]);
  });
});
