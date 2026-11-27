/**
 * The short summary and the whole picture of a tarot reading (WP-NF-02 A6, A7).
 *
 * The short summary is two or three sentences: the heart of the reading,
 * where it leans and what to do, its form chosen by the spread's roles. The
 * whole picture reads the cards together with tarot's own methods: position
 * by position, how the cards connect (elemental dignities, the cards' own
 * notes, repeated numbers, court cards), what stands out (Major against
 * Minor, the leading suit or element, missing suits, reversals), the turning
 * point and what to do.
 */
import type { SupportedLocale } from '../../i18n/config';
import {
  bareRef,
  cardRef,
  countWord,
  fill,
  joinSentences,
  listJoin,
  possessiveRef,
  refWithElement,
  say,
} from './format';
import { phrase } from './loadPhrases';
import type { PhraseKey } from './phrases.en';
import { dignityIndexPairs, rolesFor } from './roles';
import { adviceSentence, questionPart, singleTarotFromFacts } from './single';
import {
  courtIndexes,
  dignities,
  elementRun,
  leadingSuit,
  missingSuits,
  ownNotes,
  repeatedNumbers,
  tarotFacts,
  type TarotFacts,
} from './tarot';
import type { PositionRole, ReadingSummary, SummaryInput, SummaryPart } from './types';

const EMPTY: ReadingSummary = { short: [], parts: [], quotesAffirmationOf: null };

export function summarizeTarot(input: SummaryInput): ReadingSummary {
  const { locale, spreadId } = input;
  const facts = input.cards.map((c) => tarotFacts(c.id, c.reversed, locale));
  if (facts.length === 0 || facts.some((f) => f === null)) return EMPTY;
  const cs = facts as TarotFacts[];
  if (cs.length === 1) return singleTarotFromFacts(locale, cs[0]);
  return composeSpread(locale, spreadId, cs, input.positionLabels, input.answer?.label ?? null);
}

