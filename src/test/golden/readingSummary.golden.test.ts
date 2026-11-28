import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../../i18n/config';
import type { SupportedLocale } from '../../i18n/config';
import { fullDeck } from '../../data/tarotDeck';
import { getSpreadBySlug } from '../../data/tarotSpreads';
import { drawSeededCards } from '../../utils/cardDraw';
import {
  isReadingSummaryReady,
  preloadReadingSummary,
  setSummaryDeck,
  summarizeSingle,
  summarizeTarot,
  TAROT_ROLES,
  type ReadingSummary,
  type SummaryInput,
} from '../../lib/readingSummary';
import { essenceOf } from '../../lib/readingSummary/essence';

/*
 * WP-NF-02: the reading-summary engine's fixed sample readings (F1–F8) and
 * its invariants over every spread.
 *
 * The English is the reference prototype's output
 * (SP/features/tools/summary-prototype.mjs → SP/features/_samples.json),
 * except where the package's Change design adds a line the prototype's
 * generic path did not compute (F4's element run; see .wp/progress.md).
 * ja, ko and zh are pinned as inline snapshots, read line by line by the
 * implementer and checked by a fresh review agent before they ship
 * (standing rule 5).
 */

const LOCALES_DIR = join(process.cwd(), 'src', 'i18n', 'locales');
const OTHERS = ['ja', 'ko', 'zh'] as const;
const ALL: SupportedLocale[] = ['en', 'ja', 'ko', 'zh'];
const readJson = (lng: string, file: string) => JSON.parse(readFileSync(join(LOCALES_DIR, lng, `${file}.json`), 'utf8'));

beforeAll(async () => {
  setSummaryDeck(fullDeck);
  for (const lng of OTHERS) {
    for (const ns of ['tarot', 'cartomancy']) i18n.addResourceBundle(lng, ns, readJson(lng, ns), true, true);
  }
  for (const lng of ALL) await preloadReadingSummary(lng);
});

// ── Position labels as the reading screen shows them ──────────────────

const LEGACY_KEY: Record<string, string> = {
  single: 'single',
  quick: 'single',
  'one-card-daily': 'single',
  'three-card': 'threeCard',
  'three-card-past-present-future': 'threeCard',
  'relationship-cross': 'relationship',
  'celtic-cross': 'celticCross',
  relationship: 'relationship',
  career: 'career',
  shadow: 'shadow',
};

function labelsFor(spreadId: string, n: number, lng: SupportedLocale): string[] {
  const app = readJson(lng, 'app');
  const legacy = LEGACY_KEY[spreadId];
  if (legacy) return (app.readings.spreadPositions[legacy] as string[]).slice(0, n);
  const spread = getSpreadBySlug(spreadId);
  if (spread) {
    // tarotPositionLabel: spreads.catalog.<slug>.positions.<i>, else the English name.
    const tr = app.spreads?.catalog?.[spread.slug]?.positions as Record<string, string> | undefined;
    return spread.positions.slice(0, n).map((p, i) => tr?.[String(i)] ?? p.name);
  }
  return Array.from({ length: n }, (_, i) => String(app.readings.positions.generic).replace('{{index}}', String(i + 1)));
}

function input(spreadId: string, cards: Array<[number, boolean]>, lng: SupportedLocale, extra: Partial<SummaryInput> = {}): SummaryInput {
  return {
    spreadId,
    cards: cards.map(([id, reversed]) => ({ id, reversed })),
    positionLabels: labelsFor(spreadId, cards.length, lng),
    locale: lng,
    ...extra,
  };
}

/** The summary as plain text, one line each, for the snapshots. */
function text(s: ReadingSummary): string {
  const out = ['SHORT', ...s.short.map((x) => `  ${x}`)];
  for (const p of s.parts) out.push(`${p.key} · ${p.heading}`, ...p.lines.map((x) => `  ${x}`));
  out.push(`quotesAffirmationOf: ${s.quotesAffirmationOf}`);
  return out.join('\n');
}

function timed<T>(label: string, f: () => T): T {
  const t0 = performance.now();
  const r = f();
  // One measure per fixture (A12); the target is under 5 ms on a mid-range phone. Not asserted.
  console.info(`[readingSummary] ${label}: ${(performance.now() - t0).toFixed(2)} ms`);
  return r;
}

// ── The fixtures ───────────────────────────────────────────────────────

const F1: Array<[number, boolean]> = [
  [37, false], [26, false], [18, false], [52, true], [17, false], [41, false], [33, true], [48, false], [40, false], [45, false],
];
/** F1 with card 7 ("Your attitude", the Knight of Wands) upright: its advice sits inside the third short sentence. */
const F1_UPRIGHT_7: Array<[number, boolean]> = F1.map(([id], i) => [id, i === 6 ? false : F1[i][1]]);
const F4: Array<[number, boolean]> = [[16, false], [52, true], [17, false]];
const F5: Array<[number, boolean]> = [[59, false], [44, false], [3, false], [27, true]];
const F5_LABELS = ['What I fear', 'What I want', 'What helps', 'Where it goes'];
const F6: Array<[number, boolean]> = [[37, false], [19, false], [17, false]];

const fixtures = {
  F1: (lng: SupportedLocale) => summarizeTarot(input('celtic-cross', F1, lng)),
  F1u: (lng: SupportedLocale) => summarizeTarot(input('celtic-cross', F1_UPRIGHT_7, lng)),
  F2: (lng: SupportedLocale) => summarizeSingle({ deck: 'tarot', id: 0, reversed: false, locale: lng }),
  F3: (lng: SupportedLocale) => summarizeSingle({ deck: 'tarot', id: 52, reversed: true, locale: lng }),
  F4: (lng: SupportedLocale) => summarizeTarot(input('three-card', F4, lng)),
  F5: (lng: SupportedLocale) =>
    summarizeTarot({ ...input('custom:0b9f2c1e', F5, lng), positionLabels: F5_LABELS }),
  F6: (lng: SupportedLocale) => summarizeTarot(input('love-yes-no', F6, lng, { answer: { label: lng === 'en' ? 'Leaning yes' : ANSWER[lng] } })),
  F7: (lng: SupportedLocale) => summarizeTarot(input('quick', [[71, false]], lng)),
  F8: (lng: SupportedLocale) => summarizeSingle({ deck: 'playing', id: 100, reversed: false, locale: lng }),
};
/** A Yes/No label as WP-P1-02 will pass it; the engine only prints it. */
const ANSWER: Record<string, string> = { ja: 'どちらかといえばイエス', ko: '예에 가까워요', zh: '倾向于是' };

describe('the loader', () => {
  it('reports every language ready once preloaded', () => {
    for (const lng of ALL) expect(isReadingSummaryReady(lng), lng).toBe(true);
  });
});

