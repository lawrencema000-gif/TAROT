/**
 * Crisis keyword detection for community posts, comments, the Whispering
 * Well and the journal coach. Pure (no Deno, no network) so it can be
 * exercised from Node too.
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
 *
 * 2026-10-17 (p8 F01): but a false alarm is not free. A flagged post is
 * published as 'flagged' (only its author sees it, nothing in the app
 * publishes it later) and the author gets the helpline dialog instead of
 * "Posted". The method patterns had no subject, so they matched the way
 * this community describes cards — The Fool about to jump off a cliff,
 * figures jumping from The Tower, the Death card making people think of
 * dying — and "dying my hair", "end my relationship", 彼との関係を終わりに
 * したい, この世から争いがなくなりますように. A method now needs the
 * writer as its subject ("I'm going to jump off…", "I keep thinking about
 * dying", or "…myself"); "end my" needs a life; 終わりにしたい needs 人生 /
 * 命 / 自分 / 全部; この世から needs 消えたい / いなくなりたい.
 *
 * 2026-10-17 (p9 R00/R19/R15): the subject rule was too narrow — "I'm going
 * to go jump off a bridge tonight", "I've decided to jump off the building",
 * "I have a plan to end it tonight" and "nobody would miss me if I was gone"
 * returned false. Intent and decision words ("go", "decided", "plan to")
 * count as helpers again, and the "nobody would miss me / better off without
 * me" phrasings are covered. The ja/ko jump patterns matched the bare verb
 * (飛び降りよう, 뛰어내리려는), which is how a card is described; they now need
 * a desire, intention or decision, or a real-world place (a roof, a bridge,
 * the tracks). A moderator can publish a flagged post since 20261003000014,
 * so where a phrasing stays ambiguous, it still trips.
 *
 * 2026-10-17 (p9 Q29/Q32): F01 also stopped catching the object-less
 * 「もう終わりにしたい」 — the Japanese "I want to end it", which still trips in
 * English — and the journal coach ran an English-only regex of its own. The
 * coach now runs this module, so the gaps a Japanese, Korean or Chinese
 * journal entry would fall through matter here too: 「終わりにしたい」 with no
 * object trips again, and so do 그만 살고 싶 and 想消失. The helplines shown
 * for each language live at the end of the file (CRISIS_LINES).
 */

// Apostrophe: straight, typographic, or dropped ("dont", "cant").
const A = "['’]?";
const DONT = `(?:do\\s+not|don${A}t)`;
const CANT = `(?:can${A}t|cannot|can\\s+not)`;
const ANYMORE = "(?:any\\s*more|any\\s+longer)";
// The end of a clause: punctuation, a line break, or the end of the text.
const CLAUSE_END = "\\s*(?:[.!?…,;:)]|\\n|$)";
// The writer as the subject: "I", "I'm", "im", "I'll", "I'd", "I've", then
// up to six helper words — "I'm going to", "I want to", "I've been thinking
// about", "I feel like", "I'm about to" — and nothing else, so "I think the
// Fool is about to jump" stays false.
const I_SUBJECT = "\\b(?:i|im|i['’](?:m|ll|d|ve))";
// p9 R00/R19: "I'm going to go jump off a bridge tonight" and "I've decided
// to jump off the building" stopped tripping after F01 because "go" and
// "decided" were not helpers; the decision and intent words are now.
const HELPERS =
  "(?:am|will|would|could|might|should|shall|must|can|have|been|really|just|honestly|seriously|literally|" +
  "still|actually|almost|nearly|so|going|gonna|about|want|wanna|wanted|need|plan|planning|planned|feel|feeling|like|" +
  "keep|kept|thinking|think|thought|dream|dreaming|tempted|ready|try|tried|trying|considering|contemplating|to|of|" +
  "go|gone|decided|decide|deciding|intend|intending|intended|finally|probably|definitely|totally|already|" +
  "eventually|soon|prepared|preparing|willing|get|getting|got|start|starting|started|hope|hoping|wish|wishing)";
