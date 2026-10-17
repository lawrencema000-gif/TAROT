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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectCrisis, CRISIS_LINES, type CrisisLocale } from '../../../supabase/functions/_shared/crisis';
import {
  SYSTEM, crisisShortcut, fallbackPrompts, journalCrisisReply, parseCoachReply,
} from '../../../supabase/functions/ai-journal-coach/reply';

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
  // p9 R00/R19: plain first-person statements the F01 narrowing stopped
  // tripping, and phrasings no pattern had covered
  "I'm going to go jump off a bridge tonight",
  'I’m gonna go jump off the roof',
  "I've decided to jump off the building",
  'I have decided to jump in front of a train',
  'I have a plan to end it tonight',
  "I'm planning to end it this weekend",
  'nobody would miss me if I was gone',
  'No one would even notice if I’m gone',
  'nobody would care if I died',
  'everyone would be better off without me',
  'the world would be better without me',
  'ビルから飛び降りたい',
  '屋上から飛び降りる',
  '電車に飛び込みたい',
  '한강에서 뛰어내릴 거야',
  '옥상에서 뛰어내리고 싶어',
  // p9 Q29: the Japanese "I want to end it" with no object (F01 dropped it)
  'もう終わりにしたい',
  '疲れた。もう終わりにしたい。',
  '終わりにしたい',
  '疲れた。終わりにしたい。',
  'もう、終わりにしたい',
  '疲れた…終わりにしたい',
  'もう終わらせたい',
  // p9 Q32: the QA's journal entry, and the zh/ko phrasings of the same kind
  '最近ずっと眠れない。もう消えたい。生きている意味がわからない。誰にも言えない。',
  '我真的好想消失',
  '好想消失。',
  '그만 살고 싶어',
  '이제 그만 살고 싶다',
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
  // p9 R15: the ja/ko descriptions of the same cards
  '愚者は崖から飛び降りようとしています。',
  '愚者のカードでは、若者が崖から飛び降りる寸前です',
  '塔のカードでは二人が塔から落ちています。',
  '바보 카드는 절벽에서 뛰어내리려는 모습이에요.',
  '탑 카드에서 두 사람이 탑에서 떨어지고 있어요.',
  '塔牌上两个人从塔上跳下来。',
  // …and relationship/decision talk next to the widened English helpers
  'I’ve decided to end it with him',
  'nobody would miss me at the party, so I stayed home',
  // p9 Q29: the object-less pattern leaves objects, and "quickly", alone
  '宿題を早く終わらせたい',
  '会議を早く終わりにしたい',
  'この関係を終わりにしたいです',
  'レポートを終わらせたい',
  // p9: 想消失 needs the wish, not its negation or a worry made to vanish
  '我不想消失',
  '想让烦恼消失',
  '我想让疼痛消失',
  '그만하고 싶어',
  '이제 그만 먹고 싶어',
];

describe('detectCrisis', () => {
  for (const text of MUST_TRIP) {
    it(`trips: ${text}`, () => expect(detectCrisis(text)).toBe(true));
  }
  for (const text of MUST_STAY_FALSE) {
    it(`stays false: ${text}`, () => expect(detectCrisis(text)).toBe(false));
  }
});

/*
 * p9 Q32: the journal coach screened entries with an English-only regex and
 * told the model to answer with the US lines, so a Japanese member writing
 * 「もう消えたい」 got reflective questions and no helpline. It now runs the
 * detector above and answers in the member's language with the lines the
 * Community crisis banner shows for it.
 */
const LOCALES: CrisisLocale[] = ['en', 'ja', 'ko', 'zh'];
const crisisStrings = (lng: CrisisLocale) =>
  (JSON.parse(readFileSync(join(__dirname, '..', '..', 'i18n', 'locales', lng, 'app.json'), 'utf8')) as {
    crisis: { phone: Record<string, string>; text: Record<string, string>; footer: string };
  }).crisis;
// The CJK punctuation rule of cjkPunctuation.test.ts, for the server's own words.
const CJK = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef';
const ASCII_MARK_BY_CJK = new RegExp(`[${CJK}][?!,;:]|(^|[^0-9])[?!,;] *[${CJK}]|\\([^()]*[${CJK}][^()]*\\)`);