describe('F1–F8 in English (the prototype’s golden text)', () => {
  it('F1, the Celtic Cross', () => {
    const s = timed('F1 en', () => fixtures.F1('en'));
    expect(s.short).toEqual(GOLDEN_EN.celtic.short);
    expect(s.parts).toEqual(GOLDEN_EN.celtic.parts);
    expect(s.parts.map((p) => p.lines.length)).toEqual([13, 8, 5, 1, 2]);
    expect(s.quotesAffirmationOf).toBe(6);
  });

  it('F1 with card 7 upright keeps the advice lowercase inside the sentence', () => {
    const s = fixtures.F1u('en');
    expect(s.short[2]).toBe(
      'Your attitude is the card you can change: the Knight of Wands advises, in its own words: “I act boldly and learn as I go.”',
    );
    expect(s.quotesAffirmationOf).toBe(6);
  });

  it('F2, The Fool upright alone', () => {
    const s = timed('F2 en', () => fixtures.F2('en'));
    expect(s.short).toEqual(GOLDEN_EN.fool.short);
    expect(s.parts).toEqual(GOLDEN_EN.fool.parts);
    expect(s.quotesAffirmationOf).toBe(0);
    // The single spread reads the same.
    expect(summarizeTarot(input('single', [[0, false]], 'en'))).toEqual(s);
  });

  it('F3, the Three of Swords reversed alone', () => {
    const s = timed('F3 en', () => fixtures.F3('en'));
    expect(s.short).toEqual(GOLDEN_EN.swordsRev.short);
    expect(s.parts).toEqual(GOLDEN_EN.swordsRev.parts);
  });

  it('F4, three cards', () => {
    const s = timed('F4 en', () => fixtures.F4('en'));
    expect(s.short).toEqual(GOLDEN_EN.threeTarot.short);
    const golden = GOLDEN_EN.threeTarot.parts.map((p) =>
      p.key === 'patterns'
        ? // A7's element run, which the prototype's generic path did not compute.
          { ...p, lines: [p.lines[0], 'Air runs through two of the three cards, The Star included.', ...p.lines.slice(1)] }
        : p,
    );
    expect(s.parts).toEqual(golden);
    expect(s.parts.find((p) => p.key === 'connections')?.lines).toContain(
      'Present and Future: the Three of Swords (reversed) and The Star are both Air, and strengthen each other.',
    );
  });

  it('F5, a custom spread of four steps', () => {
    const s = timed('F5 en', () => fixtures.F5('en'));
    expect(s.short).toEqual(GOLDEN_EN.custom.short);
    expect(s.parts).toEqual(GOLDEN_EN.custom.parts);
    expect(s.parts.some((p) => p.key === 'turning')).toBe(false);
  });

  it('F6, Love Yes/No with its answer', () => {
    const s = timed('F6 en', () => fixtures.F6('en'));
    expect(s.short[0]).toBe('The answer: Leaning yes.');
    // The Sun's essence on main (its meaning opens "Joy, success, celebration, positivity.").
    expect(s.short[1]).toBe('The answer: The Sun — joy and success.');
    expect(s.short[2]).toBe('The Sun advises, in its own words: “I let myself be seen in full light.”');
    expect(s.quotesAffirmationOf).toBe(1);
  });

  it('F7, the quick reading’s tarot card', () => {
    const s = timed('F7 en', () => fixtures.F7('en'));
    expect(s.short).toEqual(GOLDEN_EN.eight.short);
    expect(s.parts).toEqual(GOLDEN_EN.eight.parts);
  });

  it('F8, the quick reading’s playing card', () => {
    const s = timed('F8 en', () => fixtures.F8('en'));
    expect(s.short).toEqual([
      'The Ace of Hearts: a new warmth has arrived.',
      'In layers: Hearts for feeling, the Ace for beginnings, red for ease and warmth.',
      'The advice: “Say the warm thing out loud. Begin with the heart, then let the plan follow.”',
    ]);
  });
});