const FIRST_PERSON = `${I_SUBJECT}(?:\\s+${HELPERS}){0,6}\\s+`;
// For a stated method (jump / step in front of…), any words may stand between
// the writer and the verb — "I'm so close to jumping", "I keep picturing
// myself jumping", "I've made up my mind to jump", "I'd rather jump" — as long
// as none of them brings in another subject or a determiner, which is how a
// card is described ("I think the Fool is about to jump", "I saw a cat walking
// in front of the car"). (p9 review C00/C25: a helper whitelist missed all of
// these; up to eight words, proven against the F01 false positives.)
const OTHER_SUBJECT =
  "(?:he|she|they|it|we|you|the|a|an|this|that|these|those|his|her|their|its|someone|somebody|people|person|figures?|" +
  "everyone|everybody|nobody|man|woman|men|women|fool|card|cards|character|guy|girl|boy|friend)";
const FIRST_PERSON_LOOSE = `${I_SUBJECT}(?:\\s+(?!${OTHER_SUBJECT}\\b)[\\w'’]+){0,8}\\s+`;
// …or a clause that starts with the intent and no subject: "Gonna jump off
// a bridge.", "…so done, about to step in front of a train", "Thinking of
// jumping off a bridge.", "Tempted to…", "Part of me wants to…", "Might…".
const CLAUSE_INTENT =
  "(?:^|[.!?…,;:\\n(])\\s*(?:just\\s+|honestly\\s+|seriously\\s+|still\\s+|been\\s+)?(?:gonna|going\\s+to|wanna|want\\s+to|about\\s+to|ready\\s+to|might\\s+as\\s+well|might|tempted\\s+to|thinking\\s+(?:of|about)|part\\s+of\\s+me\\s+wants\\s+to|so\\s+close\\s+to)(?:\\s+go)?\\s+";
const WRITER_INTENDS = `(?:${FIRST_PERSON_LOOSE}|${CLAUSE_INTENT})`;
// Hair dye, misspelt as "die" ("I want to die my hair blue").
const NOT_DYE = "(?!\\s+(?:my|your|his|her|their|the|our)\\s+(?:hair|beard|brows|eyebrows|roots|tips|nails|clothes|shirt|jeans)\\b)";

