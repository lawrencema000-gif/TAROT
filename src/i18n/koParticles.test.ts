import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import i18n, { koParticlesPostProcessor } from './config';

/*
 * p9 QT2: seventeen Korean values interpolate a word the string cannot know
 * (a card, a person, a theme, an element) and wrote the particle after it in
 * both forms — "{{name}}을(를) 삭제했어요" reached the member exactly so. The
 * ko post-processor in config.ts resolves each two-form marker against the
 * word in front of it once the value is interpolated.
 *
 * Each case below gives a word ending in a consonant (받침), one ending in a
 * vowel, and for (으)로 one ending in ㄹ (which takes 로). bazi.weakNote also
 * carried a fixed 이에요 after {{el}}: wrong for 화, 토 and 수 ("화이에요"), so
 * it is written (이)에요 now and resolved the same way (bazi.dominantNote, the
 * paragraph above it, likewise).
 */

const LOCALES = join(process.cwd(), 'src', 'i18n', 'locales');
const R = '— 이유';

type Vars = Record<string, string>;
const CASES: Array<[key: string, vars: Vars, expected: string]> = [
  ['cardMeaning.reinforcingIntro', { name: '연인', reason: R }, `연인이 이 카드들과 함께 나오면 리딩의 에너지가 강해져요 — ${R}`],
  ['cardMeaning.reinforcingIntro', { name: '마법사', reason: R }, `마법사가 이 카드들과 함께 나오면 리딩의 에너지가 강해져요 — ${R}`],
  ['cardMeaning.opposingIntro', { name: '연인', reason: R }, `이 카드들은 연인과 긴장을 만들어요 — ${R}`],
  ['cardMeaning.opposingIntro', { name: '마법사', reason: R }, `이 카드들은 마법사와 긴장을 만들어요 — ${R}`],
  ['cardMeaning.faqItems.combinationsQ', { name: '연인' }, '연인을 강화하거나 그와 대립하는 카드는 무엇인가요?'],
  ['cardMeaning.faqItems.combinationsQ', { name: '마법사' }, '마법사를 강화하거나 그와 대립하는 카드는 무엇인가요?'],
  ['cardMeaning.faqItems.yesNoQ', { name: '연인' }, '연인은 예/아니요 질문에 어떻게 답하나요?'],
  ['cardMeaning.faqItems.yesNoQ', { name: '마법사' }, '마법사는 예/아니요 질문에 어떻게 답하나요?'],
  ['premium.paywall.featureRequires', { feature: '궁합' }, '궁합은 프리미엄으로 열려요'],
  ['premium.paywall.featureRequires', { feature: '연간 리포트' }, '연간 리포트는 프리미엄으로 열려요'],
  ['settings.menu.themeChanged', { name: '미드나잇' }, '테마가 미드나잇으로 바뀌었어요'],
  ['settings.menu.themeChanged', { name: '다크' }, '테마가 다크로 바뀌었어요'],
  ['settings.menu.themeChanged', { name: '셀레스티얼' }, '테마가 셀레스티얼로 바뀌었어요'],
  ['library.deleteConfirmBody', { name: '오늘의 리딩' }, '라이브러리에서 오늘의 리딩이 삭제돼요. 이 작업은 되돌릴 수 없어요.'],
  ['library.deleteConfirmBody', { name: '켈틱 크로스' }, '라이브러리에서 켈틱 크로스가 삭제돼요. 이 작업은 되돌릴 수 없어요.'],
  ['errorBoundary.contentTitle', { type: '리딩' }, '리딩을 불러오지 못했어요'],
  ['errorBoundary.contentTitle', { type: '차트' }, '차트를 불러오지 못했어요'],
  [
    'bazi.weakNote',
    { el: '목', support: '수' },
    '당신의 가장 약한 원소는 목이에요 — 이곳을 더 받쳐 주면 당신이 자라요. 목을 키우려면 목을 낳는 수를 곁에 두세요.',
  ],
  [
    'bazi.weakNote',
    { el: '화', support: '목' },
    '당신의 가장 약한 원소는 화예요 — 이곳을 더 받쳐 주면 당신이 자라요. 화를 키우려면 화를 낳는 목을 곁에 두세요.',
  ],
  ['bazi.dominantNote', { el: '금' }, '당신의 주도 원소는 금이에요 — 가장 자연스러운 당신의 모습을 빚어요.'],
  ['bazi.dominantNote', { el: '토' }, '당신의 주도 원소는 토예요 — 가장 자연스러운 당신의 모습을 빚어요.'],
  [
    'bazi.excessNote',
    { el: '금', control: '화' },
    '금이 크게 넘쳐요. 그 그림자 표현을 주의하고, 금을 다스리는 화로 균형을 잡으세요.',
  ],
  [
    'bazi.excessNote',
    { el: '수', control: '목' },
    '수가 크게 넘쳐요. 그 그림자 표현을 주의하고, 수를 다스리는 목으로 균형을 잡으세요.',
  ],
  ['mood.pattern.heavierShift', { from: '평화', to: '슬픔' }, '이번 주는 더 무거웠어요 — 주된 무드가 평화에서 슬픔으로 바뀌었어요.'],
  ['mood.pattern.heavierShift', { from: '슬픔', to: '평화' }, '이번 주는 더 무거웠어요 — 주된 무드가 슬픔에서 평화로 바뀌었어요.'],
  ['mood.pattern.lighterShift', { from: '평화', to: '기쁨' }, '이번 주는 더 가벼웠어요 — 평화에서 기쁨으로 옮겨 갔어요.'],
  ['mood.pattern.lighterShift', { from: '슬픔', to: '평화' }, '이번 주는 더 가벼웠어요 — 슬픔에서 평화로 옮겨 갔어요.'],
  ['mood.pattern.lighterShift', { from: '슬픔', to: '하늘' }, '이번 주는 더 가벼웠어요 — 슬픔에서 하늘로 옮겨 갔어요.'],
  ['people.form.added', { name: '지민' }, '지민을 추가했어요'],
  ['people.form.added', { name: '지우' }, '지우를 추가했어요'],
  ['people.detail.deleted', { name: '지민' }, '지민을 삭제했어요'],
  ['people.detail.deleted', { name: '지우' }, '지우를 삭제했어요'],
  ['people.detail.deleteFailed', { name: '지민' }, '지민을 삭제하지 못했어요 — 다시 시도해 주세요.'],
  ['people.detail.deleteFailed', { name: '지우' }, '지우를 삭제하지 못했어요 — 다시 시도해 주세요.'],
  ['people.detail.deleteTitle', { name: '지민' }, '지민을 삭제할까요?'],
  ['people.detail.deleteTitle', { name: '지우' }, '지우를 삭제할까요?'],
  ['spreadBuilder.deleteTitle', { name: '아침 점검' }, '아침 점검을 삭제할까요?'],
  ['spreadBuilder.deleteTitle', { name: '나의 스프레드' }, '나의 스프레드를 삭제할까요?'],
  // Siblings that wrote one fixed form after a word that varies: a card name
  // ("연인를"), an element ("공기이라고"), a search query ("“점성술”와").
  ['tarot.experienceInReading', { name: '연인' }, '리딩에서 연인을 만나보세요'],
  ['tarot.experienceInReading', { name: '마법사' }, '리딩에서 마법사를 만나보세요'],
  ['tarotCompanion.seedMessage', { card: '연인' }, '방금 연인을 뽑았어요. 지금 이것이 무엇을 가리키는지 함께 머물며 살펴보게 도와줘요.'],
  ['tarotCompanion.seedMessage', { card: '마법사' }, '방금 마법사를 뽑았어요. 지금 이것이 무엇을 가리키는지 함께 머물며 살펴보게 도와줘요.'],
  // The reversed label's gloss is looked through: the particle agrees with 연인.
  ['tarotCompanion.seedMessage', { card: '연인(역방향)' }, '방금 연인(역방향)을 뽑았어요. 지금 이것이 무엇을 가리키는지 함께 머물며 살펴보게 도와줘요.'],
  ['quizzes.elements.differNote', { natal: '불', behaviour: '공기' }, '차트는 불이라고 하지만 행동은 공기라고 해요 — 어디서 자신을 늘리고 있는지 살펴볼 만해요.'],
  ['quizzes.elements.differNote', { natal: '공기', behaviour: '흙' }, '차트는 공기라고 하지만 행동은 흙이라고 해요 — 어디서 자신을 늘리고 있는지 살펴볼 만해요.'],
  ['learn.glossary.search.noMatchDesc', { query: '타로' }, '용어집에 “타로”와 일치하는 항목이 없어요. 더 짧은 단어로 찾아보세요.'],
  ['learn.glossary.search.noMatchDesc', { query: '점성술' }, '용어집에 “점성술”과 일치하는 항목이 없어요. 더 짧은 단어로 찾아보세요.'],
];

