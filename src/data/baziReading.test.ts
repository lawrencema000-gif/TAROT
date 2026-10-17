import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';
import { localizeHanzi } from '../i18n/localizeHanzi';
import {
  computeBazi,
  deepenBazi,
  todaysLuckyColor,
  DAY_MASTER_INFO,
  ELEMENT_CAREER_HINT,
  LUCKY_COLOR_LINES,
  NAYIN_LIST,
  STEMS,
  TEN_GOD_INFO,
  fillTemplate,
  nayinFor,
  type HeavenlyStem,
  type TenGod,
} from './bazi';
import {
  BRANCH_RELATION_TEXT,
  CAREER_BY_DAY_MASTER,
  CLIMATE_REMEDIES,
  HEALTH_BY_ELEMENT,
  LUCK_THEMES,
  SPIRIT_STARS,
  SPOUSE_TEXT,
  WEALTH_TEXT,
  computeBaziDeep,
  computeLifeAreas,
  detectBranchRelations,
  type BranchRelation,
  type LuckRelation,
  type SpiritStarId,
} from './baziDeep';
import { STRUCTURE_MEANINGS, type StructureKey } from './baziStructure';
import { BAZI_ELEMENTS, DIRECTIONS, PILLARS, baziCorpus, baziText, branchLabel, pillarLabel, stemLabel } from './baziReading';

/**
 * The 'bazi' content overlay. Before it, the Premium Bazi result read in
 * English inside the translated chrome of ja/ko/zh: the Day Master's text,
 * the Ten Gods, the 納音, the colour and direction, every deep-mode text
 * (pillar narratives, luck themes, the year ahead, the spirit stars, branch
 * relations, climate, careers, wealth, partnership, health) and the chart
 * structure. This holds every string the result prints to the corpus the
 * localizers translate, and each locale's file to that corpus.
 */
const corpus = baziCorpus();

/** Every leaf path, arrays included (`dayMasters.Jia.strengths.0`). */
const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(' ');

