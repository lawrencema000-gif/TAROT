import { describe, it, expect } from 'vitest';
import { splitReading, splitSentences, aiFailureOf, failedBeforeCharge } from '../../components/reports/aiReading';

/**
 * The AI reading screens' shared rules: where the centred summary ends, in
 * every locale (review #164), and what a failed request means for the
 * user's Moonstones (review #28, #29).
 */

describe('splitReading — the summary is at most two sentences, in every script', () => {
  it('English: two sentences, the rest is the body', () => {
    const r = splitReading('The Fool asks for a first step. You have waited long enough. Gemini wants variety. What would you try?\n\nSecond paragraph.');
    expect(r.summary).toBe('The Fool asks for a first step. You have waited long enough.');
    expect(r.rest).toBe('Gemini wants variety. What would you try?\n\nSecond paragraph.');
  });

  it('English: decimals, abbreviations without a following space and quotes stay whole', () => {
    expect(splitSentences('It is 3.5 times brighter. “Go,” she said. Then rest.')).toEqual([
      'It is 3.5 times brighter.',
      '“Go,” she said.',
      'Then rest.',
    ]);
  });

  it('Japanese: 。！？ end a sentence with no space after them', () => {
    const p = '愚者のカードは新しい一歩を促しています。あなたは長いあいだ待ってきました。双子座の太陽は変化を求めています。今の職場での役割を見直すときかもしれません。';
    const r = splitReading(`${p}\n\n二段落目です。`);
    expect(r.summary).toBe('愚者のカードは新しい一歩を促しています。あなたは長いあいだ待ってきました。');
    expect(r.rest).toBe('双子座の太陽は変化を求めています。今の職場での役割を見直すときかもしれません。\n\n二段落目です。');
  });

  it('Japanese: a closing bracket stays with its sentence, and a run of stops is one end', () => {
    expect(splitSentences('彼は「行こう。」と言った。本当に？！そうです。')).toEqual([
      '彼は「行こう。」と言った。',
      '本当に？！',
      'そうです。',
    ]);
  });

  it('Chinese: 。！？ split, nothing is joined with a space', () => {
    const r = splitReading('星星在提醒你放慢脚步。你已经很努力了！现在该问问自己想要什么？最后一句。');
    expect(r.summary).toBe('星星在提醒你放慢脚步。你已经很努力了！');
    expect(r.rest).toBe('现在该问问自己想要什么？最后一句。');
  });

  it('Korean: ASCII stops with spaces', () => {
    const r = splitReading('바보 카드는 첫걸음을 권합니다. 오래 기다려 왔어요. 이제 움직일 때입니다.');
    expect(r.summary).toBe('바보 카드는 첫걸음을 권합니다. 오래 기다려 왔어요.');
    expect(r.rest).toBe('이제 움직일 때입니다.');
  });

  it('one sentence: all summary, no body', () => {
    expect(splitReading('たった一文です。')).toEqual({ summary: 'たった一文です。', rest: '' });
  });
});

function httpError(status: number, code?: string) {
  const body = code ? JSON.stringify({ error: { code, message: 'x' } }) : 'not json';
  // supabase-js FunctionsHttpError keeps the Response on `context`; its message is generic.
  return { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: new Response(body, { status }) };
}

describe('aiFailureOf — classified by status and envelope code, never the message', () => {
  it('402 INSUFFICIENT_BALANCE is insufficient (nothing charged)', async () => {
    const f = await aiFailureOf(httpError(402, 'INSUFFICIENT_BALANCE'));
    expect(f).toBe('insufficient');
    expect(failedBeforeCharge(f)).toBe(true);
  });
  it('429 AI_SOFT_CAP is the soft cap, a plain 429 is the rate limit', async () => {
    expect(await aiFailureOf(httpError(429, 'AI_SOFT_CAP'))).toBe('soft-cap');
    expect(await aiFailureOf(httpError(429, 'RATE_LIMITED'))).toBe('rate-limit');
  });
  it('503 is unavailable (refused before the debit)', async () => {
    expect(await aiFailureOf(httpError(503, 'AI_DISABLED'))).toBe('unavailable');
  });
  it('a 500 is generic — it may have been charged, so the retry copy applies', async () => {
    const f = await aiFailureOf(httpError(500, 'INTERNAL'));
    expect(f).toBe('generic');
    expect(failedBeforeCharge(f)).toBe(false);
  });
  it('no response at all is network — may have been charged', async () => {
    const f = await aiFailureOf({ name: 'FunctionsFetchError', message: 'Failed to send a request', context: new TypeError('fetch failed') });
    expect(f).toBe('network');
    expect(failedBeforeCharge(f)).toBe(false);
  });
});
