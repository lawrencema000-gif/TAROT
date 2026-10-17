/**
 * Korean particles (조사) that agree with the word before them.
 *
 * 이/가, 을/를, 은/는, 과/와 and the copula forms (이에요/예요, 이라는/라는, …)
 * take their first form after a syllable that ends in a consonant (받침) and
 * the second after a vowel; 으로/로 also takes 로 after ㄹ (달로, 물로). A
 * template that does not know its noun used to print both forms
 * ("목성과(와) 달이(가)"), or one form chosen for some other noun. Every word
 * these templates are filled with is known when the sentence is built, so the
 * sentence can carry the one right form.
 *
 * Plain TypeScript with no imports and nothing newer than ES2020: the edge
 * functions import this file, and the client re-exports it
 * (src/i18n/koJosa.ts), so both sides pick particles the same way.
 */

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** ㄹ as a final consonant: the jongseong index (0 = none, 1 = ㄱ … 27 = ㅎ). */
const RIEUL = 8;

/**
 * The final consonant of each digit read the Sino-Korean way, as numbers are
 * read before a particle: 영(ㅇ) 일(ㄹ) 이 삼(ㅁ) 사 오 육(ㄱ) 칠(ㄹ) 팔(ㄹ) 구.
 */
const DIGIT_FINAL = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];

/** Closing quotes and brackets a particle may follow: it agrees with the word inside. */
const CLOSERS = '"\'”’」』》〉]';

/**
 * The jongseong index (0 = no final consonant, 8 = ㄹ, …) of the syllable a
 * particle after `word` attaches to, or null when that sound is unknown (a
 * Latin word, an empty string). Closing quotes are looked through, and so is
 * a parenthetical gloss: "간괘(토)" ends, for its particle, in 괘.
 */
export function finalConsonant(word: string): number | null {
  let i = word.length - 1;
  while (i >= 0) {
    const ch = word[i];
    if (CLOSERS.indexOf(ch) >= 0) {
      i -= 1;
      continue;
    }
    if (ch === ')' || ch === '）') {
      let depth = 1;
      i -= 1;
      while (i >= 0 && depth > 0) {
        if (word[i] === ')' || word[i] === '）') depth += 1;
        else if (word[i] === '(' || word[i] === '（') depth -= 1;
        i -= 1;
      }
      continue;
    }
    break;
  }
  if (i < 0) return null;
  const code = word.charCodeAt(i);
  if (code >= HANGUL_FIRST && code <= HANGUL_LAST) return (code - HANGUL_FIRST) % 28;
  if (code >= 0x30 && code <= 0x39) {
    let start = i;
    while (start > 0 && /[0-9,]/.test(word[start - 1])) start -= 1;
    const digits = word.slice(start, i + 1).replace(/,/g, '');
    const zeros = digits.length - digits.replace(/0+$/, '').length;
    if (zeros === digits.length) return 21; // 영
    if (zeros === 0) return DIGIT_FINAL[digits.charCodeAt(digits.length - 1) - 0x30];
    if (zeros === 1) return 17; // 십 (ㅂ)
    if (zeros === 2) return 1; // 백 (ㄱ)
    if (zeros <= 7) return 4; // 천, 만 … 천만 (ㄴ)
    if (zeros <= 11) return 1; // 억 (ㄱ)
    return 0; // 조
  }
  return null;
}

interface Pair {
  /** The form after a final consonant. */
  c: string;
  /** The form after a vowel. */
  v: string;
  /** 으로/로: ㄹ takes the vowel form. */
  rieulTakesVowel?: boolean;
  /** Two-form markers that name this pair in a template or a string. */
  duals: string[];
}

const PAIRS: Pair[] = [
  { c: '이', v: '가', duals: ['이(가)', '가(이)'] },
  { c: '을', v: '를', duals: ['을(를)', '를(을)'] },
  { c: '은', v: '는', duals: ['은(는)', '는(은)'] },
  { c: '과', v: '와', duals: ['과(와)', '와(과)'] },
  { c: '으로', v: '로', rieulTakesVowel: true, duals: ['(으)로'] },
  { c: '이에요', v: '예요', duals: ['(이)에요'] },
  { c: '이라는', v: '라는', duals: ['(이)라는'] },
  { c: '이라고', v: '라고', duals: ['(이)라고'] },
  { c: '이나', v: '나', duals: ['(이)나'] },
  { c: '이랑', v: '랑', duals: ['(이)랑'] },
  { c: '이며', v: '며', duals: ['(이)며'] },
];

const PAIR_OF = new Map<string, Pair>();
for (const p of PAIRS) {
  PAIR_OF.set(p.c, p);
  PAIR_OF.set(p.v, p);
  for (const d of p.duals) PAIR_OF.set(d, p);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLength = (a: string, b: string) => b.length - a.length;
const DUALS = PAIRS.flatMap((p) => p.duals).sort(byLength).map(escape).join('|');
const SINGLES = PAIRS.flatMap((p) => [p.c, p.v]).sort(byLength).map(escape).join('|');
const DUAL_RE = new RegExp(DUALS, 'g');
/**
 * A {name} slot, the closing quotes after it, then the particle on it: a
 * two-form marker, or one form standing as a whole particle (not the start
 * of a longer Korean word, so "{x}이다운" is left alone).
 */
const SLOT_RE = new RegExp(
  `\\{(\\w+)\\}([${escape(CLOSERS)}]*)(?:(${DUALS})|(${SINGLES})(?![\\uac00-\\ud7a3\\u3131-\\u318e]))?`,
  'g',
);

/**
 * The form of `particle` that agrees with `word`. `particle` may be either
 * form of a pair ('이' or '가', '으로' or '로', '이에요' or '예요', …) or a
 * two-form marker ('이(가)', '(으)로'). A particle this does not know comes
 * back unchanged, and so does one after a word whose last sound is unknown
 * (a Latin name keeps its two-form marker).
 */
export function koParticle(word: string, particle: string): string {
  const pair = PAIR_OF.get(particle);
  if (!pair) return particle;
  const f = finalConsonant(word);
  if (f === null) return particle;
  if (f === 0) return pair.v;
  if (f === RIEUL && pair.rieulTakesVowel) return pair.v;
  return pair.c;
}

/** `word` followed by the form of `particle` that agrees with it. */
export function withKoParticle(word: string, particle: string): string {
  return word + koParticle(word, particle);
}

/**
 * Every two-form marker in finished text (이(가), 을(를), 은(는), 과(와),
 * (으)로, (이)라는, …) replaced by the form the syllable before it takes.
 */
export function resolveKoParticles(text: string): string {
  return text.replace(DUAL_RE, (marker: string, offset: number) => koParticle(text.slice(0, offset), marker));
}

/**
 * Fill the {name} slots of a Korean template and make the particle written
 * on each slot agree with what filled it — whichever form, or both forms,
 * the template wrote. A slot with no value is left as it is, unless
 * `fallback` names one.
 */
export function fillKoTemplate(
  template: string,
  values: Record<string, string | undefined>,
  fallback?: (key: string) => string,
): string {
  return template.replace(
    SLOT_RE,
    (whole: string, key: string, closers: string, dual: string | undefined, single: string | undefined) => {
      const value = values[key] || (fallback ? fallback(key) : undefined);
      if (value === undefined) return whole;
      const particle = dual ?? single;
      return value + closers + (particle ? koParticle(value, particle) : '');
    },
  );
}