describe('F1–F8 in ja, ko and zh', () => {
  it('F1 names its cards as the overlay does', () => {
    const ja = text(fixtures.F1('ja'));
    expect(ja).toContain('カップの2');
    expect(ja).toContain('「月」');
    const ko = text(fixtures.F1('ko'));
    expect(ko).toContain('컵 2');
    expect(ko).toContain('달');
    const zh = text(fixtures.F1('zh'));
    expect(zh).toContain('圣杯二');
    expect(zh).toContain('月亮');
  });

  for (const lng of OTHERS) {
    it(`${lng}: every fixture has the shape of its English`, () => {
      for (const [name, f] of Object.entries(fixtures)) {
        const en = f('en');
        const tr = timed(`${name} ${lng}`, () => f(lng));
        expect(tr.short.length, `${name} short`).toBe(en.short.length);
        expect(tr.parts.map((p) => [p.key, p.lines.length]), `${name} parts`).toEqual(en.parts.map((p) => [p.key, p.lines.length]));
        expect(tr.quotesAffirmationOf, name).toBe(en.quotesAffirmationOf);
      }
    });
  }

  it('F1 with card 7 upright: the embedded advice in ja, ko and zh', () => {
    expect(fixtures.F1u('ja').short[2]).toMatchInlineSnapshot(`"変えられるカードは「あなたの態度」です：ワンドのナイトは自分の言葉でこう助言します：「私は大胆に動き、進みながら学びます。」"`);
    expect(fixtures.F1u('ko').short[2]).toMatchInlineSnapshot(`"바꿀 수 있는 카드는 ‘당신의 태도’예요: 완드 기사는 이렇게 조언해요: “대담하게 행동하고, 나아가며 배운다.”"`);
    expect(fixtures.F1u('zh').short[2]).toMatchInlineSnapshot(`"你能改变的那张牌是“你的态度”：权杖骑士用它自己的话建议：“我大胆行动，边走边学。”"`);
  });

  // Pinned after the implementer read each one; a fresh review agent checks them before they ship.
  it('F1 ja', () => {
    expect(text(fixtures.F1('ja'))).toMatchInlineSnapshot(`
      "SHORT
        このリーディングの中心はカップの2——統合された愛とパートナーシップ。それをワンドの5が横切っています：対立と意見の相違。
        このまま何も変わらなければ、カップの10へ向かいます：神聖な愛と調和のとれた家族。
        変えられるカードは「あなたの態度」です：ワンドのナイト（逆位置）の場合、道は正位置の言葉にあります：「私は大胆に動き、進みながら学びます。」
      story · 位置ごとに
        十字の部分（1〜6枚目）は、状況そのものです。
        現在の状況：カップの2——統合された愛とパートナーシップ。
        課題または障害：ワンドの5——対立と意見の相違。
        無意識の影響：「月」——幻想と恐れ。
        近い過去：ソードの3（逆位置）——失恋からの回復と赦し。
        最良の結果：「星」——希望と再生。
        近い未来：カップの6——郷愁と幼少期の思い出。
        杖の部分（7〜10枚目）は、あなた自身、まわりの世界、そして行き着く先です。
        あなたの態度：ワンドのナイト（逆位置）——慌てと散漫なエネルギー。
        外的影響：カップのクイーン——思いやりと感情的な成熟。
        希望と恐れ：カップの5——後悔と喪失。
        最終結果：カップの10——神聖な愛と調和のとれた家族。
        時の流れで読むと、失恋からの回復から統合された愛を経て、神聖な愛へと進みます。
      connections · カード同士のつながり
        タロットのエレメンタル・ディグニティでは、同じエレメントのカードは互いを強め合い、火と水、風と地は互いに引っぱり合います。
        現在の状況と課題または障害：カップの2（水）とワンドの5（火）は互いに引っぱり合っています。
        あなたの態度と最終結果：ワンドのナイト（火、逆位置）とカップの10（水）は互いに引っぱり合っています。
        近い未来と最終結果：カップの6とカップの10はどちらも水のカードで、互いを強め合います。
        カップの2自身の解説では、カップの10がこのカードを強めます：「いずれも、結びつき、パートナーシップ、そしてふたつの心が互いを認め合いながら喜びのうちにひとつになることを祝福します。」
        カップの2自身の解説では、カップの5がこのカードに逆らいます：「失恋、悲しみ、束縛、あるいはむなしい争いによって、結びつきをゆがめたり壊したりします。」
        5が2枚（ワンドの5、カップの5）、同じテーマを繰り返しています：安定していたものを揺るがす摩擦と喪失。
        2枚のコートカードが、物語に人物を連れてきます：あなたの態度のワンドのナイト（逆位置）、外的影響のカップのクイーン。
      patterns · 目立つこと
        「月」、「星」がより大きなテーマを示し、ほかの8枚は、それらが日々の中でどう展開するかを示します。
        カップが10枚中5枚で優勢です：このリーディングの本当の主題は感情と人間関係です。
        「月」を含め、10枚中6枚に水のエレメントが流れています。
        ペンタクルがありません：お金、仕事、からだのことは今は静かです。
        ソードの3、ワンドのナイトが逆位置です：抑えられている、遅れている、または内に向いているものとして読みます。
      turning · 転換点
        「課題または障害」が転換点です：ワンドの5——対立と意見の相違。このスプレッドは、このカードをほかのすべてに作用する緊張として読みます。ときには障害であり、ときには状況に形を与えるものそのものです。
      todo · どうすればよいか
        「あなたの態度」は、あなたが変えられるカードです。「最終結果」は予報であって判決ではありません：「あなたの態度」か「希望と恐れ」のどこかを変えれば、その瞬間に変わります。
        心にとめておく問い：真のパートナーシップは私にとって何を意味するか？
      quotesAffirmationOf: 6"
    `);
  });

  it('F2 ja', () => {
    expect(text(fixtures.F2('ja'))).toMatchInlineSnapshot(`
      "SHORT
        「愚者」：新しい始まりと無邪気さ。
        愚者は無限の可能性と旅の始まりを象徴します。
        「愚者」は自分の言葉でこう助言します：「私は、準備ができたと感じる前に一歩を踏み出します。」
      layers · カードを層ごとに
        大アルカナ、風：日々の細部だけでなく、人生のより大きなテーマです。
        正位置：そのままに読みます。
      todo · どうすればよいか
        心にとめておく問い：私はどんな新しい始まりへ呼ばれているのか？
      quotesAffirmationOf: 0"
    `);
  });

  it('F3 ja', () => {
    expect(text(fixtures.F3('ja'))).toMatchInlineSnapshot(`
      "SHORT
        ソードの3（逆位置）：失恋からの回復と赦し。
        剣が抜かれ、癒しが始まるか、感じるべき痛みを感じることを拒否しています。
        ソードの3（逆位置）の場合、道は正位置の言葉にあります：「癒えていけるように、私は痛みをしっかりと感じます。」
      layers · カードを層ごとに
        ソード、風：思考、言葉、真実。
        3：成長、そして加わってくる人々。
        逆位置：抑えられている、遅れている、または内に向いているものとして読みます。
      todo · どうすればよいか
        心にとめておく問い：私が認めなければならない痛ましい真実は何か？
      quotesAffirmationOf: 0"
    `);
  });

  it('F4 ja', () => {
    expect(text(fixtures.F4('ja'))).toMatchInlineSnapshot(`
      "SHORT
        今のあなたの位置はソードの3（逆位置）です：失恋からの回復と赦し。
        それは「塔」（突然の激動と啓示）から育ち、「星」へ向かっています：希望と再生。
        ソードの3（逆位置）の場合、道は正位置の言葉にあります：「癒えていけるように、私は痛みをしっかりと感じます。」
      story · 位置ごとに
        過去：「塔」——突然の激動と啓示。
        現在：ソードの3（逆位置）——失恋からの回復と赦し。
        未来：「星」——希望と再生。
        時の流れで読むと、突然の激動から失恋からの回復を経て、希望へと進みます。
      connections · カード同士のつながり
        タロットのエレメンタル・ディグニティでは、同じエレメントのカードは互いを強め合い、火と水、風と地は互いに引っぱり合います。
        現在と未来：ソードの3（逆位置）と「星」はどちらも風のカードで、互いを強め合います。
        「塔」自身の解説では、「星」がこのカードに逆らいます：「安定、安らげる場所、そして長く続く完成を表します——壊滅的な激変とは正反対です。」
      patterns · 目立つこと
        3枚のうち2枚が大アルカナです（「塔」、「星」）：日々の細部だけでなく、より大きな転機が動いています。
        「星」を含め、3枚中2枚に風のエレメントが流れています。
        ソードの3が逆位置です：抑えられている、遅れている、または内に向いているものとして読みます。
      turning · 転換点
        「現在」が要です：ソードの3（逆位置）——失恋からの回復と赦し。ほかのカードはこの一枚に照らして読みます。
      todo · どうすればよいか
        心にとめておく問い：私が認めなければならない痛ましい真実は何か？
      quotesAffirmationOf: 1"
    `);
  });

  it('F5 ja', () => {
    expect(text(fixtures.F5('ja'))).toMatchInlineSnapshot(`
      "SHORT
        ソードの10から始まります：痛ましい終わりと裏切り。
        ワンドの6（逆位置）で終わります：個人的な達成と遅れた認識。
        ワンドの6（逆位置）の場合、道は正位置の言葉にあります：「私は、自分が勝ち取ったものへの評価を素直に受け取ります。」
      story · 位置ごとに
        What I fear：ソードの10——痛ましい終わりと裏切り。
        What I want：カップの9——満足と充足。
        What helps：「女帝」——女性性と美。
        Where it goes：ワンドの6（逆位置）——個人的な達成と遅れた認識。
        順に読むと、痛ましい終わりから個人的な達成へと進みます。
      patterns · 目立つこと
        「女帝」がより大きなテーマを示し、ほかの3枚は、それが日々の中でどう展開するかを示します。
        ワンドの6が逆位置です：抑えられている、遅れている、または内に向いているものとして読みます。
      todo · どうすればよいか
        心にとめておく問い：私が主張し祝う準備ができている勝利は何か？
      quotesAffirmationOf: 3"
    `);
  });

  it('F6 ja', () => {
    expect(text(fixtures.F6('ja'))).toMatchInlineSnapshot(`
      "SHORT
        答え：どちらかといえばイエス。
        答え：「太陽」——喜びと成功。
        「太陽」は自分の言葉でこう助言します：「私は、まばゆい光のなかで、ありのままの自分を見せます。」
      story · 位置ごとに
        問いのエネルギー：カップの2——統合された愛とパートナーシップ。
        答え：「太陽」——喜びと成功。
        答えについて知っておきたいこと：「星」——希望と再生。
        順に読むと、統合された愛から希望へと進みます。
      connections · カード同士のつながり
        タロットのエレメンタル・ディグニティでは、同じエレメントのカードは互いを強め合い、火と水、風と地は互いに引っぱり合います。
        問いのエネルギーと答え：カップの2（水）と「太陽」（火）は互いに引っぱり合っています。
        「星」自身の解説では、「太陽」がこのカードを強めます：「いずれも、希望、再生、癒し、そして困難のあとに信じる心がやさしく目覚め直すことを体現しています。」
      patterns · 目立つこと
        3枚のうち2枚が大アルカナです（「太陽」、「星」）：日々の細部だけでなく、より大きな転機が動いています。
      todo · どうすればよいか
        心にとめておく問い：真のパートナーシップは私にとって何を意味するか？
      quotesAffirmationOf: 1"
    `);
  });

  it('F7 ja', () => {
    expect(text(fixtures.F7('ja'))).toMatchInlineSnapshot(`
      "SHORT
        ペンタクルの8：見習いとスキル開発。
        ペンタクルの8は能力を磨く満足、優秀さに必要な集中、訓練された仕事の価値を表します。
        ペンタクルの8は自分の言葉でこう助言します：「私は挑戦するたびに、腕を上げていきます。」
      layers · カードを層ごとに
        ペンタクル、地：仕事、お金、からだ。
        8：動きと努力。
        正位置：そのままに読みます。
      todo · どうすればよいか
        心にとめておく問い：私が開発しているスキルは何か？
      quotesAffirmationOf: 0"
    `);
  });

  it('F8 ja', () => {
    expect(text(fixtures.F8('ja'))).toMatchInlineSnapshot(`
      "SHORT
        ハートのエース：新しい温もりが訪れています。
        層ごとに読むと：ハートは「感じる」こと、エースは始まり、赤は気楽さと温かさ。
        助言：「温かい気持ちを、声に出して伝えてください。まず心から始めて、計画はあとからついてくるに任せましょう。」
      todo · どうすればよいか
        心にとめておく問い：あなたの人生のどこで、何かが静かに開かれたでしょうか。それを迎え入れるには、何が必要でしょうか？
      quotesAffirmationOf: null"
    `);
  });

  it('F1 ko', () => {
    expect(text(fixtures.F1('ko'))).toMatchInlineSnapshot(`
      "SHORT
        이 리딩의 중심은 컵 2예요 — 통합된 사랑과 파트너십. 그 위를 완드 5가 가로질러요: 갈등과 의견 불일치.
        아무것도 바뀌지 않으면 컵 10으로 기울어요: 신성한 사랑과 조화로운 가족.
        바꿀 수 있는 카드는 ‘당신의 태도’예요: 완드 기사(역방향)의 경우, 길은 정방향의 말에 있어요: “대담하게 행동하고, 나아가며 배운다.”
      story · 자리별로
        십자 부분(1~6번째 카드)은 상황 그 자체예요.
        현재 상황: 컵 2 — 통합된 사랑과 파트너십.
        도전 또는 장애: 완드 5 — 갈등과 의견 불일치.
        무의식적 영향: 달 — 환상과 두려움.
        최근 과거: 소드 3(역방향) — 실연으로부터의 회복과 용서.
        최선의 결과: 별 — 희망과 재생.
        가까운 미래: 컵 6 — 향수와 어린 시절 추억.
        지팡이 부분(7~10번째 카드)은 당신 자신, 당신을 둘러싼 세상, 그리고 그것이 향하는 곳이에요.
        당신의 태도: 완드 기사(역방향) — 성급함과 흩어진 에너지.
        외부 영향: 컵 여왕 — 자비와 감정적 성숙.
        희망과 두려움: 컵 5 — 후회와 상실.
        최종 결과: 컵 10 — 신성한 사랑과 조화로운 가족.
        시간 순으로 읽으면 실연으로부터의 회복에서 통합된 사랑을 거쳐 신성한 사랑으로 나아가요.
      connections · 카드끼리의 연결
        타로의 원소 품위(엘리멘탈 디그니티)에서는 같은 원소의 카드끼리 서로를 강하게 하고, 불과 물, 공기와 흙은 서로 반대쪽으로 당겨요.
        현재 상황과 도전 또는 장애: 컵 2(물)와 완드 5(불)는 서로 반대쪽으로 당겨요.
        당신의 태도와 최종 결과: 완드 기사(불, 역방향)와 컵 10(물)은 서로 반대쪽으로 당겨요.
        가까운 미래와 최종 결과: 컵 6과 컵 10은 둘 다 물의 카드라서 서로를 강하게 해요.
        컵 2 자신의 설명에 따르면, 컵 10은 이 카드를 강하게 해요: “모두 결합과 파트너십, 그리고 서로를 알아보며 두 마음이 기쁘게 하나 되는 것을 노래해요.”
        컵 2 자신의 설명에 따르면, 컵 5는 이 카드와 반대로 작용해요: “상심, 슬픔, 속박, 혹은 공허한 갈등으로 결합을 일그러뜨리거나 깨뜨려요.”
        5 카드 2장(완드 5, 컵 5)이 같은 주제를 되풀이해요: 안정되어 있던 것을 흔드는 마찰과 상실.
        코트 카드 2장이 이야기 속에 사람들을 데려와요: 당신의 태도의 완드 기사(역방향), 외부 영향의 컵 여왕.
      patterns · 눈에 띄는 점
        달, 별이 더 큰 주제들을 보여 주고, 나머지 8장은 그것들이 일상에서 어떻게 펼쳐지는지 보여 줘요.
        컵이 10장 중 5장으로 앞서요: 이 리딩은 사실 감정과 관계에 관한 것이에요.
        달을 포함해, 10장 중 6장에 물의 원소가 흐르고 있어요.
        펜타클이 없어요: 돈, 일, 몸에 관한 일은 지금 조용해요.
        소드 3, 완드 기사는 역방향이에요: 막혀 있거나, 늦어지거나, 안으로 향한 것으로 읽어요.
      turning · 전환점
        ‘도전 또는 장애’가 전환점이에요: 완드 5 — 갈등과 의견 불일치. 이 스프레드는 이 카드를 다른 모든 것에 작용하는 긴장으로 읽어요. 때로는 장애물이고, 때로는 상황에 모양을 주는 바로 그것이에요.
      todo · 어떻게 하면 좋을까요
        ‘당신의 태도’는 당신이 바꿀 수 있는 카드예요. ‘최종 결과’는 판결이 아니라 예보예요: ‘당신의 태도’나 ‘희망과 두려움’에서 무엇이든 바꾸는 순간 달라져요.
        마음에 품을 질문: 진정한 파트너십은 내게 무엇을 의미하는가?
      quotesAffirmationOf: 6"
    `);
  });

  it('F2 ko', () => {
    expect(text(fixtures.F2('ko'))).toMatchInlineSnapshot(`
      "SHORT
        바보: 새로운 시작과 순수함.
        바보는 무한한 가능성과 여정의 시작을 상징합니다.
        바보는 이렇게 조언해요: “준비됐다고 느끼기 전에 앞으로 한 걸음 내딛는다.”
      layers · 카드를 한 겹씩
        메이저 아르카나, 공기: 일상의 세부만이 아니라 삶의 더 큰 주제예요.
        정방향: 있는 그대로 읽어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 나는 어떤 새로운 시작으로 부름받고 있는가?
      quotesAffirmationOf: 0"
    `);
  });

  it('F3 ko', () => {
    expect(text(fixtures.F3('ko'))).toMatchInlineSnapshot(`
      "SHORT
        소드 3(역방향): 실연으로부터의 회복과 용서.
        검이 제거되고 치유가 시작되거나, 느껴야 할 고통을 느끼기를 거부하고 있습니다.
        소드 3(역방향)의 경우, 길은 정방향의 말에 있어요: “아픔이 아물 수 있도록, 그 아픔을 느끼게 둔다.”
      layers · 카드를 한 겹씩
        소드, 공기: 생각, 말, 진실.
        3: 성장, 그리고 함께하는 사람들.
        역방향: 막혀 있거나, 늦어지거나, 안으로 향한 것으로 읽어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 내가 인정해야 할 고통스러운 진실은 무엇인가?
      quotesAffirmationOf: 0"
    `);
  });

  it('F4 ko', () => {
    expect(text(fixtures.F4('ko'))).toMatchInlineSnapshot(`
      "SHORT
        지금 당신이 서 있는 자리는 소드 3(역방향)이에요: 실연으로부터의 회복과 용서.
        탑(갑작스러운 격변과 계시)에서 자라나 별로 기울고 있어요: 희망과 재생.
        소드 3(역방향)의 경우, 길은 정방향의 말에 있어요: “아픔이 아물 수 있도록, 그 아픔을 느끼게 둔다.”
      story · 자리별로
        과거: 탑 — 갑작스러운 격변과 계시.
        현재: 소드 3(역방향) — 실연으로부터의 회복과 용서.
        미래: 별 — 희망과 재생.
        시간 순으로 읽으면 갑작스러운 격변에서 실연으로부터의 회복을 거쳐 희망으로 나아가요.
      connections · 카드끼리의 연결
        타로의 원소 품위(엘리멘탈 디그니티)에서는 같은 원소의 카드끼리 서로를 강하게 하고, 불과 물, 공기와 흙은 서로 반대쪽으로 당겨요.
        현재와 미래: 소드 3(역방향)과 별은 둘 다 공기의 카드라서 서로를 강하게 해요.
        탑 자신의 설명에 따르면, 별은 이 카드와 반대로 작용해요: “안정과 안식처, 오래가는 완성을 나타내요. 파국적인 격변과는 정반대예요.”
      patterns · 눈에 띄는 점
        3장 중 2장이 메이저 아르카나예요(탑, 별): 일상의 세부만이 아니라 더 큰 전환점이 움직이고 있어요.
        별을 포함해, 3장 중 2장에 공기의 원소가 흐르고 있어요.
        소드 3은 역방향이에요: 막혀 있거나, 늦어지거나, 안으로 향한 것으로 읽어요.
      turning · 전환점
        ‘현재’가 중심축이에요: 소드 3(역방향) — 실연으로부터의 회복과 용서. 다른 카드는 이 카드에 비추어 읽어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 내가 인정해야 할 고통스러운 진실은 무엇인가?
      quotesAffirmationOf: 1"
    `);
  });

  it('F5 ko', () => {
    expect(text(fixtures.F5('ko'))).toMatchInlineSnapshot(`
      "SHORT
        소드 10에서 시작해요: 고통스러운 끝과 배신.
        완드 6(역방향)에서 끝나요: 사적인 성취와 지연된 인정.
        완드 6(역방향)의 경우, 길은 정방향의 말에 있어요: “내가 얻어 낸 것에 대한 인정을 받아들인다.”
      story · 자리별로
        What I fear: 소드 10 — 고통스러운 끝과 배신.
        What I want: 컵 9 — 만족과 충족.
        What helps: 여황제 — 여성성과 아름다움.
        Where it goes: 완드 6(역방향) — 사적인 성취와 지연된 인정.
        순서대로 읽으면 고통스러운 끝에서 사적인 성취로 나아가요.
      patterns · 눈에 띄는 점
        여황제가 더 큰 주제를 보여 주고, 나머지 3장은 그것이 일상에서 어떻게 펼쳐지는지 보여 줘요.
        완드 6은 역방향이에요: 막혀 있거나, 늦어지거나, 안으로 향한 것으로 읽어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 내가 주장하고 축하할 준비가 된 승리는 무엇인가?
      quotesAffirmationOf: 3"
    `);
  });

  it('F6 ko', () => {
    expect(text(fixtures.F6('ko'))).toMatchInlineSnapshot(`
      "SHORT
        답: 예에 가까워요.
        답: 태양 — 기쁨과 성공.
        태양은 이렇게 조언해요: “환한 빛 속에서 나를 온전히 드러낸다.”
      story · 자리별로
        질문의 에너지: 컵 2 — 통합된 사랑과 파트너십.
        답: 태양 — 기쁨과 성공.
        그 답에 대해 알아야 할 것: 별 — 희망과 재생.
        순서대로 읽으면 통합된 사랑에서 희망으로 나아가요.
      connections · 카드끼리의 연결
        타로의 원소 품위(엘리멘탈 디그니티)에서는 같은 원소의 카드끼리 서로를 강하게 하고, 불과 물, 공기와 흙은 서로 반대쪽으로 당겨요.
        질문의 에너지와 답: 컵 2(물)와 태양(불)은 서로 반대쪽으로 당겨요.
        별 자신의 설명에 따르면, 태양은 이 카드를 강하게 해요: “모두 희망과 재생, 치유, 그리고 고난 뒤에 믿음이 부드럽게 다시 깨어나는 것을 구현해요.”
      patterns · 눈에 띄는 점
        3장 중 2장이 메이저 아르카나예요(태양, 별): 일상의 세부만이 아니라 더 큰 전환점이 움직이고 있어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 진정한 파트너십은 내게 무엇을 의미하는가?
      quotesAffirmationOf: 1"
    `);
  });

  it('F7 ko', () => {
    expect(text(fixtures.F7('ko'))).toMatchInlineSnapshot(`
      "SHORT
        펜타클 8: 견습과 기술 개발.
        펜타클 8은 능력을 연마하는 만족, 우수함에 필요한 집중, 훈련된 일의 가치를 나타냅니다.
        펜타클 8은 이렇게 조언해요: “시도할 때마다 더 능숙해진다.”
      layers · 카드를 한 겹씩
        펜타클, 흙: 일, 돈, 몸.
        8: 움직임과 노력.
        정방향: 있는 그대로 읽어요.
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 내가 개발하고 있는 기술은 무엇인가?
      quotesAffirmationOf: 0"
    `);
  });

  it('F8 ko', () => {
    expect(text(fixtures.F8('ko'))).toMatchInlineSnapshot(`
      "SHORT
        하트 에이스: 새로운 따뜻함이 찾아왔어요.
        한 겹씩 읽으면: 하트는 감정, 에이스는 시작, 빨강은 편안함과 따뜻함.
        조언: “따뜻한 말을 소리 내어 전하세요. 마음에서 시작하고, 계획은 그 뒤를 따르게 하세요.”
      todo · 어떻게 하면 좋을까요
        마음에 품을 질문: 당신의 삶 어디에서 무언가가 조용히 열렸나요?
      quotesAffirmationOf: null"
    `);
  });

  it('F1 zh', () => {
    expect(text(fixtures.F1('zh'))).toMatchInlineSnapshot(`
      "SHORT
        这次解读的核心是圣杯二——合一的爱与伙伴关系；横在它上面的是权杖五：冲突与分歧。
        如果一切照旧，它会倾向圣杯十：神圣之爱与和谐家庭。
        你能改变的那张牌是“你的态度”：对于权杖骑士（逆位），出路在它正位的话里：“我大胆行动，边走边学。”
      story · 逐个位置
        十字部分（第1至6张牌）是情况本身。
        当前情况：圣杯二——合一的爱与伙伴关系。
        挑战或障碍：权杖五——冲突与分歧。
        潜意识影响：月亮——幻觉与恐惧。
        近期过去：宝剑三（逆位）——从心碎中恢复与原谅。
        最佳可能结果：星星——希望与更新。
        近期未来：圣杯六——怀旧与童年记忆。
        右侧竖列（第7至10张牌）是你自己、你周围的世界，以及事情通向何处。
        你的态度：权杖骑士（逆位）——匆忙与散乱的能量。
        外部影响：圣杯王后——慈悲与情感成熟。
        希望与恐惧：圣杯五——遗憾与失落。
        最终结果：圣杯十——神圣之爱与和谐家庭。
        按时间来读，它由从心碎中恢复出发，经过合一的爱，走向神圣之爱。
      connections · 牌与牌之间的联系
        在塔罗的元素尊贵（元素互动）中，同一元素的牌会彼此加强，而火与水、风与土则会互相拉扯。
        当前情况与挑战或障碍：圣杯二（水）与权杖五（火）互相拉扯。
        你的态度与最终结果：权杖骑士（火，逆位）与圣杯十（水）互相拉扯。
        近期未来与最终结果：圣杯六与圣杯十同属水元素，彼此加强。
        在圣杯二自己的说明里，圣杯十会加强它：“它们都在颂扬结合、伙伴关系，以及两颗心彼此相认、欢喜交融。”
        在圣杯二自己的说明里，圣杯五与它相抗：“它们以心碎、哀伤、束缚或空洞的冲突，扭曲或拆散这份结合。”
        2张数字五的牌（权杖五和圣杯五）重复着同一个主题：动摇原本安稳之物的摩擦与失去。
        2张宫廷牌把人物带进了故事：你的态度中的权杖骑士（逆位）和外部影响中的圣杯王后。
      patterns · 值得注意的地方
        月亮和星星标示出更大的主题；其余8张牌展现它们如何在日常中展开。
        圣杯占了主导，10张中有5张：这次解读真正关乎的是情感与人际关系。
        水元素贯穿了10张牌中的6张，月亮也在其中。
        没有星币：金钱、工作与身体此刻都很安静。
        宝剑三和权杖骑士是逆位：读作被压抑、延迟或转向内在。
      turning · 转折点
        “挑战或障碍”是转折点：权杖五——冲突与分歧。这个牌阵把这张牌读作作用于其他一切的张力：有时是阻碍，有时正是赋予局面形状的那样东西。
      todo · 可以怎么做
        “你的态度”是你能改变的那张牌。“最终结果”是预报，不是判决：只要你改变“你的态度”或“希望与恐惧”中的任何一点，它就会随之更新。
        值得带在身边的问题：真正的伙伴关系对我意味着什么？
      quotesAffirmationOf: 6"
    `);
  });

  it('F2 zh', () => {
    expect(text(fixtures.F2('zh'))).toMatchInlineSnapshot(`
      "SHORT
        愚者：新的开始与纯真。
        愚者象征着无限的可能性和旅程的开始。
        愚者用它自己的话建议：“不等觉得准备好，我就向前迈步。”
      layers · 逐层读这张牌
        大阿卡纳，风：你人生中更大的主题，而不只是日常细节。
        正位：照它本来的样子读。
      todo · 可以怎么做
        值得带在身边的问题：我被召唤走向什么新的开始？
      quotesAffirmationOf: 0"
    `);
  });

  it('F3 zh', () => {
    expect(text(fixtures.F3('zh'))).toMatchInlineSnapshot(`
      "SHORT
        宝剑三（逆位）：从心碎中恢复与原谅。
        剑被拔除，治愈可以开始，或者你拒绝感受必须感受的痛苦。
        对于宝剑三（逆位），出路在它正位的话里：“我允许自己感受伤痛，好让它愈合。”
      layers · 逐层读这张牌
        宝剑，风：思想、言语与真相。
        三：成长，有他人加入。
        逆位：读作被压抑、延迟或转向内在。
      todo · 可以怎么做
        值得带在身边的问题：我必须承认什么痛苦的真相？
      quotesAffirmationOf: 0"
    `);
  });

  it('F4 zh', () => {
    expect(text(fixtures.F4('zh'))).toMatchInlineSnapshot(`
      "SHORT
        你现在所处的位置是宝剑三（逆位）：从心碎中恢复与原谅。
        它从塔（突然的剧变与启示）中生长出来，正倾向星星：希望与更新。
        对于宝剑三（逆位），出路在它正位的话里：“我允许自己感受伤痛，好让它愈合。”
      story · 逐个位置
        过去：塔——突然的剧变与启示。
        现在：宝剑三（逆位）——从心碎中恢复与原谅。
        未来：星星——希望与更新。
        按时间来读，它由突然的剧变出发，经过从心碎中恢复，走向希望。
      connections · 牌与牌之间的联系
        在塔罗的元素尊贵（元素互动）中，同一元素的牌会彼此加强，而火与水、风与土则会互相拉扯。
        现在与未来：宝剑三（逆位）与星星同属风元素，彼此加强。
        在塔自己的说明里，星星与它相抗：“它们代表稳定、庇护与持久的圆满——与灾难性的剧变恰恰相反。”
      patterns · 值得注意的地方
        3张牌中有2张是大阿卡纳（塔和星星）：起作用的不只是日常细节，还有更大的转折。
        风元素贯穿了3张牌中的2张，星星也在其中。
        宝剑三是逆位：读作被压抑、延迟或转向内在。
      turning · 转折点
        “现在”是关键：宝剑三（逆位）——从心碎中恢复与原谅。其他的牌都对照这张来读。
      todo · 可以怎么做
        值得带在身边的问题：我必须承认什么痛苦的真相？
      quotesAffirmationOf: 1"
    `);
  });

  it('F5 zh', () => {
    expect(text(fixtures.F5('zh'))).toMatchInlineSnapshot(`
      "SHORT
        它从宝剑十开始：痛苦的结束与背叛。
        它以权杖六（逆位）结束：私人成就与认可延迟。
        对于权杖六（逆位），出路在它正位的话里：“对于自己赢得的认可，我坦然接受。”
      story · 逐个位置
        What I fear：宝剑十——痛苦的结束与背叛。
        What I want：圣杯九——满足与满意。
        What helps：女皇——女性特质与美。
        Where it goes：权杖六（逆位）——私人成就与认可延迟。
        按顺序来读，它由痛苦的结束走向私人成就。
      patterns · 值得注意的地方
        女皇标示出更大的主题；其余3张牌展现它如何在日常中展开。
        权杖六是逆位：读作被压抑、延迟或转向内在。
      todo · 可以怎么做
        值得带在身边的问题：我准备好主张和庆祝的胜利是什么？
      quotesAffirmationOf: 3"
    `);
  });

  it('F6 zh', () => {
    expect(text(fixtures.F6('zh'))).toMatchInlineSnapshot(`
      "SHORT
        答案：倾向于是。
        答案：太阳——喜悦与成功。
        太阳用它自己的话建议：“我让自己在全然的光亮中被看见。”
      story · 逐个位置
        这个问题的能量：圣杯二——合一的爱与伙伴关系。
        答案：太阳——喜悦与成功。
        关于这个答案，你需要知道的事：星星——希望与更新。
        按顺序来读，它由合一的爱走向希望。
      connections · 牌与牌之间的联系
        在塔罗的元素尊贵（元素互动）中，同一元素的牌会彼此加强，而火与水、风与土则会互相拉扯。
        这个问题的能量与答案：圣杯二（水）与太阳（火）互相拉扯。
        在星星自己的说明里，太阳会加强它：“它们都体现希望、更新、疗愈，以及历经艰难后信念温柔的重新苏醒。”
      patterns · 值得注意的地方
        3张牌中有2张是大阿卡纳（太阳和星星）：起作用的不只是日常细节，还有更大的转折。
      todo · 可以怎么做
        值得带在身边的问题：真正的伙伴关系对我意味着什么？
      quotesAffirmationOf: 1"
    `);
  });

  it('F7 zh', () => {
    expect(text(fixtures.F7('zh'))).toMatchInlineSnapshot(`
      "SHORT
        星币八：学徒与技能发展。
        星币八代表磨练能力的满足、卓越所需的专注，以及有纪律工作的价值。
        星币八用它自己的话建议：“每一次尝试，都让我更加熟练。”
      layers · 逐层读这张牌
        星币，土：工作、金钱与身体。
        八：行动与努力。
        正位：照它本来的样子读。
      todo · 可以怎么做
        值得带在身边的问题：我正在发展什么技能？
      quotesAffirmationOf: 0"
    `);
  });

  it('F8 zh', () => {
    expect(text(fixtures.F8('zh'))).toMatchInlineSnapshot(`
      "SHORT
        红心A：一份新的温暖已经到来。
        逐层来读：红心代表感受，A代表开端，红色代表轻松与温暖。
        建议：“把温暖的话说出口。先从心出发，再让计划跟上。”
      todo · 可以怎么做
        值得带在身边的问题：你生活中的哪个地方有什么悄悄打开了？
      quotesAffirmationOf: null"
    `);
  });
});

