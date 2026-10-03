import { describe, it, expect } from 'vitest';
import { countWords, countWordsFallback } from './wordCount';

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('The rain kept on all morning.', 'en')).toBe(6);
    expect(countWords('   ', 'en')).toBe(0);
    expect(countWords('one', 'en')).toBe(1);
  });

  it('counts a Japanese entry as many words, not one (P7 #93)', () => {
    const ja = '今日は朝から雨だったけれど、午後には晴れて気持ちが軽くなった。';
    expect(countWords(ja, 'ja')).toBeGreaterThan(8);
    expect(countWords('今天下雨了，但是下午天晴了。', 'zh')).toBeGreaterThan(4);
    expect(countWords('오늘은 아침부터 비가 왔다', 'ko')).toBeGreaterThanOrEqual(4);
  });

  it('falls back sensibly without Intl.Segmenter', () => {
    expect(countWordsFallback('The rain, kept on.')).toBe(4);
    expect(countWordsFallback('今日は雨')).toBe(4);
    expect(countWordsFallback('Tarot と 今日')).toBe(4);
    expect(countWordsFallback('')).toBe(0);
  });
});
