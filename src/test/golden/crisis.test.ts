// @vitest-environment node
/**
 * The crisis keyword net (supabase/functions/_shared/crisis.ts) — the only
 * crisis signal while OpenAI moderation is unavailable. p7 #114: method
 * statements and every ja/ko/zh phrasing were missed. The bias is toward
 * false positives; the idioms below must still stay false.
 *
 * p8 F01: a flagged post is hidden for good and its author gets the
 * helpline dialog, so the ordinary ways this community describes cards (The
 * Fool's cliff, The Tower's falling figures, the Death card), love and career
 * questions ("end my relationship", 関係を終わりにしたい) and hair dye must
 * stay false too — the method patterns need the writer as their subject.
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
  // p8 F01: the narrowed patterns still catch the writer's own intent
  'I keep thinking about dying',
  'I’ve been thinking about dying lately',
  'Thinking about dying again.',
  'I think about dying every day',
  'I’m about to jump off the roof',
  'Gonna jump off a bridge tonight',
  'I feel like jumping off a cliff',
  'im going to jump off a building',
  'I just want to end my life',
  'I want to end my suffering',
  'I want to end it all',
  'I’ve been thinking about ending things',
  'I want to throw myself in front of a train',
  'so tired, about to step in front of a bus',
  'I want to die',
  '人生を終わりにしたい',
  'もう全部終わらせたい',
  '全部終わりにしたい',
  '自分を終わらせたい',
  'この世から消えたい',
  'この世からいなくなりたい',
  '飛び降りようと思う',
  '我想跳楼',
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
  // p8 F01: the review's false positives (each returned CRISIS at 2026-10-17 HEAD)
  'The Fool is about to jump off a cliff, but he is not afraid.',
  'On The Tower card two people are jumping from the tower while lightning strikes.',
  'Why does everyone think of dying when they pull the Death card? It means transformation.',
  'I’ve been thinking about dying my hair red for Leo season!',
  "I've been thinking about dying my hair red for Leo season!",
  '彼との関係を終わりにしたいけど、カードは何と言っていますか？',
  '今の仕事を終わりにしたい。転職のタイミングを占ってほしい。',
  'この世から争いがなくなりますように。',
  'Should I end my relationship?',
  // …and their siblings
  'I think the Fool is about to jump off a cliff',
  'The figures leap from the tower into the dark',
  'I saw a black cat walking in front of the car this morning',
  'I’m thinking about ending things with him, what do the cards say?',
  'Should I end everything with him?',
  'I want to die my hair blue',
  '清水の舞台から飛び降りる気持ちで告白しました',
  '宿題を全部終わらせたい',
  '今日中に全部終わらせたい',
  '跳楼价大甩卖',
];

describe('detectCrisis', () => {
  for (const text of MUST_TRIP) {
    it(`trips: ${text}`, () => expect(detectCrisis(text)).toBe(true));
  }
  for (const text of MUST_STAY_FALSE) {
    it(`stays false: ${text}`, () => expect(detectCrisis(text)).toBe(false));
  }
});