describe('journal coach: the crisis reply (p9 Q32)', () => {
  it.each(LOCALES)('%s: the server’s lines are the crisis banner’s (the locale file is the source)', (lng) => {
    const s = crisisStrings(lng);
    expect(CRISIS_LINES[lng]).toEqual({
      phone: { title: s.phone.title, number: s.phone.number, body: s.phone.body },
      text: { title: s.text.title, number: s.text.number, body: s.text.body },
      footer: s.footer,
    });
  });

  it('the QA’s Japanese entry gets the Japanese lines, before any model call', () => {
    const reply = crisisShortcut('最近ずっと眠れない。もう消えたい。生きている意味がわからない。誰にも言えない。', 'ja');
    expect(reply?.crisis).toBe(true);
    const text = [reply!.observation, ...reply!.prompts].join('\n');
    expect(text).toContain('よりそいホットライン');
    expect(text).toContain('0120-279-338');
    expect(text).toContain('0570-064-556');
    expect(text).toContain('119');
    expect(text).not.toMatch(/988|741741/);
  });

  it('an ordinary entry goes on to the model', () => {
    expect(crisisShortcut('今日は友だちとカフェで話して、少し気持ちが軽くなった。', 'ja')).toBeNull();
    expect(crisisShortcut('I finally finished the painting I started in spring.', 'en')).toBeNull();
  });

  it.each(LOCALES)('%s: names both of the language’s lines, the emergency footer and findahelpline', (lng) => {
    const reply = journalCrisisReply(lng);
    const lines = CRISIS_LINES[lng];
    const text = [reply.observation, ...reply.prompts].join('\n');
    expect(reply.crisis).toBe(true);
    expect(reply.prompts).toHaveLength(3);
    expect(text).toContain(lines.phone.number);
    expect(text).toContain(lines.text.number);
    expect(reply.observation).toContain(lines.footer);
    expect(text).toContain('findahelpline.com');
    if (lng !== 'en') expect(text).not.toMatch(/988|741741/);
    expect(text).not.toMatch(/!/);
    if (lng === 'ja' || lng === 'zh') expect(text).not.toMatch(ASCII_MARK_BY_CJK);
  });

  it('the prompt carries no helpline of any country: the model answers {"crisis": true}', () => {
    expect(SYSTEM).not.toMatch(/988|741741|\d{3}-\d{3}/);
    expect(SYSTEM).toContain('{"crisis": true}');
  });

  it('reads the model’s crisis answer however it is wrapped', () => {
    expect(parseCoachReply('{"crisis": true}')).toEqual({ kind: 'crisis' });
    expect(parseCoachReply('```json\n{"crisis": true}\n```')).toEqual({ kind: 'crisis' });
    expect(parseCoachReply('Here you go: {"crisis":true}')).toEqual({ kind: 'crisis' });
    expect(parseCoachReply('{"crisis": true, "observation": 1')).toEqual({ kind: 'crisis' });
  });

  it('reads a reply, fenced or not, and nothing else', () => {
    const reply = { kind: 'reply', reply: { observation: 'You keep returning to the sea.', prompts: ['What does the sea hold for you?'] } };
    expect(parseCoachReply('{"observation": "You keep returning to the sea.", "prompts": ["What does the sea hold for you?"]}')).toEqual(reply);
    expect(parseCoachReply('```json\n{"observation": "You keep returning to the sea.", "prompts": ["What does the sea hold for you?"]}\n```')).toEqual(reply);
    expect(parseCoachReply('Just some prose with no JSON.')).toBeNull();
  });

  it.each(['ja', 'ko', 'zh'] as const)('%s: the fallback questions are in the member’s language', (lng) => {
    for (const q of fallbackPrompts(lng)) expect(q).not.toMatch(/[A-Za-z]/);
    if (lng !== 'ko') for (const q of fallbackPrompts(lng)) expect(q).not.toMatch(ASCII_MARK_BY_CJK);
  });
});
