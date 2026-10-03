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
 *
 * 2026-10-03 (p7 #114): while OpenAI moderation is down this list is the
 * ONLY crisis signal, and it had no method statements ("I'm going to hang
 * myself tonight", "jump off a bridge"), missed "isn't worth living" and
 * "thinking about ending it", and had nothing in Japanese, Korean or
 * Chinese although the whole app ships in them. Those are added below with
 * the same bias: an ambiguous colloquialism (想死你了 "miss you to death",
 * 楽になりたい "I want relief") trips — a moderator dismisses a false alarm
 * in seconds; a miss is a person in crisis looking at an ordinary feed.
 * Tests: src/test/golden/crisis.test.ts.
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

  // ── 2026-10-03 (p7 #114): methods, and the phrasings the list missed ──
  // A stated method: hang / drown / shoot / stab / poison / gas / suffocate /
  // electrocute / unalive myself ("shoot myself in the foot" stays false).
  /\b(?:hang|hanging|hanged|drown|drowning|shoot|shooting|stab|stabbing|poison|poisoning|gas|gassing|suffocate|suffocating|electrocute|electrocuting|unalive|unaliving)\s+my\s*self\b(?!\s+in\s+the\s+foot)/i,
  /\bunaliv(?:e|ing|ed)\b/i,
  // jump / throw myself off or from a bridge, building, roof, cliff, balcony, tower
  /\b(?:jump|jumping|leap|leaping|throw\s+my\s*self|throwing\s+my\s*self)\s+(?:off|from|out\s+of)\s+(?:a|an|the|this|that|my)?\s*(?:\w+\s+){0,3}(?:bridge|building|roof|rooftop|cliff|balcony|tower|window|ledge|overpass)\b/i,
  // in front of a train / bus / car / truck
  /\b(?:jump|jumping|step|stepping|throw\s+my\s*self|walk|walking|lie|lying)\s+in\s+front\s+of\s+(?:a|an|the)\s+(?:train|bus|car|truck|lorry|subway)\b/i,
  // slit / slash / cut my wrists
  /\b(?:slit|slitting|slash|slashing|cut|cutting|open|opening)\s+(?:my|both\s+my)\s+wrists?\b/i,
  // "isn't / is not / ain't worth living", "life isn't worth it anymore"
  /\b(?:\w+n['’]?t|not)\s+worth\s+living\b/i,
  new RegExp(`\\blife\\s+(?:is\\s*n${A}t|is\\s+not|isnt)\\s+worth\\s+it\\b`, "i"),
  // thinking about / of ending it, killing myself, suicide, dying
  /\b(?:think|thinks|thinking|thought|thoughts)\s+(?:about|of)\s+(?:ending\s+(?:it|it\s+all|my\s+life|things|everything)|killing\s+my\s*self|suicide|taking\s+my\s+(?:own\s+)?life|dying)\b/i,
  // plan(s) to die, written a note / goodbye letter
  /\b(?:wrote|written|writing)\s+(?:my\s+)?(?:suicide|goodbye)\s+(?:note|letter)\b/i,

  // ── Japanese ── (no \b: CJK characters are not "word" characters)
  /死にたい|死にたく|しにたい|シニタイ|死のうと|死んでしまいたい|死んじゃいたい/,
  /消えたい|消えてしまいたい|消えてなくなりたい|いなくなりたい/,
  /自殺|自死|自傷|リスカ|リストカット|オーバードーズ|首を吊|首吊り|首をつ[るり]/,
  /飛び降り(?:たい|る|よう|て)|身投げ|命を絶/,
  /生きていたくない|生きてたくない|生きたくない|生きる(?:の|こと)が(?:つらい|辛い|しんどい)/,
  /生きて(?:いる|る)?意味(?:が|は)?(?:ない|無い|わからない)|生きる意味(?:が|は)?(?:ない|無い)/,
  /楽になりたい|終わりにしたい|全部終わらせたい|この世から/,

  // ── Korean ──
  /죽고\s*싶|죽어\s*버리고\s*싶|죽으려고/,
  /자살|자해|극단적\s*(?:선택|인\s*선택)/,
  /목을\s*매|뛰어\s*내리|투신|손목을\s*긋|약을\s*(?:다\s*)?먹고\s*죽/,
  /살고\s*싶지\s*않|살기\s*싫|살\s*이유가\s*없|사는\s*게\s*의미가\s*없|사라지고\s*싶|삶을\s*끝내|생을\s*마감/,

  // ── Chinese (simplified and traditional) ──
  /想死|不想活|活不下去|不想再活|活着没(?:有)?意思|活著沒(?:有)?意思|活着没(?:有)?意义|活著沒(?:有)?意義/,
  /自杀|自殺|轻生|輕生|自残|自殘|自伤|自傷|寻死|尋死|一了百了/,
  /割腕|上吊|跳楼|跳樓|跳河|跳桥|跳橋|结束(?:自己的)?生命|結束(?:自己的)?生命|了结自己|了結自己|吃安眠药|吃安眠藥/,
];

export function detectCrisis(text: string): boolean {
  for (const re of CRISIS_PATTERNS) if (re.test(text)) return true;
  return false;
}