// ── Invariants over every spread ───────────────────────────────────────

/** The certainty words of A11 (en). */
const CERTAINTY_EN = /\b(will|definitely|certainly|guarantee[sd]?|always|never fails|you must)\b/i;
/** 하십시오체 (koSpeechLevel.test.ts): a syllable closed by ㅂ before 니다 or 니까. */
function formalEndings(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/([가-힣])니[다까]/g)) if ((m[1].charCodeAt(0) - 0xac00) % 28 === 17) out.push(m[0]);
  return out;
}
const ROMAN = /\b[IVXLC]+\b/g;

/**
 * The engine's own words: the output with the card pages' quoted texts
 * taken out (the second sentence of a meaning, quotations in “”, and
 * the reflection question after the question template) and the position
 * labels the screen passes in, which keep the
 * card pages' wording and speech level (A11: the engine quotes only what
 * the card pages print).
 */
function ownWords(lines: string[], quoted: string[]): string {
  return lines
    .map((l) => {
      let s = l;
      for (const x of quoted) if (x) s = s.split(x).join('');
      return s
        .replace(/“[^”]*”/g, '')
        .replace(/(A question to carry|心にとめておく問い|마음에 품을 질문|值得带在身边的问题)[:：].*$/, '');
    })
    .join('\n');
}