/**
 * The seventeen values the request names, plus the siblings whose one fixed
 * form is now a marker too (bazi.dominantNote's 이에요, and the four above):
 * every ko value with a two-form marker.
 */
const MARKED = [
  'bazi.dominantNote',
  'tarot.experienceInReading',
  'tarotCompanion.seedMessage',
  'quizzes.elements.differNote',
  'learn.glossary.search.noMatchDesc',
  'cardMeaning.reinforcingIntro',
  'cardMeaning.opposingIntro',
  'cardMeaning.faqItems.combinationsQ',
  'cardMeaning.faqItems.yesNoQ',
  'premium.paywall.featureRequires',
  'settings.menu.themeChanged',
  'library.deleteConfirmBody',
  'errorBoundary.contentTitle',
  'bazi.weakNote',
  'bazi.excessNote',
  'mood.pattern.heavierShift',
  'mood.pattern.lighterShift',
  'people.form.added',
  'people.detail.deleted',
  'people.detail.deleteFailed',
  'people.detail.deleteTitle',
  'spreadBuilder.deleteTitle',
];

const DUAL = /이\(가\)|가\(이\)|을\(를\)|를\(을\)|은\(는\)|는\(은\)|과\(와\)|와\(과\)|\(으\)로|\(이\)(?:에요|라는|라고|나|랑|며)/;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
function strings(node: Json, path: string, out: Array<[string, string]>): Array<[string, string]> {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}.${i}`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out);
  return out;
}
function bundle(lng: string, file: string): Json {
  return JSON.parse(readFileSync(join(LOCALES, lng, file), 'utf8'));
}
function get(node: Json, path: string): Json {
  return path.split('.').reduce<Json>((n, k) => (n as Record<string, Json>)[k], node);
}
const interpolate = (raw: string, vars: Vars) => raw.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k]);

describe('Korean two-form particles resolve against the word put in front of them', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ko');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('these are every ko value with a two-form marker, and every one is covered below', () => {
    const marked: string[] = [];
    for (const file of readdirSync(join(LOCALES, 'ko')).filter((f) => f.endsWith('.json'))) {
      const prefix = file === 'app.json' ? '' : `${file}:`;
      for (const [path, value] of strings(bundle('ko', file), '', [])) if (DUAL.test(value)) marked.push(prefix + path);
    }
    expect(marked.sort()).toEqual([...MARKED].sort());
    expect([...new Set(CASES.map(([k]) => k))].sort()).toEqual([...MARKED].sort());
  });

  it.each(CASES)('%s with %j', (key, vars, expected) => {
    const out = i18n.t(`app:${key}`, vars);
    expect(out).toBe(expected);
    expect(out).not.toMatch(DUAL);
  });

  it('a word whose last sound is unknown (a Latin name) keeps both forms rather than a wrong one', () => {
    expect(i18n.t('app:people.form.added', { name: 'Jane' })).toBe('Jane을(를) 추가했어요');
    // A number is read the Sino-Korean way: 3 = 삼, which ends in ㅁ.
    expect(i18n.t('app:spreadBuilder.deleteTitle', { name: 'Spread 3' })).toBe('Spread 3을 삭제할까요?');
  });

  it('getFixedT("ko") resolves them from another UI language too', async () => {
    await i18n.changeLanguage('en');
    try {
      const tKo = i18n.getFixedT('ko', 'app');
      expect(tKo('people.detail.deleted', { name: '지우' })).toBe('지우를 삭제했어요');
    } finally {
      await i18n.changeLanguage('ko');
    }
  });
});

describe('nothing else changes', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each(['en', 'ja', 'zh'] as const)('%s renders the same keys exactly as interpolated', async (lng) => {
    await i18n.changeLanguage(lng);
    const app = bundle(lng, 'app.json');
    for (const [key, vars] of CASES) {
      const raw = get(app, key) as string;
      expect(i18n.t(`app:${key}`, vars), `${lng} ${key}`).toBe(interpolate(raw, vars));
    }
  });

  it('no value of any language comes back changed, except a Korean one with a two-form marker', () => {
    const changed: string[] = [];
    for (const lng of ['en', 'ja', 'ko', 'zh']) {
      for (const file of readdirSync(join(LOCALES, lng)).filter((f) => f.endsWith('.json'))) {
        for (const [path, value] of strings(bundle(lng, file), '', [])) {
          const out = koParticlesPostProcessor.process(value, path, { lng }, i18n);
          const mayChange = lng === 'ko' && DUAL.test(value);
          if (!mayChange && out !== value) changed.push(`${lng}/${file} ${path}`);
        }
      }
    }
    expect(changed).toEqual([]);
  });

  it('follows the language of the call, then the language on screen', () => {
    const marked = '{{x}}을(를)'.replace('{{x}}', '지우');
    expect(koParticlesPostProcessor.process(marked, 'k', { lng: 'ja' }, { language: 'ko' })).toBe(marked);
    expect(koParticlesPostProcessor.process(marked, 'k', { lng: 'ko-KR' }, { language: 'en' })).toBe('지우를');
    expect(koParticlesPostProcessor.process(marked, 'k', {}, { language: 'ko' })).toBe('지우를');
    expect(koParticlesPostProcessor.process(marked, 'k', {}, { language: 'en' })).toBe(marked);
  });
});
