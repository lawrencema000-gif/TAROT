import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import type { ReactElement } from 'react';

// The result screens need neither a signed-in user nor the Oracle sheet here.
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ profile: null, user: null }) }));
vi.mock('../../oracle/AskOracleButton', () => ({ AskOracleButton: () => null }));

import i18n from '../../../i18n/config';
import { ExtraResult } from '../results/ExtraResult';
import { DoshaResult } from '../results/DoshaResult';
import { LoveLanguageResult } from '../results/LoveLanguageResult';
import { ShadowResult } from '../results/ShadowResult';
import { EnneagramResult } from '../results/EnneagramResult';
import { ElementResult } from '../results/ElementResult';
import { CourtMatchResult } from '../results/CourtMatchResult';
import { calculateExtraQuiz, darkTriadQuiz, discQuiz, EXTRA_QUIZ_SCORING, type DimensionalResult } from '../../../data/extraQuizzes';
import { empathQuiz, selfCompassionQuiz } from '../../../data/extraQuizzesPart2';
import { ayurvedaQuiz, calculateDosha } from '../../../data/ayurvedaQuiz';
import { calculateLoveLanguage, loveLanguageQuiz } from '../../../data/quizzes';
import { calculateShadowArchetype, shadowArchetypeQuiz } from '../../../data/shadowArchetypeQuiz';
import { calculateEnneagram, enneagramQuiz } from '../../../data/enneagramQuiz';
import { calculateElementAffinity, elementAffinityQuiz } from '../../../data/elementAffinityQuiz';
import { calculateCourtMatch, tarotCourtQuiz } from '../../../data/tarotCourtQuiz';

/**
 * What a person READS on a tied result (F19, F65) and on a self-compassion
 * result with no single weak component (O#160), through the real renderers
 * and the real locale files. The close call says the scores are the same
 * ("Tied", 同率) when they are; it used to call every tie a narrow gap
 * (p10 d2-ja-07). A dimensional quiz's tie within TIE_MARGIN is still a
 * close call.
 */

const noop = () => {};
const all = (quiz: { questions: { id: string }[] }, v: number) => Object.fromEntries(quiz.questions.map((q) => [q.id, v]));
const dosha = (v: number, p: number) =>
  Object.fromEntries(ayurvedaQuiz.questions.map((q, i) => [q.id, i < v ? 1 : i < v + p ? 2 : 3]));

function mount(el: ReactElement) {
  const view = render(el);
  // ResultLayout's verdict block is the first <section>; everything after it is the reading.
  const verdict = view.container.querySelector('section') as HTMLElement;
  return { ...view, verdict };
}