const SPREADS = Object.keys(TAROT_ROLES);
const SEEDS = 300;

describe('invariants', () => {
  const tables: Array<{ spreadId: string; cards: Array<[number, boolean]> }> = [];
  for (const spreadId of SPREADS) {
    const n = TAROT_ROLES[spreadId].length;
    for (let s = 0; s < SEEDS; s++) {
      tables.push({ spreadId, cards: drawSeededCards(n, `${spreadId}:${s}`, fullDeck).map(({ card, reversed }) => [card.id, reversed]) });
    }
  }
  for (let n = 1; n <= 10; n++) {
    for (let s = 0; s < SEEDS; s++) {
      tables.push({ spreadId: 'custom:test', cards: drawSeededCards(n, `custom:${n}:${s}`, fullDeck).map(({ card, reversed }) => [card.id, reversed]) });
    }
  }

  for (const lng of ALL) {
    it(`${lng}: every spread and custom length, ${SEEDS} tables each`, () => {
      const problems: string[] = [];
      const labels = new Map<string, string[]>();
      for (const { spreadId, cards } of tables) {
        const key = `${spreadId}:${cards.length}`;
        if (!labels.has(key)) labels.set(key, labelsFor(spreadId, cards.length, lng));
        let s: ReadingSummary;
        try {
          s = summarizeTarot({ spreadId, cards: cards.map(([id, reversed]) => ({ id, reversed })), positionLabels: labels.get(key)!, locale: lng });
        } catch (e) {
          problems.push(`${key} threw ${String(e)}`);
          continue;
        }
        const where = `${key} ${cards.map(([id, r]) => `${id}${r ? 'r' : ''}`).join(',')}`;
        if (s.short.length < 2 || s.short.length > 3) problems.push(`${where}: short has ${s.short.length}`);
        const all = [...s.short, ...s.parts.flatMap((p) => [p.heading, ...p.lines])];
        if (all.some((l) => l.includes('{{'))) problems.push(`${where}: placeholder left`);
        const names = cards.map(([id]) => essenceName(id, lng));
        const story = cards.length === 1 ? s.short.join('\n') : (s.parts.find((p) => p.key === 'story')?.lines ?? []).join('\n');
        for (const nm of names) if (!story.includes(nm)) problems.push(`${where}: ${nm} not named`);
        const seconds = cards.map(([id, r]) => essenceOf(id, r, lng).second);
        const own = ownWords(all, [...seconds, ...labels.get(key)!]);
        if ((lng === 'ja' || lng === 'zh') && /[A-Za-z]{2}/.test(all.join('\n').replace(ROMAN, ''))) problems.push(`${where}: Latin letters`);
        if (lng === 'ko' && formalEndings(own).length) problems.push(`${where}: 하십시오체 ${formalEndings(own).join(',')}`);
        if (lng === 'en' && CERTAINTY_EN.test(own)) problems.push(`${where}: certainty word in ${own.match(CERTAINTY_EN)?.[0]}`);
        if (problems.length > 20) break;
      }
      expect(problems).toEqual([]);
    }, 120_000);
  }
});

