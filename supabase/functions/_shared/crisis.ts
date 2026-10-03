/**
 * Crisis keyword detection for community posts, comments and the Whispering
 * Well. Pure (no Deno, no network) so it can be exercised from Node too.
 *
 * The bias is deliberate: a false positive shows someone a helpline banner
 * and puts their post in front of a moderator; a miss leaves a person who
 * said they want to die looking at an ordinary feed. Where a phrase is
 * ambiguous ("I could kill myself for forgetting"), it trips.
 *
 * 2026-10-03: "I do not want to be alive anymore" returned crisis:false —
 * the old list needed an "I want/am going/plan…" prefix before "kill
 * myself", only knew the straight apostrophe in "can't", and missed
 * "don't want to be alive", "wish I was dead" and "self-harming". The
 * patterns below cover those, with word boundaries, case-insensitive, and
 * both apostrophes (iOS and Android keyboards type ’ by default).
 *
 * Idioms that are clearly about something else ("this game kills me",
 * "my feet are killing me", "I'm dying to try it", "I want to live in
 * Kyoto") must stay false; the phrasings here never match a bare
 * "kill(s) me" or "dying to".
 */

// Apostrophe: straight, typographic, or dropped ("dont", "cant").
const A = "['’]?";
const DONT = `(?:do\\s+not|don${A}t)`;
const CANT = `(?:can${A}t|cannot|can\\s+not)`;
const ANYMORE = "(?:any\\s*more|any\\s+longer)";
// The end of a clause: punctuation, a line break, or the end of the text.
const CLAUSE_END = "\\s*(?:[.!?…,;:)]|\\n|$)";

export const CRISIS_PATTERNS: RegExp[] = [
  // "I want to / am going to / plan to / need to … kill / end / hurt myself"
  /\b(i\s+(want|am\s+going|plan|need|have\s+to)\s+(to\s+)?(kill|end|hurt|harm)\s+(myself|me))\b/i,
  // kill myself, killing myself, kill my self
  /\bkill(?:ing|ed)?\s+my\s*self\b/i,
  /\bsuicid(?:e|al|ally)\b/i,
  // end it all, end my life, end everything, ending it all
  /\bend(?:ing)?\s+(?:my\s+(?:own\s+)?life|it\s+all|everything)\b/i,
  /\bend\s+my\b/i,
  // "going to end it", "want to end it" — but not "end it with him"
  /\b(?:going\s+to|gonna|want\s+to|wanna|about\s+to)\s+end\s+it\b(?!\s+with\b)/i,
  /\b(?:take|taking)\s+my\s+(?:own\s+)?life\b/i,
  // don't / do not want to be alive | exist | be here (anymore)
  new RegExp(`\\b${DONT}\\s+want\\s+to\\s+(?:be\\s+alive|exist|be\\s+here)\\b`, "i"),
  // don't want to live — anymore, or at the end of the clause (not "…live in Kyoto")
  new RegExp(`\\b${DONT}\\s+want\\s+to\\s+(?:live|go\\s+on|keep\\s+living|wake\\s+up)(?:\\s+${ANYMORE}|${CLAUSE_END})`, "i"),
  /\b(?:never|not)\s+want\s+to\s+wake\s+up\b/i,
  // wish I was / were / had been dead, never born
  /\bwish\s+(?:that\s+)?i\s*(?:was|were|['’]?d\s+been|had\s+been|could\s+be)\s+(?:dead|gone|never\s+born)\b/i,
  /\bwish\s+(?:that\s+)?i\s*(?:['’]?d|had)\s+never\s+been\s+born\b/i,
  // want to die, wanna die, going to die by my own hand
  /\b(?:want|wanted|wanting|wanna)\s+(?:to\s+)?die\b/i,
  /\bbetter\s+off\s+(?:dead|without\s+me|gone)\b/i,
  // no reason / point to live, nothing to live for
  /\bno\s+(?:reason|point)\s+(?:to\s+|in\s+)?(?:live|living|be\s+here|being\s+alive|go\s+on)\b/i,
  /\bnothing\s+(?:left\s+)?to\s+live\s+for\b/i,
  /\bnot\s+worth\s+living\b/i,
  // can't go on / can't do this anymore / can't keep going
  new RegExp(`\\b${CANT}\\s+(?:do\\s+this|go\\s+on|keep\\s+going)\\s+${ANYMORE}`, "i"),
  new RegExp(`\\b${CANT}\\s+go\\s+on(?:\\s+like\\s+this|\\s+living)?${CLAUSE_END}`, "i"),
  // hurt / harm / cut / burn myself
  /\b(?:hurt|hurting|harm|harming|cut|cutting|burn|burning|starve|starving)\s+my\s*self\b/i,
  // self-harm in its spellings, and its -ing / -ed forms
  /\bself[\s\-‐–]?harm(?:ing|ed|s)?\b/i,
  // overdose, OD on pills, take all my pills
  /\boverdos(?:e|ed|es|ing)\b/i,
  /\b(?:od|o\.d\.)\s+on\b/i,
  /\b(?:take|taking|swallow|swallowing)\s+(?:all\s+(?:of\s+)?)?(?:my|the)\s+pills\b/i,
];

export function detectCrisis(text: string): boolean {
  for (const re of CRISIS_PATTERNS) if (re.test(text)) return true;
  return false;
}