export const CRISIS_PATTERNS: RegExp[] = [
  // "I want to / am going to / plan to / need to … kill / end / hurt myself"
  /\b(i\s+(want|am\s+going|plan|need|have\s+to)\s+(to\s+)?(kill|end|hurt|harm)\s+(myself|me))\b/i,
  // kill myself, killing myself, kill my self
  /\bkill(?:ing|ed)?\s+my\s*self\b/i,
  /\bsuicid(?:e|al|ally)\b/i,
  // end it all, end my life, end everything, ending it all — but not "end my
  // relationship" or "end everything with him" (p8 F01)
  // (p9 review C25: "end my pain / misery / days / torment" restored)
  /\bend(?:ing)?\s+(?:my\s+(?:own\s+)?(?:life|existence|suffering|pain|misery|days|torment)|it\s+all(?!\s+with\b)|everything(?!\s+with\b))\b/i,
  // "going to end it", "want to end it", "a plan to end it tonight", "I've
  // decided to end it" — but not "end it with him" (p9 R00: plans and
  // decisions were missing)
  /\b(?:going\s+to|gonna|want\s+to|wanna|about\s+to|plan(?:ning|ned)?\s+to|decided\s+to|ready\s+to|prepared\s+to|i['’]ll|i\s+will)\s+end\s+it\b(?!\s+with\b)/i,
  // "nobody would miss me", "no one would care if I died / was gone", "the
  // world would be better without me" (p9: no pattern covered them)
  // (…"miss me" that ends the clause or goes on "if I…", "anyway", "when
  // I'm gone" — not "nobody would miss me at the party")
  /\b(?:no\s*one|nobody|noone)\s+(?:would|will|['’]d)\s+(?:even\s+|really\s+)?(?:miss\s+me(?=\s*(?:[.!?…,;:)]|\n|$)|\s+(?:if|anyway|when\s+i)\b)|notice\s+(?:if\s+i|i['’]?m\s+gone))/i,
  /\b(?:no\s*one|nobody|noone)\s+(?:would|will|['’]d)\s+(?:even\s+|really\s+)?care\s+if\s+i\s+(?:died|was\s+dead|were\s+dead|was\s+gone|were\s+gone|disappeared|killed\s+my\s*self)\b/i,
  /\b(?:world|everyone|everybody|my\s+family)\s+(?:would\s+be|['’]d\s+be|is)\s+better\s+(?:off\s+)?without\s+me\b/i,
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
  new RegExp(`\\b(?:want|wanted|wanting|wanna)\\s+(?:to\\s+)?die\\b${NOT_DYE}`, "i"),
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
  // throw myself off / from a bridge, building, roof, cliff, balcony, tower;
  // jump or leap from one when the writer is the one jumping ("I'm going to
  // jump off a bridge") — not The Fool about to jump off his cliff, nor the
  // figures falling from The Tower (p8 F01)
  /\b(?:throw|throwing)\s+my\s*self\s+(?:off|from|out\s+of)\s+(?:a|an|the|this|that|my)?\s*(?:\w+\s+){0,3}(?:bridge|building|roof|rooftop|cliff|balcony|tower|window|ledge|overpass)\b/i,
  new RegExp(`${WRITER_INTENDS}(?:jump|jumping|leap|leaping)\\s+(?:off|from|out\\s+of)\\s+(?:a|an|the|this|that|my)?\\s*(?:\\w+\\s+){0,3}(?:bridge|building|roof|rooftop|cliff|balcony|tower|window|ledge|overpass)\\b`, "i"),
  // in front of a train / bus / car / truck: myself, or the writer stepping
  // ("a black cat walking in front of the car" stays false)
  /\b(?:throw|throwing)\s+my\s*self\s+in\s+front\s+of\s+(?:a|an|the)\s+(?:train|bus|car|truck|lorry|subway)\b/i,
  new RegExp(`${WRITER_INTENDS}(?:jump|jumping|step|stepping|walk|walking|lie|lying)\\s+in\\s+front\\s+of\\s+(?:a|an|the)\\s+(?:train|bus|car|truck|lorry|subway)\\b`, "i"),
  // slit / slash / cut my wrists
  /\b(?:slit|slitting|slash|slashing|cut|cutting|open|opening)\s+(?:my|both\s+my)\s+wrists?\b/i,
  // "isn't / is not / ain't worth living", "life isn't worth it anymore"
  /\b(?:\w+n['’]?t|not)\s+worth\s+living\b/i,
  new RegExp(`\\blife\\s+(?:is\\s*n${A}t|is\\s+not|isnt)\\s+worth\\s+it\\b`, "i"),
  // thinking about / of ending it, killing myself, suicide — but not
  // "ending things with him" (p8 F01)
  /\b(?:think|thinks|thinking|thought|thoughts)\s+(?:about|of)\s+(?:ending\s+(?:it\s+all|it|my\s+life|things|everything)(?!\s+with\b)|killing\s+my\s*self|suicide|taking\s+my\s+(?:own\s+)?life)\b/i,
  // …dying: when the writer is the one thinking it ("I keep thinking about
  // dying", or a clause that starts "Thinking about dying"), not "why does
  // everyone think of dying when they pull Death", nor "dying my hair"
  new RegExp(`${I_SUBJECT}(?:\\s+${HELPERS}){0,6}\\s+(?:think|thinking|thought)\\s+(?:about|of)\\s+dying\\b${NOT_DYE}`, "i"),
  new RegExp(`(?:^|[.!?…,;:\\n(])\\s*(?:still\\s+|always\\s+|been\\s+|keep\\s+|constantly\\s+)?thinking\\s+(?:about|of)\\s+dying\\b${NOT_DYE}`, "i"),
  // plan(s) to die, written a note / goodbye letter
  /\b(?:wrote|written|writing)\s+(?:my\s+)?(?:suicide|goodbye)\s+(?:note|letter)\b/i,

  // ── Japanese ── (no \b: CJK characters are not "word" characters)
  /死にたい|死にたく|しにたい|シニタイ|死のうと|死んでしまいたい|死んじゃいたい/,
  /消えたい|消えてしまいたい|消えてなくなりたい|いなくなりたい/,
  /自殺|自死|自傷|リスカ|リストカット|オーバードーズ|首を吊|首吊り|首をつ[るり]/,
  // Jumping: a desire, an intention or a decision, or a real-world place —
  // not the Fool about to jump from his cliff (愚者は崖から飛び降りようとして
  // いる) nor 清水の舞台から飛び降りる, "take the plunge" (p9 R15)
  /飛び降りたい|飛び降りたく|飛び降りようと(?:思|考え)|飛び降りる(?:つもり|しかない|ことにした|と決め)|飛び降りて(?:死に|死ぬ|しまいたい|楽に)/,
  /(?:屋上|ビル|マンション|橋|歩道橋|ホーム|ベランダ|窓)から飛び降り|(?:電車|線路|ホーム)に飛び込(?:みたい|もう|む)/,
  /身投げ|命を絶/,
  /生きていたくない|生きてたくない|生きたくない|生きる(?:の|こと)が(?:つらい|辛い|しんどい)/,
  /生きて(?:いる|る)?意味(?:が|は)?(?:ない|無い|わからない)|生きる意味(?:が|は)?(?:ない|無い)/,
  /楽になりたい/,
  // Ending one's life, oneself, or everything — not 関係を終わりにしたい (a
  // relationship), 仕事を終わりにしたい (a job) or 宿題を全部終わらせたい (p8 F01)
  /(?:人生|命|自分|自分自身|この人生|生きるの|生きること)(?:を|は|も)?(?:もう)?(?:終わりにしたい|終わらせたい|終わりにする|終わらせる)/,
  /(?:^|[。、．！？!?\s「『（(]|もう)(?:全部|すべて|全て|何もかも|なにもかも)(?:を)?(?:終わりにしたい|終わらせたい)/,
  // …and with no object at all: 「もう終わりにしたい」「疲れた。終わりにしたい。」,
  // the counterpart of "I want to end it" (p9 Q29: F01's narrowing dropped
  // it). A relationship or a job keeps its を (関係を終わりにしたい) and stays
  // false; so do 宿題を早く終わらせたい and 全部 after を or に. 早く right
  // after the clause start trips too: 「早く終わりにしたい…」 (p9 review C25).
  /(?:^|[。、．！？!?\s「『（(…‥]|もう)(?:もう)?(?:早く)?(?:終わりにしたい|終わらせたい)/,
  // この世から消えたい / いなくなりたい — not この世から争いがなくなりますように
  /この世から(?:消えたい|消えてしまいたい|消えてなくなりたい|いなくなりたい|居なくなりたい|去りたい|おさらばしたい)/,

  // ── Korean ──
  /죽고\s*싶|죽어\s*버리고\s*싶|죽으려고/,
  /자살|자해|극단적\s*(?:선택|인\s*선택)/,
  // Jumping: wanting, intending or deciding to, or a real-world place — not
  // the Fool card about to jump from its cliff (절벽에서 뛰어내리려는 모습) (p9 R15)
  /목을\s*매|투신|손목을\s*긋|약을\s*(?:다\s*)?먹고\s*죽/,
  /뛰어\s*내리고\s*싶|뛰어\s*내릴\s*(?:거|까|래|게|생각)|뛰어\s*내리려고\s*(?:해|했|한|하고)|(?:옥상|다리|건물|아파트|한강|베란다|창문)에서\s*뛰어\s*내리/,
  /살고\s*싶지\s*않|살기\s*싫|살\s*이유가\s*없|사는\s*게\s*의미가\s*없|사라지고\s*싶|삶을\s*끝내|생을\s*마감/,
  // "I want to stop living" (p9: 살고 싶지 않 / 살기 싫 did not cover it)
  /그만\s*살고\s*싶/,

  // ── Chinese (simplified and traditional) ──
  /想死|不想活|活不下去|不想再活|活着没(?:有)?意思|活著沒(?:有)?意思|活着没(?:有)?意义|活著沒(?:有)?意義/,
  // "I want to disappear" — the zh counterpart of 消えたい / 사라지고 싶 (p9:
  // only ja and ko had it); not 不想消失, nor 想让烦恼消失 (wanting a worry gone)
  /(?<!不)想(?:要)?消失/,
  /自杀|自殺|轻生|輕生|自残|自殘|自伤|自傷|寻死|尋死|一了百了/,
  // (跳楼价 is a "rock-bottom price", not a jump)
  /割腕|上吊|跳[楼樓](?![价價])|跳河|跳桥|跳橋|结束(?:自己的)?生命|結束(?:自己的)?生命|了结自己|了結自己|吃安眠药|吃安眠藥/,
];

export function detectCrisis(text: string): boolean {
  for (const re of CRISIS_PATTERNS) if (re.test(text)) return true;
  return false;
}

// ── The helplines, per language ─────────────────────────────────────────────
//
// What the community CrisisBanner shows (src/i18n/locales/<lng>/app.json,
// crisis.phone / crisis.text / crisis.footer), for the server surfaces that
// answer in text themselves: the journal coach answered a Japanese member
// with no line at all, and its prompt told the model to give the US 988 and
// 741741 (p9 Q32). The locale files are the source: crisis.test.ts fails when
// a line here differs from theirs.

export type CrisisLocale = "en" | "ja" | "ko" | "zh";

export interface CrisisLine {
  /** crisis.<phone|text>.title */
  title: string;
  /** crisis.<phone|text>.number */
  number: string;
  /** crisis.<phone|text>.body: the number, hours and where it serves */
  body: string;
}

export interface CrisisLines {
  phone: CrisisLine;
  text: CrisisLine;
  /** crisis.footer: not a medical service, and the emergency numbers */
  footer: string;
}

export const CRISIS_LINES: Record<CrisisLocale, CrisisLines> = {
  en: {
    phone: { title: "988 Suicide & Crisis Lifeline", number: "988", body: "Call or text 988 · 24/7 · US" },
    text: { title: "Crisis Text Line", number: "741741", body: "Text HOME to 741741 · US/UK/CA/IE" },
    footer: "Arcana is not a medical service. If you are in immediate danger, please call your local emergency number.",
  },
  ja: {
    phone: { title: "よりそいホットライン", number: "0120-279-338", body: "0120-279-338 · 24時間 · 通話無料" },
    text: { title: "こころの健康相談統一ダイヤル", number: "0570-064-556", body: "0570-064-556 · 通話料有料（ナビダイヤル）· 受付時間は地域により異なります" },
    footer: "Arcana は医療サービスではありません。緊急時は 119 または 110 に電話してください。",
  },
  ko: {
    phone: { title: "자살예방 상담전화", number: "109", body: "109 · 24시간 · 대한민국" },
    text: { title: "정신건강위기상담전화", number: "1577-0199", body: "1577-0199 · 24시간" },
    footer: "Arcana는 의료 서비스가 아니에요. 긴급한 상황이라면 119 또는 112로 전화하세요.",
  },
  zh: {
    phone: { title: "希望24热线", number: "400-161-9995", body: "400-161-9995 · 24小时 · 中国大陆" },
    text: { title: "北京心理危机研究与干预中心", number: "010-82951332", body: "010-82951332 · 24小时" },
    footer: "Arcana 不是医疗服务。紧急情况请拨打 120 或 110。",
  },
};

/** Lines for anywhere else (the banner's "International helplines" row). */
export const INTERNATIONAL_HELPLINES = "findahelpline.com";