function essenceName(id: number, lng: SupportedLocale): string {
  const c = fullDeck.find((x) => x.id === id)!;
  if (lng === 'en') return c.name;
  return (readJsonCached(lng).cards[String(id)]?.name as string | undefined) ?? c.name;
}
const tarotCache = new Map<string, { cards: Record<string, { name?: string }> }>();
function readJsonCached(lng: string) {
  let v = tarotCache.get(lng);
  if (!v) {
    v = readJson(lng, 'tarot') as { cards: Record<string, { name?: string }> };
    tarotCache.set(lng, v);
  }
  return v;
}

/** SP/features/_samples.json: the prototype's English for F1 (celtic), F2 (fool), F3 (swordsRev), F4 (threeTarot), F5 (custom) and F7 (eight). */
const GOLDEN_EN: Record<string, { short: string[]; parts: Array<{ key: string; heading: string; lines: string[] }> }> = {
  "celtic": {
    "short": [
      "At the heart of this reading is the Two of Cups — unified love and partnership — crossed by the Five of Wands: conflict and disagreements.",
      "If nothing changes, it leans toward the Ten of Cups: divine love and harmonious family.",
      "Your attitude is the card you can change: for the Knight of Wands (reversed), the way through is in its upright words: “I act boldly and learn as I go.”"
    ],
    "parts": [
      {
        "key": "story",
        "heading": "Position by position",
        "lines": [
          "The cross, cards 1 to 6, is the situation itself.",
          "Present situation: the Two of Cups — unified love and partnership.",
          "Challenge or obstacle: the Five of Wands — conflict and disagreements.",
          "Subconscious influences: The Moon — illusion and fear.",
          "Recent past: the Three of Swords (reversed) — recovery from heartbreak and forgiveness.",
          "Best possible outcome: The Star — hope and renewal.",
          "Near future: the Six of Cups — nostalgia and childhood memories.",
          "The staff, cards 7 to 10, is you, the world around you and where it leads.",
          "Your attitude: the Knight of Wands (reversed) — haste and scattered energy.",
          "External influences: the Queen of Cups — compassion and emotional maturity.",
          "Hopes and fears: the Five of Cups — regret and loss.",
          "Final outcome: the Ten of Cups — divine love and harmonious family.",
          "Read in time, it moves from recovery from heartbreak through unified love to divine love."
        ]
      },
      {
        "key": "connections",
        "heading": "How the cards connect",
        "lines": [
          "In tarot’s elemental dignities, cards of one element strengthen each other, while Fire and Water, or Air and Earth, pull against each other.",
          "Present situation and Challenge or obstacle: the Two of Cups (Water) and the Five of Wands (Fire) pull against each other.",
          "Your attitude and Final outcome: the Knight of Wands (Fire, reversed) and the Ten of Cups (Water) pull against each other.",
          "Near future and Final outcome: the Six of Cups and the Ten of Cups are both Water, and strengthen each other.",
          "In the Two of Cups’ own notes, the Ten of Cups reinforces it: “All celebrate union, partnership, and the joyful merging of two hearts in mutual recognition.”",
          "In the Two of Cups’ own notes, the Five of Cups works against it: “These distort or break union through heartbreak, sorrow, bondage, or hollow conflict.”",
          "Two Fives (the Five of Wands and the Five of Cups) repeat one theme: friction and loss that unsettle what was steady.",
          "Two court cards bring people into the story: the Knight of Wands (reversed) in Your attitude and the Queen of Cups in External influences."
        ]
      },
      {
        "key": "patterns",
        "heading": "What stands out",
        "lines": [
          "The Moon and The Star mark the larger themes; the other eight cards show how they play out day to day.",
          "Cups lead, five of ten: the reading is really about feeling and relationships.",
          "Water runs through six of the ten cards, The Moon included.",
          "No Pentacles: money, work and the body are quiet here.",
          "The Three of Swords and the Knight of Wands are reversed: read them as held back, delayed or turned inward."
        ]
      },
      {
        "key": "turning",
        "heading": "The turning point",
        "lines": [
          "Challenge or obstacle is the turning point: the Five of Wands — conflict and disagreements. The spread reads this card as the tension acting on everything else: sometimes an obstacle, sometimes the very thing that gives the situation its shape."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "Your attitude is the card you can change. Final outcome is a forecast, not a verdict: it updates the moment you change anything in Your attitude or Hopes and fears.",
          "A question to carry: What does true partnership mean to me?"
        ]
      }
    ]
  },
  "fool": {
    "short": [
      "The Fool: new beginnings and innocence.",
      "The Fool represents unlimited potential and the start of a journey.",
      "The Fool advises, in its own words: “I step forward before I feel ready.”"
    ],
    "parts": [
      {
        "key": "layers",
        "heading": "The card in layers",
        "lines": [
          "Major Arcana, Air: a larger theme in your life, not only everyday detail.",
          "Upright: read as it stands."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "A question to carry: What new beginning am I being called toward?"
        ]
      }
    ]
  },
  "swordsRev": {
    "short": [
      "The Three of Swords (reversed): recovery from heartbreak and forgiveness.",
      "The swords are being removed and healing can begin, or you are refusing to feel the pain that must be felt.",
      "For the Three of Swords (reversed), the way through is in its upright words: “I let the hurt be felt so it can heal.”"
    ],
    "parts": [
      {
        "key": "layers",
        "heading": "The card in layers",
        "lines": [
          "Swords, Air: thought, words and truth.",
          "Three: growth, with others joining in.",
          "Reversed: held back, delayed or turned inward."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "A question to carry: What painful truth must I acknowledge?"
        ]
      }
    ]
  },
  "eight": {
    "short": [
      "The Eight of Pentacles: apprenticeship and skill development.",
      "The Eight of Pentacles represents the satisfaction of honing your abilities, the focus required for excellence, and the value of disciplined work.",
      "The Eight of Pentacles advises, in its own words: “I grow more skilled with every attempt.”"
    ],
    "parts": [
      {
        "key": "layers",
        "heading": "The card in layers",
        "lines": [
          "Pentacles, Earth: work, money and the body.",
          "Eight: movement and effort.",
          "Upright: read as it stands."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "A question to carry: What skills am I developing?"
        ]
      }
    ]
  },
  "threeTarot": {
    "short": [
      "The Three of Swords (reversed) is where you stand: recovery from heartbreak and forgiveness.",
      "It grew out of The Tower (sudden upheaval and revelation) and leans toward The Star: hope and renewal.",
      "For the Three of Swords (reversed), the way through is in its upright words: “I let the hurt be felt so it can heal.”"
    ],
    "parts": [
      {
        "key": "story",
        "heading": "Position by position",
        "lines": [
          "Past: The Tower — sudden upheaval and revelation.",
          "Present: the Three of Swords (reversed) — recovery from heartbreak and forgiveness.",
          "Future: The Star — hope and renewal.",
          "Read in time, it moves from sudden upheaval through recovery from heartbreak to hope."
        ]
      },
      {
        "key": "connections",
        "heading": "How the cards connect",
        "lines": [
          "In tarot’s elemental dignities, cards of one element strengthen each other, while Fire and Water, or Air and Earth, pull against each other.",
          "Present and Future: the Three of Swords (reversed) and The Star are both Air, and strengthen each other.",
          "In The Tower’s own notes, The Star works against it: “These represent stability, sanctuary, and lasting completion — the opposite of catastrophic upheaval.”"
        ]
      },
      {
        "key": "patterns",
        "heading": "What stands out",
        "lines": [
          "Two of the three cards are Major Arcana (The Tower and The Star): larger turning points are in play, not only everyday detail.",
          "The Three of Swords is reversed: read it as held back, delayed or turned inward."
        ]
      },
      {
        "key": "turning",
        "heading": "The turning point",
        "lines": [
          "Present is the hinge: the Three of Swords (reversed) — recovery from heartbreak and forgiveness. The other cards are read against it."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "A question to carry: What painful truth must I acknowledge?"
        ]
      }
    ]
  },
  "custom": {
    "short": [
      "It begins with the Ten of Swords: painful endings and betrayal.",
      "It ends on the Six of Wands (reversed): private achievement and delayed recognition.",
      "For the Six of Wands (reversed), the way through is in its upright words: “I accept recognition for what I have earned.”"
    ],
    "parts": [
      {
        "key": "story",
        "heading": "Position by position",
        "lines": [
          "What I fear: the Ten of Swords — painful endings and betrayal.",
          "What I want: the Nine of Cups — contentment and satisfaction.",
          "What helps: The Empress — femininity and beauty.",
          "Where it goes: the Six of Wands (reversed) — private achievement and delayed recognition.",
          "Read in order, it moves from painful endings to private achievement."
        ]
      },
      {
        "key": "patterns",
        "heading": "What stands out",
        "lines": [
          "The Empress marks the larger theme; the other three cards show how it plays out day to day.",
          "The Six of Wands is reversed: read it as held back, delayed or turned inward."
        ]
      },
      {
        "key": "todo",
        "heading": "What to do",
        "lines": [
          "A question to carry: What victories am I ready to claim and celebrate?"
        ]
      }
    ]
  }
};
