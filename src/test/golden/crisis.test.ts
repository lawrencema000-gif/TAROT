// @vitest-environment node
/**
 * The crisis keyword net (supabase/functions/_shared/crisis.ts) — the only
 * crisis signal while OpenAI moderation is unavailable. p7 #114: method
 * statements and every ja/ko/zh phrasing were missed. The bias is toward
 * false positives; the idioms below must still stay false.
 */
import { describe, expect, it } from 'vitest';
import { detectCrisis } from '../../../supabase/functions/_shared/crisis';

const MUST_TRIP = [
  // the review's misses
  'I’m going to hang myself tonight',
  'I want to hang myself',
  'life isn’t worth living',
  "life isn't worth living",
  'life isnt worth living',
  'I’m thinking about ending it',
  'I’m going to jump off a bridge',
  '死にたい',
  '消えたい',
  '자살하고 싶어',
  '죽고 싶다',
  '我想死',
  '我不想活了',
  // more English
  'I keep thinking of killing myself',
  'thinking about ending it all',
  'I could drown myself',
  'going to throw myself off the Golden Gate Bridge',
  'I want to jump in front of a train',
  'I want to slit my wrists',
  'I wrote my suicide note',
  'I want to unalive myself',
  'this life is not worth living',
  'life isn’t worth it',
  // still caught (earlier list)
  'I do not want to be alive anymore',
  'I want to kill myself',
  'I wish I was dead',
  'self-harming again',
  // Japanese
  'もう死にたくなる',
  '消えてしまいたい',
  '自殺を考えている',
  'リスカしてしまった',
  '飛び降りたい',
  '生きていたくない',
  '生きている意味がない',
  '首を吊ろうと思った',
  // Korean
  '죽어버리고 싶어',
  '자해를 했어',
  '살고 싶지 않아',
  '사라지고 싶다',
  '뛰어내리고 싶어',
  // Chinese (simplified and traditional)
  '我不想再活了',
  '活不下去了',
  '想自杀',
  '想自殺',
  '我想割腕',
  '想跳楼',
  '輕生的念頭',
  '活着没有意思',
];

const MUST_STAY_FALSE = [
  'this game kills me',
  'my feet are killing me',
  'I’m dying to try it',
  'I want to live in Kyoto',
  'I really shot myself in the foot there',
  'I’m thinking about dinner',
  'I jumped off the train at Shibuya',
  'that movie is worth watching',
  'The Hanged Man came up again',
  'the bridge at sunset was beautiful',
  '今日は楽しい一日でした',
  '消しゴムをなくした',
  '배고파 죽겠어',
  '사랑해',
  '我想去旅行',
  '笑死我了',
];

describe('detectCrisis', () => {
  for (const text of MUST_TRIP) {
    it(`trips: ${text}`, () => expect(detectCrisis(text)).toBe(true));
  }
  for (const text of MUST_STAY_FALSE) {
    it(`stays false: ${text}`, () => expect(detectCrisis(text)).toBe(false));
  }
});