function composeSpread(
  locale: SupportedLocale,
  spreadId: string,
  cs: TarotFacts[],
  labelsIn: string[],
  answer: string | null,
): ReadingSummary {
  const n = cs.length;
  const roles = rolesFor(spreadId, n);
  const celtic = spreadId === 'celtic-cross' && n === 10;
  const L = (i: number) => labelsIn[i]?.trim() || String(i + 1);
  const find = (...rs: PositionRole[]) => {
    for (const r of rs) {
      const i = roles.indexOf(r);
      if (i >= 0) return i;
    }
    return -1;
  };
  const allSteps = roles.every((r) => r === 'step');
  const anchor = Math.max(0, find('heart', 'present'));
  const dir = find('outcome', 'future');
  const ref = (i: number) => cardRef(locale, cs[i]);
  const ess = (i: number) => cs[i].essence.text;

  // ── The short summary (A6) ──
  const short: string[] = [];
  let adviceAt: number;
  if (answer !== null && answer.trim()) {
    const a = Math.max(0, find('outcome'));
    adviceAt = a;
    short.push(
      say(locale, 'short.answer', { answer: answer.trim() }),
      say(locale, 'story.line', { position: L(a), card: ref(a), essence: ess(a) }),
      adviceSentence(locale, cs[a]),
    );
  } else if (roles.includes('past') && roles.includes('present')) {
    const p = find('past');
    const now = find('present');
    const f = dir >= 0 ? dir : n - 1;
    adviceAt = adviceIndex(roles, now);
    short.push(
      say(locale, 'short.present', { card: ref(now), essence: ess(now) }),
      say(locale, 'short.grewLeans', { card: ref(p), essence: ess(p), card2: ref(f), essence2: ess(f) }),
      adviceSentence(locale, cs[adviceAt]),
    );
  } else if (roles.includes('heart') && roles.includes('crossing')) {
    const h = find('heart');
    const x = find('crossing');
    const o = find('outcome');
    short.push(say(locale, 'short.heartCrossed', { card: ref(h), essence: ess(h), card2: ref(x), essence2: ess(x) }));
    if (o >= 0) short.push(say(locale, 'short.leans', { card: ref(o), essence: ess(o) }));
    const self = find('self');
    if (celtic && self >= 0) {
      adviceAt = self;
      short.push(say(locale, 'short.canChange', { position: L(self), advice: adviceSentence(locale, cs[self], true) }));
    } else {
      adviceAt = adviceIndex(roles, h);
      short.push(adviceSentence(locale, cs[adviceAt]));
    }
  } else if (allSteps) {
    adviceAt = n - 1;
    short.push(
      say(locale, 'short.begins', { card: ref(0), essence: ess(0) }),
      say(locale, 'short.ends', { card: ref(n - 1), essence: ess(n - 1) }),
      adviceSentence(locale, cs[n - 1]),
    );
  } else {
    adviceAt = adviceIndex(roles, anchor);
    short.push(say(locale, 'short.heart', { card: ref(anchor), essence: ess(anchor) }));
    if (dir >= 0 && dir !== anchor) short.push(say(locale, 'short.leans', { card: ref(dir), essence: ess(dir) }));
    else if (n - 1 !== anchor) short.push(say(locale, 'short.ends', { card: ref(n - 1), essence: ess(n - 1) }));
    short.push(adviceSentence(locale, cs[adviceAt]));
  }

  const parts: SummaryPart[] = [];
  const part = (key: SummaryPart['key'], headingKey: PhraseKey, lines: string[]) => {
    if (lines.length) parts.push({ key, heading: phrase(locale, headingKey), lines });
  };

  // ── Position by position ──
  const story: string[] = [];
  const line = (i: number) => say(locale, 'story.line', { position: L(i), card: ref(i), essence: ess(i) });
  if (celtic) {
    story.push(say(locale, 'story.cross'));
    for (let i = 0; i <= 5; i++) story.push(line(i));
    story.push(say(locale, 'story.staff'));
    for (let i = 6; i <= 9; i++) story.push(line(i));
  } else {
    for (let i = 0; i < n; i++) story.push(line(i));
  }
  const pastAt = find('past');
  const nowAt = find('heart', 'present');
  if (pastAt >= 0 && nowAt >= 0 && dir >= 0) {
    story.push(
      say(locale, 'story.inTime', { from: cs[pastAt].essence.first, through: cs[nowAt].essence.first, to: cs[dir].essence.first }),
    );
  } else {
    story.push(say(locale, 'story.inOrder', { from: cs[0].essence.first, to: cs[n - 1].essence.first }));
  }
  part('story', 'heading.story', story);

  // ── How the cards connect ──
  const conn: string[] = [];
  const dign = dignities(cs, dignityIndexPairs(spreadId, roles));
  if (dign.length) {
    conn.push(say(locale, 'conn.method'));
    for (const d of dign) {
      conn.push(
        d.kind === 'opposed'
          ? say(locale, 'conn.opposed', {
              position: L(d.i),
              position2: L(d.j),
              card: refWithElement(locale, cs[d.i]),
              card2: refWithElement(locale, cs[d.j]),
            })
          : say(locale, 'conn.same', {
              position: L(d.i),
              position2: L(d.j),
              card: ref(d.i),
              card2: ref(d.j),
              element: cs[d.i].element ?? '',
            }),
      );
    }
  }
  const notes = ownNotes(cs);
  if (notes.reinforcing) {
    const { owner, other } = notes.reinforcing;
    conn.push(
      say(locale, 'conn.reinforces', { owner: possessiveRef(locale, cs[owner]), card: ref(other), reason: cs[owner].reinforcingReason }),
    );
  }
  if (notes.opposing) {
    const { owner, other } = notes.opposing;
    conn.push(say(locale, 'conn.opposes', { owner: possessiveRef(locale, cs[owner]), card: ref(other), reason: cs[owner].opposingReason }));
  }
  for (const g of repeatedNumbers(cs)) {
    conn.push(
      say(locale, 'conn.numbers', {
        count: countWord(locale, g.indexes.length),
        ranks: phrase(locale, `rank.${g.number}_other` as PhraseKey),
        cards: listJoin(locale, g.indexes.map((i) => bareRef(locale, cs[i]))),
        theme: phrase(locale, `theme.${g.number}` as PhraseKey),
      }),
    );
  }
  const courts = courtIndexes(cs);
  if (courts.length >= 2) {
    conn.push(
      say(locale, 'conn.courts', {
        count: countWord(locale, courts.length),
        list: listJoin(
          locale,
          courts.map((i) => fill(phrase(locale, 'conn.courtItem'), { card: ref(i), position: L(i) })),
        ),
      }),
    );
  }
  part('connections', 'heading.connections', conn);

  // ── What stands out ──
  const pat: string[] = [];
  const majors = cs.flatMap((c, i) => (c.major ? [i] : []));
  const names = (ix: number[]) => listJoin(locale, ix.map((i) => bareRef(locale, cs[i])));
  if (majors.length === 0) {
    if (n >= 3) pat.push(say(locale, 'pat.majorsNone'));
  } else if (majors.length * 2 >= n) {
    pat.push(say(locale, 'pat.majorsMany', { count: countWord(locale, majors.length), total: countWord(locale, n), names: names(majors) }));
  } else {
    pat.push(
      say(locale, majors.length === 1 ? 'pat.majorsSome_one' : 'pat.majorsSome_other', {
        names: names(majors),
        rest: countWord(locale, n - majors.length),
      }),
    );
  }
  const lead = leadingSuit(cs);
  if (lead) {
    pat.push(
      say(locale, 'pat.suitLeads', {
        suit: phrase(locale, `suit.${lead.suit}` as PhraseKey),
        count: countWord(locale, lead.count),
        total: countWord(locale, n),
        domain: phrase(locale, `suit.${lead.suit}.domain` as PhraseKey),
      }),
    );
  }
  const run = elementRun(cs);
  if (run) {
    pat.push(
      say(locale, 'pat.elementRuns', {
        element: phrase(locale, `element.${run.element}` as PhraseKey),
        count: countWord(locale, run.count),
        total: countWord(locale, n),
        names: names(run.majors),
      }),
    );
  }
  if (n >= 7) for (const s of missingSuits(cs)) pat.push(say(locale, `pat.missing.${s}` as PhraseKey));
  const rev = cs.flatMap((c, i) => (c.reversed ? [i] : []));
  if (rev.length * 2 >= n && n >= 3) {
    pat.push(say(locale, 'pat.reversedMany', { count: countWord(locale, rev.length), total: countWord(locale, n) }));
  } else if (rev.length) {
    pat.push(say(locale, rev.length === 1 ? 'pat.reversedSome_one' : 'pat.reversedSome_other', { names: names(rev) }));
  }
  part('patterns', 'heading.patterns', pat);

  // ── The turning point ──
  const crossAt = find('crossing');
  const hingeAt = crossAt >= 0 ? crossAt : find('present');
  if (hingeAt >= 0) {
    const vars = { position: L(hingeAt), card: ref(hingeAt), essence: ess(hingeAt) };
    const bits = [say(locale, crossAt >= 0 ? 'turn.crossing' : 'turn.hinge', vars)];
    if (celtic && crossAt >= 0) bits.push(say(locale, 'turn.crossCeltic'));
    if (cs[hingeAt].major) bits.push(say(locale, 'turn.major'));
    part('turning', 'heading.turning', [joinSentences(bits)]);
  }

  // ── What to do ──
  const todo: string[] = [];
  if (celtic) {
    todo.push(
      say(locale, 'todo.canChange', {
        self: L(roles.indexOf('self')),
        outcome: L(roles.indexOf('outcome')),
        hopes: L(roles.indexOf('hopes-fears')),
      }),
    );
  }
  const q = questionPart(locale, cs[allSteps ? n - 1 : anchor].question);
  if (q) todo.push(...q.lines);
  part('todo', 'heading.todo', todo);

  return { short, parts, quotesAffirmationOf: adviceAt };
}

/** The advice card: the first 'advice' card, else the first 'self' card, else the anchor. */
function adviceIndex(roles: PositionRole[], anchor: number): number {
  const a = roles.indexOf('advice');
  if (a >= 0) return a;
  const s = roles.indexOf('self');
  return s >= 0 ? s : anchor;
}
