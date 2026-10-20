// @vitest-environment node
/**
 * p9 QS R-5: the AI Companion, the Mood Letter and the Quick Reading (with
 * Runes, the Sandbox, Ask the Oracle and the Tarot Companion riding on them)
 * told the model to give 988 / crisistextline.org "in the US" to every
 * member, in every language. The journal coach was fixed first (p9 Q32);
 * these now work the same way: the member's words go through the shared
 * multilingual detector before the model, a crisis message is answered by
 * the app in the member's language with the lines the Community crisis
 * banner shows for it, the model answers one the detector missed with a
 * marker alone and gets the same reply, no prompt names any helpline, and
 * the reply is never charged.
 *
 * p9 QZ-1: the Dream Interpreter was the last prompt still naming "988 in the
 * US"; it now works the same way, with its crisis reading in the shape the
 * dream page draws.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CRISIS_LINES, type CrisisLocale } from '../../../supabase/functions/_shared/crisis';
import {
  CRISIS_FLAG,
  crisisLetter,
  crisisParagraphs,
  crisisText,
  isCrisisFlag,
  isCrisisJson,
  waiveForCrisis,
  writesCrisis,
  type CrisisCtx,
} from '../../../supabase/functions/_shared/crisis-reply';
import { localeInstruction } from '../../../supabase/functions/_shared/locale';
import { journalCrisisReply } from '../../../supabase/functions/ai-journal-coach/reply';
import { PERSONAS, buildSystemPrompt, companionCrisis, companionCrisisResponse } from '../../../supabase/functions/ai-companion-chat/reply';
import { SYSTEM as MOOD_SYSTEM, moodCrisis, moodCrisisLetter, readLetter } from '../../../supabase/functions/ai-mood-letter/reply';
import { buildSystem as quickSystem, quickCrisis, quickCrisisReading } from '../../../supabase/functions/ai-quick-reading/reply';
import { buildSystem as dreamSystem, dreamCrisis, dreamCrisisReading, readDream } from '../../../supabase/functions/ai-dream-interpret/reply';
import { fullDeck } from '../../data/tarotDeck';
import { RUNES, runeId } from '../../data/runes';
import { ARCHETYPAL_OBJECTS } from '../../data/archetypalObjects';

const LOCALES: CrisisLocale[] = ['en', 'ja', 'ko', 'zh'];
const LOCALES_DIR = join(__dirname, '..', '..', 'i18n', 'locales');
const json = (lng: string, file: string) => JSON.parse(readFileSync(join(LOCALES_DIR, lng, file), 'utf8'));
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => values[k] ?? '');

// The CJK punctuation rule of cjkPunctuation.test.ts, for the server's own words.
const CJK = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef';
const ASCII_MARK_BY_CJK = new RegExp(`[${CJK}][?!,;:]|(^|[^0-9])[?!,;] *[${CJK}]|\\([^()]*[${CJK}][^()]*\\)`);

/** Every helpline the app knows, in every language, and the US ones the prompts used to carry. */
const EVERY_LINE = [
  /988/, /741741/, /crisis\s*text/i, /lifeline/i, /findahelpline/i, /in the US/,
  ...LOCALES.flatMap((l) => [CRISIS_LINES[l].phone, CRISIS_LINES[l].text]).flatMap((line) => [
    new RegExp(line.number.replace(/[-]/g, '\\-')),
    new RegExp(line.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  ]),
];
const namesNoLine = (prompt: string) => EVERY_LINE.filter((re) => re.test(prompt)).map(String);

/** Every system prompt the three functions can send. */
const PROMPTS: Array<[string, string]> = [
  ...LOCALES.flatMap((l) => PERSONAS.flatMap((p) => [
    [`companion ${p} ${l}`, buildSystemPrompt(p, { locale: l }, [])] as [string, string],
    [`companion ${p} ${l} with context and memories`, buildSystemPrompt(p, { locale: l, zodiacSign: 'Scorpio', mbtiType: 'INFJ', displayName: 'Mika' }, ['Talked about moving to Osaka.'])] as [string, string],
  ])),
  ...LOCALES.map((l) => [`mood letter ${l}`, `${MOOD_SYSTEM}\n\n${localeInstruction(l, { jsonKeys: true, keepVoice: true })}`] as [string, string]),
  ...LOCALES.flatMap((l) => (['tarot', 'playing'] as const).map((d) => [`quick reading ${d} ${l}`, quickSystem(d, l)] as [string, string])),
  // p9 QZ-1: the Dream Interpreter still sent every member "988 in the US".
  ...LOCALES.map((l) => [`dream interpreter ${l}`, dreamSystem(l)] as [string, string]),
];

describe('no AI prompt names a helpline of any country (p9 QS R-5)', () => {
  it.each(PROMPTS)('%s', (_name, prompt) => {
    expect(namesNoLine(prompt)).toEqual([]);
    // …and each tells the model how to say "crisis" instead.
    expect(prompt.includes(CRISIS_FLAG) || prompt.includes('{"crisis": true}')).toBe(true);
    expect(prompt).toMatch(/Never name a helpline, phone number or website yourself/);
  });

  it('the free-text prompts ask for the flag, the JSON prompt for {"crisis": true}', () => {
    expect(buildSystemPrompt('sage', undefined, [])).toContain(CRISIS_FLAG);
    expect(quickSystem('tarot', 'ja')).toContain(CRISIS_FLAG);
    expect(MOOD_SYSTEM).toContain('return exactly {"crisis": true} and nothing else');
    expect(MOOD_SYSTEM).not.toContain(CRISIS_FLAG);
    expect(dreamSystem('ja')).toContain('return exactly {"crisis": true} and nothing else');
    expect(dreamSystem('ja')).not.toContain(CRISIS_FLAG);
  });
});

describe('the crisis reply: the member’s own lines, in their language', () => {
  it.each(LOCALES)('%s: the same words as the journal coach’s reply', (lng) => {
    const coach = journalCrisisReply(lng);
    expect(crisisParagraphs(lng)).toEqual([coach.observation, ...coach.prompts]);
  });

  it.each(LOCALES)('%s: both of the language’s lines, the emergency footer and findahelpline', (lng) => {
    const text = crisisText(lng);
    const lines = CRISIS_LINES[lng];
    expect(text).toContain(lines.phone.number);
    expect(text).toContain(lines.text.number);
    expect(text).toContain(lines.footer);
    expect(text).toContain('findahelpline.com');
    expect(text.split('\n\n')).toHaveLength(4);
    if (lng !== 'en') expect(text).not.toMatch(/988|741741/);
    expect(text).not.toMatch(/!/);
    if (lng === 'ja' || lng === 'zh') expect(text).not.toMatch(ASCII_MARK_BY_CJK);
  });

  it.each(LOCALES)('%s: the Mood Letter’s crisis letter fills its three fields in the member’s language', (lng) => {
    const l = crisisLetter(lng);
    const lines = CRISIS_LINES[lng];
    expect(l.crisis).toBe(true);
    for (const field of [l.letter, l.dominantTheme, l.careSuggestion]) {
      expect(field.length).toBeGreaterThan(0);
      expect(field).not.toMatch(/!/);
      if (lng === 'ja' || lng === 'zh') expect(field).not.toMatch(ASCII_MARK_BY_CJK);
    }
    expect(l.letter).toContain(lines.phone.number);
    expect(l.letter).toContain(lines.text.number);
    expect(l.letter).toContain(lines.footer);
    if (lng !== 'en') {
      expect(l.dominantTheme).not.toMatch(/[A-Za-z]/);
      expect(l.careSuggestion).not.toMatch(/[A-Za-z]/);
      expect(l.letter).not.toMatch(/988|741741/);
    }
  });

  it.each(LOCALES)('%s: the Dream Interpreter’s crisis reading fills the fields its page always shows, in the member’s language', (lng) => {
    const r = dreamCrisisReading(lng);
    const lines = CRISIS_LINES[lng];
    const paragraphs = crisisParagraphs(lng);
    expect(r.crisis).toBe(true);
    // The page shows a reading only when coreTheme is set, and maps archetypes
    // and symbols as lists: empty, they are not drawn.
    expect(r.archetypes).toEqual([]);
    expect(r.symbols).toEqual([]);
    expect('compensatoryMove' in r).toBe(false);
    // Read first: not alone, the emergency footer and both of the language's lines.
    expect(r.coreTheme).toBe(paragraphs.slice(0, 3).join('\n\n'));
    expect(r.coreTheme).toContain(lines.phone.number);
    expect(r.coreTheme).toContain(lines.text.number);
    expect(r.coreTheme).toContain(lines.footer);
    expect(r.coreTheme).toContain('findahelpline.com');
    // The two sections the page always draws hold the person to reach, not a Jungian prompt.
    expect(r.shadowPrompt).toBe(paragraphs[3]);
    expect(r.integrationSuggestion).toBe(crisisLetter(lng).careSuggestion);
    expect(r.emotionalTone).toBe(crisisLetter(lng).dominantTheme);
    for (const field of [r.coreTheme, r.emotionalTone, r.shadowPrompt, r.integrationSuggestion]) {
      expect(field.length).toBeGreaterThan(0);
      expect(field).not.toMatch(/!/);
      if (lng === 'ja' || lng === 'zh') expect(field).not.toMatch(ASCII_MARK_BY_CJK);
    }
    if (lng !== 'en') {
      expect(r.coreTheme).not.toMatch(/988|741741/);
      for (const field of [r.emotionalTone, r.shadowPrompt, r.integrationSuggestion]) expect(field).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe('a crisis message is answered by the app, before any model call', () => {
  it('companion: the QA’s Japanese message gets the Japanese lines', () => {
    const msg = '最近ずっと眠れない。もう消えたい。生きている意味がわからない。';
    expect(companionCrisis(msg)).toBe(true);
    const r = companionCrisisResponse('ja-JP', 'priestess', { charged: false, conversationPaid: false });
    expect(r.reply).toBe(crisisText('ja'));
    expect(r.reply).toContain('よりそいホットライン');
    expect(r.reply).not.toMatch(/988|741741/);
    expect(r).toMatchObject({ persona: 'priestess', memoriesUsed: 0, memoryStatus: 'skipped', crisis: true });
  });

  it('companion: Korean and Chinese messages trip, ordinary ones do not', () => {
    expect(companionCrisis('요즘 너무 힘들어요. 그만 살고 싶어요.')).toBe(true);
    expect(companionCrisis('我真的不想活了')).toBe(true);
    expect(companionCrisis('I keep thinking about ending it all')).toBe(true);
    expect(companionCrisis('What does the Tower card want me to see about my job?')).toBe(false);
    expect(companionCrisis('今日は友だちとカフェで話して、少し気持ちが軽くなった。')).toBe(false);
  });

  it('companion: a locale the app does not ship, or none, gets the English lines', () => {
    expect(companionCrisisResponse('fr-FR', 'sage', { charged: false, conversationPaid: false }).reply).toBe(crisisText('en'));
    expect(companionCrisisResponse(undefined, 'sage', { charged: false, conversationPaid: false }).reply).toContain('988');
  });

  it('mood letter: one note about self-harm, in any language, is enough; categories alone are not', () => {
    const day = (date: string, note?: string) => ({ date, category: 'heavy' as const, intensity: 5, note });
    expect(moodCrisis([day('2026-10-10'), day('2026-10-11', '仕事で疲れた'), day('2026-10-12', '자해하고 싶은 마음이 들어요')])).toBe(true);
    expect(moodCrisis([day('2026-10-10'), day('2026-10-11'), day('2026-10-12')])).toBe(false);
    expect(moodCrisis([day('2026-10-10', 'Long day.'), day('2026-10-11', 'Felt drained but walked by the river.'), day('2026-10-12')])).toBe(false);
    const letter = moodCrisisLetter('ko');
    expect(letter).toEqual(crisisLetter('ko'));
    expect(letter.letter).toContain('109');
  });

  it('quick reading: the answer carries no card, in the member’s language', () => {
    expect(quickCrisis('Should I just end it all?')).toBe(true);
    expect(quickCrisis('我不想活了，怎么办')).toBe(true);
    expect(quickCrisis('Will I get the job in Osaka?')).toBe(false);
    const r = quickCrisisReading('zh-Hans');
    expect(r).toEqual({ reading: crisisText('zh'), memoryUsed: false, crisis: true });
    expect('card' in r).toBe(false);
    expect(r.reading).toContain('400-161-9995');
  });

  it('dream interpreter: a wish to die told with a dream, in any language, gets the member’s lines', () => {
    expect(dreamCrisis('I keep having the same dream where I am falling. Honestly I don’t want to be alive anymore.')).toBe(true);
    expect(dreamCrisis('夢の中で、もう消えたいと思いながら暗い海を歩いていました。')).toBe(true);
    expect(dreamCrisis('꿈속에서 죽고 싶다는 생각만 했어요. 깨어나서도 마찬가지예요.')).toBe(true);
    expect(dreamCrisis('梦里我站在楼顶，醒来后我真的不想活了。')).toBe(true);
    const r = dreamCrisisReading('ja-JP');
    expect(r).toEqual(dreamCrisisReading('ja'));
    expect(r.coreTheme).toContain('よりそいホットライン');
    expect(r.coreTheme).not.toMatch(/988|741741/);
    expect(dreamCrisisReading('ko').coreTheme).toContain('109');
    expect(dreamCrisisReading('zh-Hans').coreTheme).toContain('400-161-9995');
    // A locale the app does not ship, or none: the English lines.
    expect(dreamCrisisReading('fr-FR')).toEqual(dreamCrisisReading('en'));
    expect(dreamCrisisReading(undefined).coreTheme).toContain('988');
  });

  it('dream interpreter: falling, dying and being chased in a dream are what the reading is for', () => {
    expect(dreamCrisis('I was being chased through a dark forest, then I fell off a cliff and woke up just before I hit the ground.')).toBe(false);
    expect(dreamCrisis('My grandmother, who died last year, was cooking in her old kitchen and handed me a key.')).toBe(false);
    expect(dreamCrisis('I dreamed the Death card was pinned to my door and the house was flooding.')).toBe(false);
    expect(dreamCrisis('夢の中で歯が全部抜けてしまい、誰かに追いかけられていました。')).toBe(false);
    expect(dreamCrisis('꿈에서 높은 곳에서 떨어졌는데 바닥에 닿기 직전에 깼어요.')).toBe(false);
    expect(dreamCrisis('我梦见自己在考试，却怎么也找不到教室。')).toBe(false);
  });

  it('writesCrisis reads each text on its own and skips empty ones', () => {
    expect(writesCrisis([undefined, '', null, 'fine'])).toBe(false);
    expect(writesCrisis(['fine', 'I want to die'])).toBe(true);
    // Two harmless notes never join into a crisis phrase.
    expect(writesCrisis(['end', 'it all'])).toBe(false);
  });
});

describe('the model’s own crisis answer', () => {
  it('the flag is read however it is wrapped', () => {
    expect(CRISIS_FLAG).toBe('[[CRISIS]]');
    for (const raw of ['[[CRISIS]]', ' [[ crisis ]] \n', 'I hear you. [[CRISIS]]', '[[Crisis]]']) expect(isCrisisFlag(raw)).toBe(true);
    for (const raw of ['I am here with you.', '[CRISIS]', 'crisis', 'This card speaks of a crisis of faith.']) expect(isCrisisFlag(raw)).toBe(false);
  });

  it('the Mood Letter reads {"crisis": true}, a full letter, or nothing', () => {
    expect(isCrisisJson({ crisis: true })).toBe(true);
    expect(isCrisisJson({ crisis: 'true' })).toBe(false);
    expect(readLetter({ crisis: true })).toEqual({ kind: 'crisis' });
    expect(readLetter({ crisis: true, letter: 'x', dominantTheme: 'y', careSuggestion: 'z' })).toEqual({ kind: 'crisis' });
    expect(readLetter({ letter: 'This week I notice…', dominantTheme: 'Rest', careSuggestion: 'Walk.', extra: 1 }))
      .toEqual({ kind: 'letter', letter: { letter: 'This week I notice…', dominantTheme: 'Rest', careSuggestion: 'Walk.' } });
    expect(readLetter({ letter: '', dominantTheme: 'Rest', careSuggestion: 'Walk.' })).toBeNull();
    expect(readLetter({ letter: 'x', dominantTheme: 'y' })).toBeNull();
    expect(readLetter(null)).toBeNull();
    expect(readLetter('[[CRISIS]]')).toBeNull();
  });

  it('the Dream Interpreter reads {"crisis": true}, a full reading, or nothing', () => {
    const withoutMove = {
      coreTheme: 'A threshold you keep circling.',
      emotionalTone: 'longing wrapped in fear',
      archetypes: ['The Shadow', 'The Threshold Guardian'],
      symbols: [{ text: 'a dark ocean', meaning: 'The unconscious.', reflection: 'What are you not looking at?' }],
      shadowPrompt: 'What would you find if you went home?',
      integrationSuggestion: 'Walk by water this week.',
    };
    const full = { ...withoutMove, compensatoryMove: 'Rest.' };
    expect(readDream({ crisis: true })).toEqual({ kind: 'crisis' });
    // A crisis answer wins over any reading around it.
    expect(readDream({ ...full, crisis: true })).toEqual({ kind: 'crisis' });
    expect(readDream({ ...full, crisis: false, extra: 1 })).toEqual({ kind: 'dream', dream: full });
    expect(readDream(withoutMove)).toEqual({ kind: 'dream', dream: withoutMove });
    expect(Object.keys((readDream({ ...withoutMove, compensatoryMove: '' }) as { dream: object }).dream)).not.toContain('compensatoryMove');
    expect(readDream({ ...full, symbols: [] })).toBeNull();
    expect(readDream({ ...full, coreTheme: '' })).toBeNull();
    expect(readDream({ ...full, archetypes: 'The Shadow' })).toBeNull();
    expect(readDream({ ...full, integrationSuggestion: undefined })).toBeNull();
    expect(readDream(null)).toBeNull();
    expect(readDream('[[CRISIS]]')).toBeNull();
  });
});

describe('a crisis reply is never sold', () => {
  const ctxWith = (spend: CrisisCtx['spend'], refunded: boolean) => {
    const waiveSpend = vi.fn(async () => refunded);
    const info = vi.fn();
    return { ctx: { spend, waiveSpend, log: { info } } as CrisisCtx, waiveSpend, info };
  };

  it('a message that took the charge gets it back', async () => {
    const { ctx, waiveSpend, info } = ctxWith({ charged: true, continuing: false }, true);
    await expect(waiveForCrisis(ctx, 'ai-companion-chat', 'detector')).resolves.toEqual({ charged: false, conversationPaid: false });
    expect(waiveSpend).toHaveBeenCalledWith('crisis');
    expect(info).toHaveBeenCalledWith('crisis.reply', { fn: 'ai-companion-chat', by: 'detector', waived: true });
  });

  it('if the refund fails, the reply says the member was charged', async () => {
    const { ctx } = ctxWith({ charged: true, continuing: false }, false);
    await expect(waiveForCrisis(ctx, 'ai-quick-reading', 'model')).resolves.toEqual({ charged: true, conversationPaid: false });
  });

  it('a free message of a paid conversation stays inside the paid conversation', async () => {
    const { ctx } = ctxWith({ charged: false, continuing: true }, false);
    const paid = await waiveForCrisis(ctx, 'ai-companion-chat', 'detector');
    expect(paid).toEqual({ charged: false, conversationPaid: true });
    expect(companionCrisisResponse('en', 'oracle', paid)).toMatchObject({ charged: false, conversationPaid: true });
  });

  it('no spend recorded (anonymous, or the ledger unreachable): nothing charged', async () => {
    const { ctx } = ctxWith(null, false);
    await expect(waiveForCrisis(ctx, 'ai-mood-letter', 'detector')).resolves.toEqual({ charged: false, conversationPaid: false });
  });
});

describe('what the app itself sends never trips the shortcut', () => {
  const tarotNames = (lng: CrisisLocale): string[] => lng === 'en'
    ? fullDeck.map((c) => c.name)
    : Object.values((json(lng, 'tarot.json') as { cards: Record<string, { name: string }> }).cards).map((c) => c.name);
  const runeNames = (lng: CrisisLocale): string[] => lng === 'en'
    ? RUNES.map((r) => r.name)
    : RUNES.map((r) => (json(lng, 'content-runes.json') as { runes: Record<string, { name: string }> }).runes[runeId(r)]?.name ?? r.name);

  it.each(LOCALES)('%s: the Tarot Companion’s opening message, for every card upright and reversed', (lng) => {
    const app = json(lng, 'app.json') as { tarotCompanion: { seedMessage: string; cardReversed: string } };
    const names = tarotNames(lng);
    expect(names.length).toBe(78);
    for (const name of names) {
      for (const card of [name, fill(app.tarotCompanion.cardReversed, { name })]) {
        const seed = fill(app.tarotCompanion.seedMessage, { card });
        expect(companionCrisis(seed), seed).toBe(false);
      }
    }
  });

  it.each(LOCALES)('%s: a rune cast read by the Oracle, every rune in every position, upright and reversed', (lng) => {
    const app = json(lng, 'app.json') as {
      runes: { aiCast: string; aiRune: string; aiRuneReversed: string; positions: Record<string, string> };
      askOracle: { question: string };
    };
    for (const rune of runeNames(lng)) {
      for (const position of Object.values(app.runes.positions)) {
        for (const tpl of [app.runes.aiRune, app.runes.aiRuneReversed]) {
          const context = fill(app.runes.aiCast, { runes: fill(tpl, { rune, position }) });
          const asked = fill(app.askOracle.question, { context });
          expect(quickCrisis(asked), asked).toBe(false);
        }
      }
    }
  });

  it('the Sandbox’s question, with every object and its meaning', () => {
    const layout = ARCHETYPAL_OBJECTS.map((o) => `${o.name} (centre)`).join(', ');
    const meanings = ARCHETYPAL_OBJECTS.map((o) => o.meaning).join(' / ');
    expect(quickCrisis(`I arranged these archetypal objects on a plinth: ${layout}. What is the reading? (Symbolic meanings drawn from: ${meanings})`)).toBe(false);
  });
});