const emphasisedBars = () =>
  screen.getAllByRole('progressbar').filter((bar) => (bar.firstElementChild as HTMLElement).className.includes('bg-ink-gold'));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('F65 — a three-way tie on a dimensional quiz names all three', () => {
  it('Dark Triad all-Neutral: close call, "Shared with", three gold bars, and no "strongest" claim anywhere (p9 Q07)', () => {
    const result = calculateExtraQuiz('dark-triad-v1', all(darkTriadQuiz, 3))!;
    const { verdict, container } = mount(<ExtraResult quiz={darkTriadQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Narcissistic Shadow, Machiavellian Shadow and Psychopathic Shadow all scored the same. Read them all — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(within(verdict).getByText('Shared with Machiavellian Shadow and Psychopathic Shadow')).toBeInTheDocument();
    // The card is still read — as the first of the three, in the body, in words for a shared top.
    const heading = screen.getByRole('heading', { name: 'Reading Narcissistic Shadow first' });
    expect(heading.parentElement?.textContent).toMatch(/Narcissism is one of your shared top shadows — the hunger to be seen, admired, special\./);
    expect(container.textContent).not.toMatch(/strongest/i);
    expect(emphasisedBars()).toHaveLength(3);
  });

  it('a clear leader is unchanged: summary in the verdict block, no close call, one gold bar', () => {
    const answers = Object.fromEntries(darkTriadQuiz.questions.map((q) => [q.id, q.dimension === 'psychopathy' ? 5 : 2]));
    const result = calculateExtraQuiz('dark-triad-v1', answers)!;
    const { verdict } = mount(<ExtraResult quiz={darkTriadQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(verdict.textContent).toMatch(/Your shadow runs coldest/);
    expect(screen.queryByText('Tied')).toBeNull();
    expect(screen.queryByText('Close call')).toBeNull();
    expect(screen.queryByText(/^Shared with/)).toBeNull();
    expect(emphasisedBars()).toHaveLength(1);
  });

  it('a row saved before `tied` existed still names its pair', () => {
    const old: DimensionalResult = { ...calculateExtraQuiz('dark-triad-v1', all(darkTriadQuiz, 3))!, tied: undefined };
    mount(<ExtraResult quiz={darkTriadQuiz} result={old} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Narcissistic Shadow and Machiavellian Shadow scored the same. Read both — the one you recognise is the one that counts.')).toBeInTheDocument();
  });

  it('ja: the names are listed with 、 and the card is read 「まずは…として読む」', async () => {
    await i18n.changeLanguage('ja');
    try {
      const result = calculateExtraQuiz('dark-triad-v1', all(darkTriadQuiz, 3))!;
      const { verdict } = mount(<ExtraResult quiz={darkTriadQuiz} result={result} onBack={noop} onRetake={noop} />);
      const n = (k: string) => i18n.t(`extraQuizzes.dark-triad.results.${k}.name`, { ns: 'app' });
      expect(n('psychopathy')).not.toBe(`extraQuizzes.dark-triad.results.psychopathy.name`);
      expect(screen.getByText(`${n('narcissism')}、${n('machiavellianism')}、${n('psychopathy')}のスコアは同じでした。どれも読んでみてください——自分だと感じられるものが、あなたにとっての答えです。`)).toBeInTheDocument();
      expect(within(verdict).getByText(`${n('machiavellianism')}、${n('psychopathy')}と同率`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: `まずは${n('narcissism')}として読む` })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

/*
 * p10 d2-ja-07 made the close call say the tied scores are equal, and a
 * dimensional quiz ties on any mean within TIE_MARGIN (0.25) of the top:
 * DISC with every Dominance item Agree and every Influence item Agree but
 * one Neutral is 4.0 to 3.8, and the box read "Tied — Dominance (D) and
 * Influence (I) scored the same" over bars of 4.0 and 3.8. A tie whose
 * means differ is a close call; equal means are still "the same".
 */
describe('a near tie on a dimensional quiz is a close call, not "the same"', () => {
  /** DISC scored from answers: a listed dimension's items at `v`, its fifth item at `fifth` (default `v`); the rest Disagree (2). */
  const disc = (levels: Record<string, [v: number, fifth?: number]>) =>
    calculateExtraQuiz(
      'disc-v1',
      Object.fromEntries(discQuiz.questions.map((q) => {
        const [v, fifth = v] = levels[q.dimension ?? ''] ?? [2];
        return [q.id, q.id.endsWith('5') ? fifth : v];
      })),
    )!;
  // Dominance 4.0, Influence 3.8, Steadiness and Conscientiousness 2.0.
  const nearTie = () => disc({ dominance: [4], influence: [4, 3] });

  it('DISC 4.0 / 3.8 (en): "Close call … within a hair", above the bars that show the gap', () => {
    const result = nearTie();
    expect(result.isTie).toBe(true);
    expect(result.tied).toEqual(['dominance', 'influence']);
    expect([result.averages.dominance, result.averages.influence]).toEqual([4, 3.8]);
    const { verdict } = mount(<ExtraResult quiz={discQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Close call')).toBeInTheDocument();
    expect(screen.getByText('Dominance (D) and Influence (I) scored within a hair of each other. Read both — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(screen.queryByText('Tied')).toBeNull();
    expect(screen.queryByText(/scored the same/)).toBeNull();
    // Still read as a shared top, with the two numbers it is close between.
    expect(within(verdict).getByText('Shared with Influence (I)')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });

  it('a three-way near tie (4.0 / 4.0 / 3.8) names all three as close, not the same', () => {
    const result = disc({ dominance: [4], influence: [4], steadiness: [4, 3] });
    expect(result.tied).toEqual(['dominance', 'influence', 'steadiness']);
    mount(<ExtraResult quiz={discQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Close call')).toBeInTheDocument();
    expect(screen.getByText('Dominance (D), Influence (I) and Steadiness (S) scored within a hair of each other. Read them all — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(screen.queryByText(/scored the same/)).toBeNull();
  });

  it('DISC 4.0 / 4.0: equal means are still "Tied … scored the same"', () => {
    const result = disc({ dominance: [4], influence: [4] });
    expect(result.tied).toEqual(['dominance', 'influence']);
    mount(<ExtraResult quiz={discQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Tied')).toBeInTheDocument();
    expect(screen.getByText('Dominance (D) and Influence (I) scored the same. Read both — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(screen.queryByText('Close call')).toBeNull();
  });

  it.each([
    { lng: 'ja', near: '僅差', tied: '同率', body: '{a}と{b}のスコアは、ほんのわずかな差でした。両方を読んでみてください——自分だと感じられるほうが、あなたにとっての答えです。' },
    { lng: 'ko', near: '근소한 차이', tied: '동점', body: '{a}, {b} 두 결과의 점수가 거의 차이 나지 않아요. 둘 다 읽어 보세요 — 당신에게 와닿는 쪽이 의미 있는 결과예요.' },
    { lng: 'zh', near: '难分高下', tied: '得分相同', body: '{a} 和 {b} 的得分只差一点点。两个都读一读——你认得出的那一个，才是算数的那一个。' },
  ])('$lng: DISC 4.0 / 3.8 is headed $near, not $tied', async ({ lng, near, tied, body }) => {
    await i18n.changeLanguage(lng);
    try {
      mount(<ExtraResult quiz={discQuiz} result={nearTie()} onBack={noop} onRetake={noop} />);
      const n = (k: string) => i18n.t(`extraQuizzes.disc.results.${k}.name`, { ns: 'app' });
      expect(n('influence')).not.toBe('extraQuizzes.disc.results.influence.name');
      expect(screen.getByText(near)).toBeInTheDocument();
      expect(screen.getByText(body.replace('{a}', n('dominance')).replace('{b}', n('influence')))).toBeInTheDocument();
      expect(screen.queryByText(tied)).toBeNull();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('ja: the verdict line says 僅差 for a near tie and 同率 for an exact one', async () => {
    await i18n.changeLanguage('ja');
    try {
      const influence = i18n.t('extraQuizzes.disc.results.influence.name', { ns: 'app' });
      const near = mount(<ExtraResult quiz={discQuiz} result={nearTie()} onBack={noop} onRetake={noop} />);
      expect(within(near.verdict).getByText(`${influence}と僅差`)).toBeInTheDocument();
      expect(within(near.verdict).queryByText(/同率/)).toBeNull();
      cleanup();
      const exact = mount(<ExtraResult quiz={discQuiz} result={disc({ dominance: [4], influence: [4] })} onBack={noop} onRetake={noop} />);
      expect(within(exact.verdict).getByText(`${influence}と同率`)).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('F19 — the dosha result in an exact three-way tie', () => {
  it('REPRO 10/10/10: no two-name close call, no "leading today"; all three bars gold; read Vata first', () => {
    const { verdict } = mount(<DoshaResult quiz={ayurvedaQuiz} result={calculateDosha(dosha(10, 10))} onBack={noop} onRetake={noop} />);
    expect(screen.queryByText('Tied')).toBeNull();
    expect(screen.queryByText(/scored the same/)).toBeNull();
    expect(screen.queryByText(/leading today/)).toBeNull();
    expect(verdict.textContent).toMatch(/Tridoshic/i);
    expect(verdict.textContent).toMatch(/Read the dosha below as a place to start/);
    expect(screen.getByRole('heading', { name: 'Reading Vata first' })).toBeInTheDocument();
    expect(emphasisedBars()).toHaveLength(3);
  });

  it('13/13/4 (not tridoshic): Vata and Pitta in the close call and under the verdict; the Vata card is read first', () => {
    const { verdict } = mount(<DoshaResult quiz={ayurvedaQuiz} result={calculateDosha(dosha(13, 13))} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Vata and Pitta scored the same. Read both — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(within(verdict).getByText('Shared with Pitta')).toBeInTheDocument();
    expect(verdict.textContent).not.toMatch(/Vata rules movement/);
    expect(screen.getByRole('heading', { name: 'Reading Vata first' }).parentElement?.textContent).toMatch(/Vata rules movement/);
    expect(emphasisedBars()).toHaveLength(2);
  });

  it('a tridoshic profile with a clear leader (11/10/9: 11 − 9 = 2 ≤ 3) keeps "Reading Vata as the one leading today"', () => {
    mount(<DoshaResult quiz={ayurvedaQuiz} result={calculateDosha(dosha(11, 10))} onBack={noop} onRetake={noop} />);
    expect(screen.getByRole('heading', { name: 'Reading Vata as the one leading today' })).toBeInTheDocument();
    expect(screen.queryByText('Tied')).toBeNull();
  });

  it('ja 10/10/10: 「まずはヴァータとして読む」 and no 「今日いちばん前に出ている」', async () => {
    await i18n.changeLanguage('ja');
    try {
      mount(<DoshaResult quiz={ayurvedaQuiz} result={calculateDosha(dosha(10, 10))} onBack={noop} onRetake={noop} />);
      expect(screen.getByRole('heading', { name: 'まずはヴァータとして読む' })).toBeInTheDocument();
      expect(screen.queryByText(/今日いちばん前に出ている/)).toBeNull();
      expect(screen.queryByText('同率')).toBeNull();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('the sibling screens name every tied result', () => {
  it('love language all-Neutral: five names in the close call; past three, the verdict line gives the count', () => {
    const { verdict } = mount(
      <LoveLanguageResult quiz={loveLanguageQuiz} result={calculateLoveLanguage(all(loveLanguageQuiz, 3))} onBack={noop} onRetake={noop} />,
    );
    expect(screen.getByText('Receiving Gifts, Words of Affirmation, Acts of Service, Physical Touch and Quality Time all scored the same. Read them all — the one you recognise is the one that counts.')).toBeInTheDocument();
    expect(within(verdict).getByText('Shared with 4 others')).toBeInTheDocument();
    expect(emphasisedBars()).toHaveLength(5);
  });

  it('shadow archetypes all-Neutral: all seven', () => {
    mount(<ShadowResult quiz={shadowArchetypeQuiz} result={calculateShadowArchetype(all(shadowArchetypeQuiz, 3))} onBack={noop} onRetake={noop} />);
    const body = screen.getByText(/all scored the same/).textContent ?? '';
    for (const name of ['Lover', 'Warrior', 'Magician', 'Sovereign', 'Sage', 'Innocent', 'Explorer']) expect(body).toMatch(name);
  });

  it('enneagram all-Neutral: all nine types in the close call, "Shared with 8 others" in the verdict block', () => {
    const { verdict } = mount(<EnneagramResult quiz={enneagramQuiz} result={calculateEnneagram(all(enneagramQuiz, 3))} onBack={noop} onRetake={noop} />);
    const body = screen.getByText(/all scored the same/).textContent ?? '';
    for (let n = 1; n <= 9; n++) expect(body).toMatch(`Type ${n} `);
    expect(within(verdict).getByText('Shared with 8 others')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Reading Type 1 .+ first$/ })).toBeInTheDocument();
  });

  it('element: the unbroken fire/water split names both and reads Fire first', () => {
    const r = calculateElementAffinity({ el1: 1, el2: 1, el3: 3, el4: 1, el5: 1, el6: 2, el7: 2, el8: 2, el9: 3, el10: 2 });
    const { verdict } = mount(<ElementResult quiz={elementAffinityQuiz} result={r} onBack={noop} onRetake={noop} />);
    expect(screen.getByText(/^Fire and Water scored the same/)).toBeInTheDocument();
    expect(within(verdict).getByText('Shared with Water')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reading Fire first' })).toBeInTheDocument();
  });

  it('court match still names its two cards', () => {
    const r = calculateCourtMatch({ ce1: 1, ce2: 1, ce3: 2, ce4: 2, ce5: 3, ce6: 4, cr1: 2, cr2: 2, cr3: 2, cr4: 2, cr5: 2, cr6: 2 });
    mount(<CourtMatchResult quiz={tarotCourtQuiz} result={r} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('Knight of Wands and Knight of Cups scored the same. Read both — the one you recognise is the one that counts.')).toBeInTheDocument();
  });
});

describe('O#160 — self-compassion never points at a card that is not there', () => {
  const sc = (answers: Record<string, number>) => calculateExtraQuiz('self-compassion-v1', answers)!;
  const positives = new Set(['self-kind', 'common-humanity', 'mindful']);
  const pointer = /component below|below is the one/i;

  it('REPRO all-Neutral (moderate, level): no pointer in the summary; "Where to practise" says no single component is lower', () => {
    const { verdict } = mount(<ExtraResult quiz={selfCompassionQuiz} result={sc(all(selfCompassionQuiz, 3))} onBack={noop} onRetake={noop} />);
    expect(within(verdict).getByRole('heading', { level: 1 }).textContent).toBe('Growing self-compassion');
    expect(verdict.textContent).not.toMatch(pointer);
    expect(screen.getByRole('heading', { name: 'Where to practise' })).toBeInTheDocument();
    expect(screen.getByText(/^No single component is lower than the rest/)).toBeInTheDocument();
  });

  it('REPRO all "Strongly agree" (moderate): the three negative components are named', () => {
    mount(<ExtraResult quiz={selfCompassionQuiz} result={sc(all(selfCompassionQuiz, 5))} onBack={noop} onRetake={noop} />);
    expect(screen.getByText('The three components pulling your total down are Self-judgment, Isolation and Over-identification. One small, deliberate practice in any of them moves the whole picture.')).toBeInTheDocument();
    expect(emphasisedBars()).toHaveLength(3);
  });

  it('REPRO the minimum (low, level): no pointer, the level card', () => {
    const answers = Object.fromEntries(selfCompassionQuiz.questions.map((q) => [q.id, positives.has(q.dimension ?? '') ? 1 : 5]));
    const { verdict } = mount(<ExtraResult quiz={selfCompassionQuiz} result={sc(answers)} onBack={noop} onRetake={noop} />);
    expect(within(verdict).getByRole('heading', { level: 1 }).textContent).toBe('Low self-compassion');
    expect(verdict.textContent).not.toMatch(pointer);
    expect(screen.getByText(/^No single component is lower than the rest/)).toBeInTheDocument();
  });

  it('the maximum (high, level) shows no practice card, as before', () => {
    const answers = Object.fromEntries(selfCompassionQuiz.questions.map((q) => [q.id, positives.has(q.dimension ?? '') ? 5 : 1]));
    mount(<ExtraResult quiz={selfCompassionQuiz} result={sc(answers)} onBack={noop} onRetake={noop} />);
    expect(screen.queryByRole('heading', { name: 'Where to practise' })).toBeNull();
  });

  it('a real weakest still shows: isolation agreed, everything else Neutral', () => {
    const answers = Object.fromEntries(selfCompassionQuiz.questions.map((q) => [q.id, q.dimension === 'isolation' ? 5 : 3]));
    mount(<ExtraResult quiz={selfCompassionQuiz} result={sc(answers)} onBack={noop} onRetake={noop} />);
    expect(screen.getByText(/^The component pulling your total down is Isolation\./)).toBeInTheDocument();
  });

  it('every locale: no band summary points at "the component below"', async () => {
    const pointers: Record<string, RegExp> = { en: pointer, ja: /下に示した要素/, ko: /아래의 요소/, zh: /下面这个维度/ };
    try {
      for (const lng of ['en', 'ja', 'ko', 'zh']) {
        await i18n.changeLanguage(lng);
        for (const band of ['low', 'moderate', 'high']) {
          const text = i18n.t(`extraQuizzes.self-compassion.results.${band}.summary`, { ns: 'app' });
          expect(text, `${lng} ${band}`).not.toBe(`extraQuizzes.self-compassion.results.${band}.summary`);
          expect(text, `${lng} ${band}`).not.toMatch(pointers[lng]);
        }
      }
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

/*
 * p9 Q07: F65 moved the first tied result's summary out of the verdict
 * block, but the summary itself claimed a sole winner — three shadows at
 * 3.0, then "Reading Narcissistic Shadow first — Your shadow is strongest
 * around narcissism". A result whose summary claims a sole top now has a
 * version for a shared one (summaryShared), in every language.
 */
describe('p9 Q07 — a shared top is never read as a sole winner', () => {
  const tieBody = () => screen.getByRole('heading', { name: /first$|として読む$|부터 읽어요$|读起$/ }).parentElement!.textContent ?? '';

  it.each([
    ['ja', 'ナルシシズムは、同率で並ぶあなたの影のひとつです。', /もっとも強く/],
    ['ko', '자기애는 공동 1위인 당신의 그림자 중 하나예요', /가장 강하게/],
    ['zh', '自恋是你并列居首的几种阴影之一', /最为强烈/],
  ])('%s: Dark Triad all-Neutral reads narcissism as one of the shared tops', async (lng, lede, claim) => {
    await i18n.changeLanguage(lng);
    try {
      const result = calculateExtraQuiz('dark-triad-v1', all(darkTriadQuiz, 3))!;
      const { container } = mount(<ExtraResult quiz={darkTriadQuiz} result={result} onBack={noop} onRetake={noop} />);
      expect(tieBody()).toContain(lede);
      expect(container.textContent).not.toMatch(claim);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('Empath ≈ HSP: the tie does not call one sensitivity the core one', () => {
    const answers = Object.fromEntries(empathQuiz.questions.map((q, i) => [q.id, i === 0 || q.id === empathQuiz.questions.find((x) => x.dimension === 'hsp')!.id ? 4 : 3]));
    const result = calculateExtraQuiz('empath-hsp-v1', answers)!;
    expect(result.isTie).toBe(true);
    expect(['empath', 'hsp']).toContain(result.primary);
    const { container } = mount(<ExtraResult quiz={empathQuiz} result={result} onBack={noop} onRetake={noop} />);
    expect(tieBody()).toMatch(/runs about as strong as your/);
    expect(container.textContent).not.toMatch(/core sensitivity/i);
  });

  it('every dimensional quiz: what a tie reads first never claims a sole top (en)', () => {
    const SOLE = /\b(?:strongest|coldest|core sensitivity|default)\b|pure depletion|still see the value of your work|still have some energy/i;
    const offenders: string[] = [];
    let read = 0;
    for (const [quizId, entry] of Object.entries(EXTRA_QUIZ_SCORING)) {
      const quizKey = quizId.replace(/-v\d+$/, '');
      for (const dim of entry.dimensions) {
        const base = `extraQuizzes.${quizKey}.results.${dim}`;
        const summary = i18n.t(`${base}.summary`, { ns: 'app', defaultValue: entry.info[dim]?.summary ?? '' });
        const shared = i18n.t(`${base}.summaryShared`, { ns: 'app', defaultValue: summary });
        read++;
        if (SOLE.test(shared)) offenders.push(`${quizKey}.${dim}: ${shared.slice(0, 60)}`);
      }
    }
    expect(read).toBeGreaterThan(60);
    expect(offenders).toEqual([]);
  });
});