/** The corpus with every string marked, so a read that falls back to English shows. */
function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»`
      : Array.isArray(v) ? v.map(mark)
        : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

const load = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-bazi.json'), 'utf8')) as Record<string, unknown>;

describe('bazi corpus', () => {
  it('is every Day Master, Ten God, 納音, star, structure and deep-mode text, and nothing empty', () => {
    const all = paths(corpus);
    const dm = Object.values(DAY_MASTER_INFO).reduce((n, d) => n + 6 + d.strengths.length + d.challenges.length, 0);
    const careers = Object.values(CAREER_BY_DAY_MASTER).reduce((n, list) => n + list.length, 0);
    expect(all).toHaveLength(
      dm + 10 * 3 + 30 * 2 + 5 + 5 + 5 + 3 + 6 + 10 + 15 * 2 + 3 + 5 + careers + 4 + 3 + 5 + 4 + 1 + 11 * 3,
    );
    expect(all.filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
    expect(Object.keys(corpus.nayin)).toEqual(NAYIN_LIST.map((n) => n.id));
  });

  it('every string the result prints resolves through the corpus', () => {
    const tx = baziText(marked(), 'zh');
    const m = (s: string) => `«${s}»`;
    for (const stem of STEMS) {
      const d = DAY_MASTER_INFO[stem];
      expect(tx.dayMaster(stem)).toEqual({
        name: m(d.name), archetype: m(d.archetype), summary: m(d.summary),
        strengths: d.strengths.map(m), challenges: d.challenges.map(m),
        thriving: m(d.thriving), struggling: m(d.struggling), affirmation: m(d.affirmation),
      });
      expect(tx.careers(stem)).toEqual(CAREER_BY_DAY_MASTER[stem].map(m));
    }
    for (const god of Object.keys(TEN_GOD_INFO) as TenGod[]) {
      const g = TEN_GOD_INFO[god];
      expect(tx.tenGod(god)).toEqual({ name: m(g.name), classical: m(g.classical), headline: m(g.headline) });
      expect(tx.annualReading(god)).toMatch(/^«.+»$/);
    }
    for (const n of NAYIN_LIST) expect(tx.nayin(n)).toEqual({ name: m(n.western), classical: m(n.classical) });
    for (const el of BAZI_ELEMENTS) {
      expect(tx.colorName(el)).toBe(m(corpus.colors[el]));
      expect(tx.careerHint(el)).toBe(m(ELEMENT_CAREER_HINT[el]));
    }
    for (const d of DIRECTIONS) expect(tx.direction(d)).toBe(m(d));
    for (const alignment of Object.keys(LUCKY_COLOR_LINES) as (keyof typeof LUCKY_COLOR_LINES)[]) {
      expect(tx.luckyColorLine({ alignment, element: 'fire' })).toBe(m(fillTemplate(LUCKY_COLOR_LINES[alignment], { color: m('red') })));
    }
    for (const r of Object.keys(LUCK_THEMES) as LuckRelation[]) expect(tx.luckTheme(r)).toBe(m(LUCK_THEMES[r]));
    for (const id of Object.keys(SPIRIT_STARS) as SpiritStarId[]) {
      expect(tx.star({ id })).toEqual({
        name: m(SPIRIT_STARS[id].name), meaning: m(SPIRIT_STARS[id].meaning), classical: localizeHanzi(SPIRIT_STARS[id].classical, 'zh'),
      });
    }
    const rel = (type: BranchRelation['type']): BranchRelation =>
      type === 'triple-harmony'
        ? { type, branches: ['Shen', 'Zi', 'Chen'], pillars: ['year', 'month', 'day'], element: 'water', meaning: '' }
        : { type, branches: ['Zi', 'Wu'], pillars: ['year', 'day'], meaning: '' };
    const el = (e: string) => `<${e}>`;
    expect(tx.relation(rel('clash'), el)).toBe(m(fillTemplate(BRANCH_RELATION_TEXT.clash, { a: '子', b: '午' })));
    expect(tx.relation(rel('combine'), el)).toBe(m(fillTemplate(BRANCH_RELATION_TEXT.combine, { a: '子', b: '午' })));
    expect(tx.relation(rel('triple-harmony'), el)).toBe(m(fillTemplate(BRANCH_RELATION_TEXT['triple-harmony'], { branches: '申子辰', element: '<water>' })));
    for (const c of Object.keys(CLIMATE_REMEDIES) as (keyof typeof CLIMATE_REMEDIES)[]) expect(tx.climate(c)).toBe(m(CLIMATE_REMEDIES[c]));
    for (const level of Object.keys(WEALTH_TEXT) as (keyof typeof WEALTH_TEXT)[]) {
      const keys = { wealthElement: 'metal' as const, wealthLevel: level, spouseLevel: 'moderate' as const, healthElement: 'fire' as const };
      expect(tx.wealth(keys, el)).toBe(m(fillTemplate(WEALTH_TEXT[level], { element: '<metal>' })));
    }
    for (const level of Object.keys(SPOUSE_TEXT) as (keyof typeof SPOUSE_TEXT)[]) {
      expect(tx.spouse({ wealthElement: 'metal', wealthLevel: 'weak', spouseLevel: level, healthElement: 'fire' })).toBe(m(SPOUSE_TEXT[level]));
    }
    for (const e of BAZI_ELEMENTS) {
      expect(tx.health({ wealthElement: 'metal', wealthLevel: 'weak', spouseLevel: 'moderate', healthElement: e })).toBe(m(HEALTH_BY_ELEMENT[e]));
    }
    for (const p of PILLARS) expect(tx.pillarNarrative(p)).toMatch(/^«.+»$/);
    expect(tx.structureIntro()).toMatch(/^«.+»$/);
    for (const key of Object.keys(STRUCTURE_MEANINGS) as StructureKey[]) {
      const s = STRUCTURE_MEANINGS[key];
      expect(tx.structure(key)).toEqual({ title: m(s.title), text: m(s.text), strengthNote: m(s.strengthNote), cn: localizeHanzi(s.cn, 'zh') });
    }
  });

  it('English (no overlay) is the data’s own English, sentence for sentence', () => {
    const tx = baziText(null, 'en');
    const raw = (e: string) => e; // the data writes the bare element (metal)
    for (const date of ['1991-03-08', '1984-02-02', '2000-08-15', '1975-11-30', '2012-05-21']) {
      const r = computeBazi(date, '06:45')!;
      const deep = computeBaziDeep(r, date, 'female', '06:45', 2026);
      for (const rel of detectBranchRelations(r)) expect(tx.relation(rel, raw)).toBe(rel.meaning);
      for (const p of deep.luckPillars) expect(tx.luckTheme(p.relation)).toBe(p.theme);
      expect(tx.annualReading(deep.annualLuck.tenGod)).toBe(deep.annualLuck.reading);
      expect(tx.climate(deep.climate.dominant)).toBe(deep.climate.remedy);
      const life = computeLifeAreas(r);
      expect(tx.wealth(life.keys, raw)).toBe(life.wealthAnalysis);
      expect(tx.spouse(life.keys)).toBe(life.spouseAnalysis);
      expect(tx.health(life.keys)).toBe(life.healthFocus);
      expect(tx.careers(r.dayMaster)).toEqual(life.careerAffinity);
      for (const s of deep.spiritStars) expect(tx.star(s)).toEqual({ name: s.name, meaning: s.meaning, classical: s.classical });
      const phase1 = deepenBazi(r);
      expect(tx.colorName(phase1.favorable.element)).toBe(phase1.favorable.colorName);
      expect(tx.careerHint(phase1.favorable.element)).toBe(phase1.favorable.careerHint);
      const lucky = todaysLuckyColor(r);
      expect(tx.luckyColorLine(lucky)).toBe(lucky.oneLiner);
      expect(tx.nayin(nayinFor(r.year.stem, r.year.branch)!)).toEqual({ name: phase1.nayin!.western, classical: phase1.nayin!.classical });
    }
  });

  it('the data’s English sentences are unchanged by the templates (one fixed: “weak but present presence”)', () => {
    const r = computeBazi('1991-03-08', '06:45')!;
    expect(fillTemplate(BRANCH_RELATION_TEXT.clash, { a: 'Zi', b: 'Wu' })).toBe(
      'Six-Clash between Zi and Wu. Polar-opposite branches in your chart create persistent tension between the life-areas they govern. Manifests as recurring conflict, restless changes, and "you can\'t have both at once" forced choices.',
    );
    expect(fillTemplate(LUCKY_COLOR_LINES.doubled, { color: 'red' })).toBe('Wear red today — your core element and the day\'s energy are in sync. Lean in.');
    expect(WEALTH_TEXT.weak).not.toContain('presence');
    expect(computeLifeAreas(r).keys.healthElement).toBe(r.dayMasterElement);
  });

  it('stems and branches: romanized in English, the characters in zh, ja and ko', () => {
    expect([stemLabel('Xin', 'en'), branchLabel('Wei', 'en'), pillarLabel('Xin', 'Wei', 'en')]).toEqual(['Xin', 'Wei', 'Xin Wei']);
    for (const lng of ['zh', 'ja', 'ko'] as const) {
      expect([stemLabel('Xin', lng), branchLabel('Wei', lng), pillarLabel('Xin', 'Wei', lng)]).toEqual(['辛', '未', '辛未']);
    }
    expect(STEMS.map((s) => stemLabel(s, 'zh')).join('')).toBe('甲乙丙丁戊己庚辛壬癸');
  });
});

const known = paths(corpus).sort();
const STEM_NAMES: Record<'ja' | 'ko' | 'zh', string[]> = {
  zh: ['甲木', '乙木', '丙火', '丁火', '戊土', '己土', '庚金', '辛金', '壬水', '癸水'],
  ja: ['甲木', '乙木', '丙火', '丁火', '戊土', '己土', '庚金', '辛金', '壬水', '癸水'],
  ko: ['갑목(甲木)', '을목(乙木)', '병화(丙火)', '정화(丁火)', '무토(戊土)', '기토(己土)', '경금(庚金)', '신금(辛金)', '임수(壬水)', '계수(癸水)'],
};

for (const lng of ['ja', 'ko', 'zh'] as const) {
  describe(`${lng} content-bazi.json`, () => {
    const data = load(lng);

    it('translates every corpus path, and only those, to the house rules', () => {
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        const en = String(valueAt(corpus, p));
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(en);
        // No "!" in any locale; no Latin words left in CJK copy; the placeholders survive.
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        expect(String(v).replace(/\{\{\w+\}\}/g, ''), `${lng} ${p}`).not.toMatch(/[A-Za-z]{2,}/);
        expect(placeholders(String(v)), `${lng} ${p}`).toBe(placeholders(en));
      }
    });

    it('names the Day Masters, and prints each star and 納音 the way the screen pairs them', () => {
      STEMS.forEach((s: HeavenlyStem, i) => expect(valueAt(data, `dayMasters.${s}.name`), s).toBe(STEM_NAMES[lng][i]));
      for (const [id, star] of Object.entries(SPIRIT_STARS)) {
        const name = String(valueAt(data, `stars.${id}.name`));
        // zh/ja: the name IS the classical name in the reader's script (printed once);
        // ko: the hangul name, printed beside the hanja.
        if (lng === 'ko') expect(name, id).toMatch(/[가-힣]/);
        else expect(name, id).toBe(localizeHanzi(star.classical, lng));
      }
      for (const n of NAYIN_LIST) {
        const name = String(valueAt(data, `nayin.${n.id}.name`));
        const classical = String(valueAt(data, `nayin.${n.id}.classical`));
        expect(classical, n.id).toMatch(/^[一-鿿]{3}$/);
        if (lng === 'ko') expect(name, n.id).toMatch(/^[가-힣]{3}$/);
        else expect(name, n.id).toBe(classical);
        if (lng === 'zh') expect(classical, n.id).toBe(n.classical.split(' ')[0]);
      }
      for (const god of Object.keys(TEN_GOD_INFO)) {
        expect(valueAt(data, `tenGods.${god}.name`), god).not.toBe(valueAt(data, `tenGods.${god}.classical`));
      }
    });

    if (lng !== 'ko') {
      it('uses full-width punctuation next to CJK text', () => {
        const CJK = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef';
        const bad = new RegExp(`[${CJK}][?!,;:]|(^|[^0-9])[?!,;] *[${CJK}]|\\([^()]*[${CJK}][^()]*\\)`);
        for (const p of known) expect(String(valueAt(data, p)).replace(/\{\{\w+\}\}/g, ''), `${lng} ${p}`).not.toMatch(bad);
      });
    }
  });
}
