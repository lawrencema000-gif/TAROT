// 六爻 (Liù Yáo, “six lines”) — INTERPRETATION CONTENT.
//
// SCOPE: text only. This module performs no calculation and imports nothing.
// It does not cast, it does not do 納甲 (assigning a stem-branch to each line),
// it does not derive a line’s family role from the palace element, it does not
// place the spirits from the day stem, and it does not locate 世/應. All of
// that lives in `src/data/liuYao.ts`. The dependency runs ONE WAY —
// liuYao.ts → liuYaoContent.ts — so that the engine can be tested without
// dragging 40 KB of prose in, and so there is no import cycle. Do not add an
// import from liuYao.ts here, not even a type-only one.
//
// The hexagram layer itself (names, judgements, images, the 64 meanings, the
// coin toss) already exists in `src/data/ichingHexagrams.ts` and is NOT
// duplicated here. 六爻 is an additional reading layer over the same cast.
//
// KEY SETS. The three union types below are declared locally and deliberately
// NOT exported: `src/data/liuYao.ts` owns the canonical `Palace`, `Relative`
// and `Spirit` definitions, and re-exporting identically-named types from two
// modules is a trap for anyone who later adds a barrel. The keys here must
// stay character-for-character identical to that module’s — a test that walks
// `Object.keys()` of each record against the engine’s union will catch drift.
//
// ── WHAT THIS FEATURE IS, AND WHAT IT IS NOT ─────────────────────────────────
//
// Everything in this file is written as a symbolic aid to reflection. It is
// not prediction, and it must never read as one. Three specific edits were
// made to the classical material to keep that true, and they are the whole
// reason this header is long:
//
//   1. 白虎 and 螣蛇 are, in the source texts, frankly grim — 白虎 is glossed
//      “主凶灾，横祸，主伤病灾、牢狱之灾，血光之灾” (calamity, injury,
//      imprisonment, bloodshed) and 螣蛇 “主虚惊怪异之事，也主牢狱之灾”. That
//      is the mainstream reading and it is not softened away here; both are
//      still written as genuine difficulty and genuine anxiety. What IS
//      changed is the frame: they are described as conditions that pass and
//      can be worked with, not as omens of harm arriving. See [F][G].
//   2. 官鬼 classically covers illness and litigation directly (see [H], a
//      whole treatise on 六爻占疾病). This file renders it as pressure,
//      authority, and the thing that has power over you. NO medical, legal or
//      financial claim appears anywhere in this module, by rule.
//   3. 妻財 literally reads “wife/wealth” and the classical sources are
//      explicitly gendered (“占妻子、愛人…僕人”, [B]). The mainstream *function*
//      — what you have command over, income, and a partner or dependant inside
//      that — is what is implemented; the gendering is not. 官鬼 carries the
//      symmetric partner sense, ungendered in the same way.
//   4. 玄武. [F] and [G] lead with 盜竊/欺瞞 (theft, deception). Rendered as
//      concealment and undisclosed motive, which is the same observation without
//      accusing a named person of a crime on the strength of a coin toss.
//   5. 勾陳. [F]’s 牢獄、拘留、官訟 block (imprisonment, detention, litigation) is
//      NOT reproduced, under the no-legal-claims rule.
//
//   That is the complete list, not an illustrative one — five departures, and
//   the file’s credibility rests on this list being exhaustive.
//
// ── SOURCES (cross-checked; per-entry citations appear inline) ───────────────
//   [A] Guanyitang wiki — “What Is Liu Yao? Coin Casting, Na Jia, the Six
//       Relatives and the Answering Line”. The clearest English statement of
//       the classical-I-Ching-vs-六爻 distinction, of 納甲 as the defining
//       step, of the six relatives’ domains, and of the rule that 應 always
//       sits three positions from 世.
//       https://guanyitang.com/en/wiki/liuyao
//   [B] 六神，父母，兄弟，子孫，妻財，官鬼，世爻就是自己 (vocus, zh-TW) — the
//       six relatives’ domains and the statement that 世爻 represents oneself.
//       https://vocus.cc/article/677d4166fd897800018925b3
//   [C] 断易奥義（用神）(007.boo.jp, JP) — the same five roles as 用神, from the
//       independent Japanese 断易 line of transmission. Useful precisely
//       because it is not a copy of the Chinese web material.
//       http://007.boo.jp/daneki/kiso1/youjin.html
//   [D] 一卦有六爻，分排六親 (潘廷易經, pixnet) — states the derivation rule
//       verbatim: 「生我者父母，我生者子孫，剋我者官鬼，我剋着妻財，比和者
//       兄弟」. This is the page RELATIVE_FROM_PALACE_RULE is sourced to.
//       https://mink0303.pixnet.net/blog/posts/16067315822
//       Corroborated by 六爻基础知识：六亲 (知乎), which gives the same formula
//       plus the domain lists — that page returns 403 to automated fetch and
//       was read only as indexed search text, so it is backup, not a citation.
//       https://zhuanlan.zhihu.com/p/550879993
//   [E] UAYA — Wen Wang Gua / Liu Yao Method, Eight Palaces (八宮). Source for
//       the palace→element assignment used in PALACE_MEANINGS.
//       https://uaya.org/learn/iching/advanced-studies/frameworks/eight-palaces-ba-gong/wen-wang-gua-liu-yao-method/
//   [F] 六獸（六神）釋義 (udn 部落格) — the six spirits with direction and
//       element: 青龍 東方木, 朱雀 南方火, 勾陳 中央戊土, 螣蛇 中央己土,
//       白虎 西方金, 玄武 北方水.
//       https://blog.udn.com/DejaVu/4261917
//   [G] 六爻六神含义详解 (易阳子) — a second, independent rendering of the same
//       six spirits. [F] and [G] agree on every element and on the core
//       symbolism, which is why the spirit entries below are stated plainly.
//       https://www.yyzfs.ren/a/jichu/20240228/277.html
//   [H] 六爻占疾病大全 (sina) — cited only to establish that the classical
//       material really does assign illness to 官鬼 directly, so that the
//       decision NOT to reproduce that is a documented choice rather than an
//       omission. NOTE: this page was never rendered — it is known here only
//       from indexed search text (「官鬼爻代表疾病本身」, 「官鬼持世…病不離身」).
//       It supports no positive claim in this file, only a deliberate absence.
//       https://k.sina.cn/article_3876048085_e707ccd5001001qhl.html
//   [I] 說卦傳 (ctext) — 「乾，健也；坤，順也；震，動也；巽，入也；坎，陷也；
//       離，麗也；艮，止也；兌，說也」, the classical one-word character of each
//       trigram. This is the backbone of PALACE_MEANINGS.
//       https://ctext.org/book-of-changes/shuo-gua/zh
//
// ── CONFLICTS AND HOW THEY WERE RESOLVED ─────────────────────────────────────
//   - 勾陳 is keyed `hookSnake` and 螣蛇 `soaringSnake`. `hookSnake` is a poor
//     name for 勾陳 (which is a hooking/entangling constellation, not a snake),
//     but the key set is fixed by the engine module and the position in the
//     canonical order 青龍→朱雀→勾陳→螣蛇→白虎→玄武 is unambiguous. Keys are
//     the engine’s; the `cn` field below is authoritative for which spirit is
//     which.
//   - 螣蛇 vs 騰蛇: both spellings appear in print ([F] uses 騰蛇 in body text,
//     [G] uses 螣蛇). 螣蛇 is used here, matching the key-set gloss given for
//     this module.
//   - Sources disagree on how much weight the spirits carry. Some treat them
//     as decisive; the mainstream position — and the one implemented — is that
//     they colour a line rather than decide it (“六神不参与卦的主要成败判断”).
//     SPIRIT_MEANINGS is therefore written as flavour, not verdict.
//   - 白虎/螣蛇/官鬼: see items 1-2 above. Where the sources and the product’s
//     duty of care conflict, the duty of care wins and the divergence is
//     recorded rather than hidden.
//
// VOICE (match `src/data/ziweiContent.ts` and `src/data/lunarMansionsContent.ts`):
// warm, second-person, specific; describe a tendency and the work it asks for,
// never a fixed fate and never a verdict.

/** The eight hexagram families (八宮). Canonical copy lives in liuYao.ts. */
type Palace = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun';

/** The five family roles (六親). Canonical copy lives in liuYao.ts. */
type Relative = 'parent' | 'sibling' | 'offspring' | 'wealth' | 'officer';

/** The six spirits (六神/六獸). Canonical copy lives in liuYao.ts. */
type Spirit =
  | 'azureDragon'
  | 'vermilionBird'
  | 'hookSnake'
  | 'soaringSnake'
  | 'whiteTiger'
  | 'darkWarrior';

/* ────────────────────────────────────────────────────────────────────────
 * 1. Framing — what 六爻 does that a plain I Ching reading does not
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Introduction shown above a 六爻 reading. Written for a Western reader who
 * has probably met the I Ching but not this method. [A]
 *
 * The distinction in sentences 1-4 is the thing the whole feature rests on —
 * if a reader leaves thinking 六爻 is just the I Ching with extra decoration,
 * every screen after this one will read as noise.
 */
export const LIUYAO_INTRO: string =
  'Classical I Ching answers a question by reading the hexagram’s wisdom text — the Judgement, the Image, the counsel each line offers — and asks you to sit with it. 六爻, “six lines”, takes the very same cast and treats it as a diagnostic instrument instead. Every line is tagged with a heavenly stem and an earthly branch, and from that branch’s element the line takes a family role — parent, sibling, offspring, wealth or officer — while one of six spirits is laid across the six positions according to the stem of the day you asked. One line is then marked 世, your own position in the matter, and another 應, the other party or the world you are dealing with. The reading is judged not by what the hexagram says but by how those tagged lines feed, drain, support or clash with one another and with the energy of the day and month the question was asked in — so the hexagram stops being a poem and becomes a map of where the leverage sits. Treat all of it as a symbolic method for reflection rather than prediction: it describes the shape of a situation as you are currently holding it, and nothing it shows you is fixed.';

/* ────────────────────────────────────────────────────────────────────────
 * 2. The six relatives (六親)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The five family roles a line can carry. [A][B][C][D]
 *
 * Only five roles for a thing called “six relatives” — the sixth member of the
 * set is 世爻, you, which is a POSITION rather than a role and so lives in
 * {@link WORLD_RESPONSE_NOTE} instead. [B]
 *
 * `asks` is the one-sentence instruction when the role is prominent, and is
 * always an action the reader can actually take.
 */
export const RELATIVE_MEANINGS: Record<
  Relative,
  { cn: string; title: string; text: string; asks: string }
> = {
  /**
   * 父母 — 生我者父母 [D]. Domains from [A] (“teachers, dwellings, writings,
   * clothing”), [B] (師長, 房屋, 車子, 文章, 契約) and [C] (建築材料, 手紙,
   * 雑誌 — documents and the things that shelter you).
   */
  parent: {
    cn: '父母',
    title: 'Support and Shelter',
    text: 'The parent line is everything that holds you up and everything that covers you — elders and teachers, the roof over your head, the vehicle that carries you, and the paperwork that makes a thing official. It governs study, contracts, credentials, documents, and the long unglamorous effort of getting something properly in order. When it is strong the ground under the question is solid and the formal side is handled. When it is prominent the reading is usually pointing at preparation, permission, or someone older and more established than you, rather than at the outcome you were actually asking about.',
    asks: 'Do the groundwork — read the document, ask the person who has done this before, and make sure the thing is properly underpinned before you push on it.',
  },

  /**
   * 兄弟 — 比和者兄弟 [D]: the same element as the palace, hence peers.
   * Its classical function is 劫財, competing for the same resource; the
   * standing formula is that when 兄弟 is strong or repeated, 妻財 is spent.
   * [B][C], drain-on-wealth from the 六爻 disease/wealth literature [H].
   */
  sibling: {
    cn: '兄弟',
    title: 'Peers and Shared Resources',
    text: 'The sibling line is anyone standing at your level — brothers and sisters, friends, colleagues, competitors, and everyone else reaching for the same thing you are. Because it shares your element it also shares your supply, so a strong sibling line is the classic sign of a resource being split: the same budget, the same attention, the same hours going further than they can stretch. It is not hostility; it is arithmetic, and it is just as often your own scattered commitments as another person. When it dominates, the question is rarely whether you can do the thing and usually whether there is anything left to do it with.',
    asks: 'Count what is actually being shared — money, time, or attention — and decide deliberately who gets it, rather than letting it be divided by default.',
  },

  /**
   * 子孫 — 我生者子孫 [D]. Domains: children, students, practitioners, animals,
   * remedies [A][B]. Its structural role is that it restrains 官鬼 ([C]:
   * 「鬼を抑制する」), which is why it reads as relief.
   */
  offspring: {
    cn: '子孫',
    title: 'Relief and Ease',
    text: 'The offspring line is what you produce and what lightens you — children and students, play, craft, care, and the small pleasures that quietly restore a person. In the structure of a reading it is the role that holds pressure in check, which is why it is traditionally called the line of ease: where it is strong, worry has somewhere to dissolve. It also covers the people you look after and the people who look after you, and the honest enjoyment that makes the rest sustainable. When it is prominent the reading is often saying that the situation is less dangerous than it feels and that recovery is available if you will take it.',
    asks: 'Let something go and take the rest that is on offer — this is a moment to lighten the load rather than to grip harder.',
  },

  /**
   * 妻財 — 我剋者妻財 [D]: the element you control, hence the resource in your
   * hands. Domains: money, goods, valuables, trade, wages [B][C].
   * Rendered ungendered — see header note 3.
   */
  wealth: {
    cn: '妻財',
    title: 'Resources and Provision',
    text: 'The wealth line is the resource you have some command over — income, goods, tools, savings, and the practical means a plan actually runs on. It also covers a partner or dependant who sits inside what you have command over and are responsible for — 我剋, the same direction as the goods — which is why the classical name pairs partner and property in one word; read the relation rather than the gender. As the thing you control it is also the thing you can overspend, and it is the first casualty when the sibling line is busy. When it is strong the material side of the question is workable; when it is weak the reading is usually about capacity rather than desire.',
    asks: 'Look plainly at what you actually have to work with, and match the size of the plan to it instead of the other way round.',
  },

  /**
   * 官鬼 — 剋我者官鬼 [D]: the element that controls you. Domains: rank,
   * office, authority, adversaries, trouble [A][C]. Classical texts also
   * assign it illness and litigation directly [H] — deliberately not
   * reproduced; see header note 2.
   */
  officer: {
    cn: '官鬼',
    title: 'Pressure and Authority',
    text: 'The officer line is whatever has power over you in this matter — a boss, an institution, a rule, a deadline, a rival with leverage, or a demand you did not get to negotiate. It also carries the partner whose position, commitments or authority you are measured against — the symmetric counterpart to the wealth line’s partner sense, and ungendered in the same way. Its two faces are the same force seen from different sides: it is position, standing and legitimate authority when you hold it, and it is strain and constraint when it holds you. Where it is strong the situation has a gatekeeper, and pretending otherwise costs you time. When it dominates a reading, the useful question is not how to escape the pressure but who or what is actually applying it, because pressure with a name can be answered.',
    asks: 'Name the specific thing with power here and deal with it directly, rather than working around a pressure you have never made explicit.',
  },
};

/**
 * The derivation rule behind {@link RELATIVE_MEANINGS}, as data.
 *
 * A line’s family role is not stored anywhere — it is COMPUTED, from the
 * five-element relation between that line’s branch element and the element of
 * the palace the hexagram belongs to. The classical formula is a single line:
 *
 *   生我者父母，我生者子孫，剋我者官鬼，我剋者妻財，比和者兄弟 [D]
 *
 * “我” is the palace. This module does not perform that computation — the
 * table lives in `src/data/liuYao.ts` — but it states the rule in a
 * machine-comparable form so a test can walk the engine’s derived table and
 * prove the two agree. Getting the direction backwards silently swaps 父母
 * with 子孫 and 官鬼 with 妻財, which is exactly the class of defect this
 * pattern exists to catch, so read `relation` carefully:
 *
 *   `relation` is the LINE element’s relation TO the palace element.
 *     'produces'     — line generates palace  (line 生 palace)  → 父母
 *     'producedBy'   — palace generates line  (palace 生 line)  → 子孫
 *     'controls'     — line overcomes palace  (line 剋 palace)  → 官鬼
 *     'controlledBy' — palace overcomes line  (palace 剋 line)  → 妻財
 *     'same'         — identical element      (比和)             → 兄弟
 */
export const RELATIVE_FROM_PALACE_RULE: Record<
  Relative,
  {
    cn: string;
    /** The line element’s relation to the palace element. */
    relation: 'produces' | 'producedBy' | 'controls' | 'controlledBy' | 'same';
    /** The clause of the classical formula this entry encodes. */
    formula: string;
  }
> = {
  parent: { cn: '父母', relation: 'produces', formula: '生我者父母' },
  offspring: { cn: '子孫', relation: 'producedBy', formula: '我生者子孫' },
  officer: { cn: '官鬼', relation: 'controls', formula: '剋我者官鬼' },
  wealth: { cn: '妻財', relation: 'controlledBy', formula: '我剋者妻財' },
  sibling: { cn: '兄弟', relation: 'same', formula: '比和者兄弟' },
};

/* ────────────────────────────────────────────────────────────────────────
 * 3. The six spirits (六神/六獸)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The six spirits, in the canonical order 青龍 → 朱雀 → 勾陳 → 螣蛇 → 白虎 →
 * 玄武, which is the order the engine places them in from the day’s stem. [F][G]
 *
 * These COLOUR a line — they say what flavour the thing has, not whether it
 * works out. That is the mainstream position (六神不参与卦的主要成败判断) and
 * it is why nothing below is written as a verdict.
 *
 * `whiteTiger` and `soaringSnake` are the two that most need care. They are
 * written as real difficulty and real anxiety — softening them into nothing
 * would make the whole system dishonest — but as weather rather than fate.
 * See header note 1.
 */
export const SPIRIT_MEANINGS: Record<Spirit, { cn: string; title: string; text: string }> = {
  /** 青龍 — 東方木; 主吉慶、財帛、喜事、酒色. [F][G] */
  azureDragon: {
    cn: '青龍',
    title: 'Azure Dragon — Wood, East',
    text: 'The Azure Dragon brings warmth, celebration and an easy dignity to whatever line it sits on, and it is the spirit most associated with good feeling — occasions, generosity, romance, things going pleasantly right. Where it lands, the matter tends to be open and above board, and people are inclined to be decent about it. Its own excess is indulgence: the dragon enjoys itself, and can enjoy itself past the point where anything is getting done.',
  },

  /** 朱雀 — 南方火; 主口舌是非、文書、信息、通訊. [F][G] */
  vermilionBird: {
    cn: '朱雀',
    title: 'Vermilion Bird — Fire, South',
    text: 'The Vermilion Bird is everything spoken and sent — conversation, argument, announcements, messages, documents, and the speed at which all of it travels. On a line it turns the matter verbal: things get said, written down, forwarded, and occasionally misheard on the way. Its heat is useful when you need to be heard and expensive when you speak before you have decided what you actually mean.',
  },

  /**
   * 勾陳 — 中央戊土; 主田土、契約、勾連牽絆、遲滯. [F][G]
   * Key name is the engine’s; `cn` is authoritative. See header conflicts note.
   */
  hookSnake: {
    cn: '勾陳',
    title: 'Hooked Array — Earth, Centre',
    text: 'Hooked Array is slowness and entanglement — old business, land and property, standing arrangements, and the way one thing turns out to be attached to three others. On a line it says the matter will not move quickly and cannot be moved cleanly, because something is hooked into it. It also carries steadiness and plain honesty, so its drag is not always a problem: this is the spirit of things that take the time they take.',
  },

  /**
   * 螣蛇 — 中央己土; 主虛驚、怪異、夢寐、纏繞. [F][G]
   * Written as anxiety and strangeness, explicitly as a passing condition.
   */
  soaringSnake: {
    cn: '螣蛇',
    title: 'Soaring Snake — Earth, Centre',
    text: 'The Soaring Snake is the spirit of unease — odd coincidences, vivid dreams, suspicion, and the particular kind of worry that coils around a thought at three in the morning. Its classical name is 虛驚, an alarm that turns out to be hollow, and that is the honest reading: the anxiety here is genuine and uncomfortable, but it is usually larger than the thing it is about. Where it sits, slow down and check the facts before acting on the feeling, and expect the strangeness to pass rather than resolve into something.',
  },

  /**
   * 白虎 — 西方金; classically 主凶災、傷病、血光 [F][G]. Reframed as force,
   * abruptness and hard passages; no injury, illness or death claim. See
   * header note 1.
   */
  whiteTiger: {
    cn: '白虎',
    title: 'White Tiger — Metal, West',
    text: 'The White Tiger is force without cushioning — abrupt news, blunt words, hard edges, and the moments that arrive faster than you would have chosen. This is the most difficult of the six and there is no use dressing it up: where it sits, something is likely to be strenuous, unsentimental, or simply harder than the rest of the reading. It is also decisiveness and real courage, and it is weather rather than fate — a tiger is a season you get through, and the line it sits on tells you where to brace and be careful, not what will happen to you.',
  },

  /** 玄武 — 北方水; 主曖昧不明、隱私、盜竊等. [F][G] */
  darkWarrior: {
    cn: '玄武',
    title: 'Dark Warrior — Water, North',
    text: 'The Dark Warrior is what is not in plain view — private motives, unstated intentions, things kept quiet, and information that is technically available but nobody has volunteered. On a line it suggests the matter has a hidden dimension and that what you have been told is not the whole shape of it. The classical sources lead with concealment and theft; the honest modern reading is that someone may not be telling you everything — which is often ordinary discretion rather than bad faith, but either way it means ask directly instead of assuming you already know.',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * 4. The eight palaces (八宮)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Temperament of each hexagram family. Every hexagram belongs to one of eight
 * palaces headed by a trigram, and the palace’s element is what the line roles
 * are measured against — it is the “me” in 生我者父母、我剋者妻財. [A][E]
 *
 * Element assignments from [E]: 乾 Metal, 兌 Metal, 離 Fire, 震 Wood, 巽 Wood,
 * 坎 Water, 艮 Earth, 坤 Earth. Character from 說卦傳 [I] — 乾健、坤順、震動、
 * 巽入、坎陷、離麗、艮止、兌說 — which is the oldest and least disputed thing
 * anyone says about the trigrams, and so the safest backbone for prose.
 */
export const PALACE_MEANINGS: Record<Palace, { cn: string; element: string; text: string }> = {
  /** 乾 — 健也 [I]; Metal [E]. */
  qian: {
    cn: '乾宮',
    element: 'Metal',
    text: 'The Qian palace is 健 — tireless, initiating, and inclined to lead whether or not it was asked to. Hexagrams from this family read as questions of authority and effort, where the risk is force applied past the point it was useful.',
  },

  /** 兌 — 說(悅)也 [I]; Metal [E]. */
  dui: {
    cn: '兌宮',
    element: 'Metal',
    text: 'The Dui palace is 說 — pleasure, openness and easy speech, the family of exchange and good company. Its hexagrams turn on what is enjoyed and what is said, and its weakness is a charm that avoids the difficult sentence.',
  },

  /** 離 — 麗也 (to cling, to shine) [I]; Fire [E]. */
  li: {
    cn: '離宮',
    element: 'Fire',
    text: 'The Li palace is 麗 — brightness that clings to what it burns on, clarity, visibility and attachment. Its hexagrams are about seeing and being seen clearly, and about the fact that a fire depends entirely on what it rests upon.',
  },

  /** 震 — 動也 [I]; Wood [E]. */
  zhen: {
    cn: '震宮',
    element: 'Wood',
    text: 'The Zhen palace is 動 — shock, movement, and the jolt that starts things going after a long stillness. Its hexagrams tend to arrive with noise and urgency, and their work is keeping your footing while the ground is moving.',
  },

  /** 巽 — 入也 [I]; Wood [E]. */
  xun: {
    cn: '巽宮',
    element: 'Wood',
    text: 'The Xun palace is 入 — penetrating gently, the way wind gets everywhere and roots find their way through stone. Its hexagrams favour persistence, influence and gradual entry over confrontation, and its shadow is indirectness that never quite states its case.',
  },

  /** 坎 — 陷也 [I]; Water [E]. */
  kan: {
    cn: '坎宮',
    element: 'Water',
    text: 'The Kan palace is 陷 — depth, hazard and the passage that has to be gone through rather than around. Its hexagrams deal in risk and in what you learn by repetition, and they reward sincerity and steady nerve over cleverness.',
  },

  /** 艮 — 止也 [I]; Earth [E]. */
  gen: {
    cn: '艮宮',
    element: 'Earth',
    text: 'The Gen palace is 止 — stopping, boundary, and the stillness of a mountain that has nowhere it needs to be. Its hexagrams are about knowing where to draw the line and when not to act, which reads as wisdom or as stubbornness depending on the timing.',
  },

  /** 坤 — 順也 [I]; Earth [E]. */
  kun: {
    cn: '坤宮',
    element: 'Earth',
    text: 'The Kun palace is 順 — receptive, yielding and capable of carrying almost anything without complaint. Its hexagrams favour supporting, nourishing and following the situation rather than driving it, and their caution is a patience that shades into never asking for your own.',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * 5. Reading notes — 世/應 and the moving lines
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 世爻 and 應爻. [A][B]
 *
 * The positions are not free: 應 always sits exactly three lines from 世, and
 * which line carries 世 is fixed by the hexagram’s generation within its
 * palace. The placement rule belongs to liuYao.ts; this is only the meaning.
 */
export const WORLD_RESPONSE_NOTE: string =
  'Before anything else is read, two of the six lines are marked: 世 (shì), the world line, is you — your position, your standing, your side of the matter as it actually is rather than as you would like it to be. 應 (yìng), the response line, is the other party: a person, an organisation, or simply the external situation you are up against, and it always sits exactly three lines away from 世, directly facing it. A reader looks at this pair first because almost every question is really a question about a relationship — who is stronger here, who is being supported, who is drawing on whom — and the two lines answer that before any of the finer detail is considered. If 世 and 應 support each other the matter has give in it; if they clash, the reading is describing friction you are probably already feeling.';

/**
 * Moving lines (動爻) and the changed hexagram (變卦). [A]
 *
 * The mechanics — 6 and 9 move and flip, 7 and 8 stay — already live in
 * `src/data/ichingHexagrams.ts` and are not restated here. One point worth
 * keeping straight, because it surprises people: the family roles in the
 * changed hexagram are still assigned from the ORIGINAL hexagram’s palace, so
 * the changed picture is a continuation of the same story, not a new one.
 */
export const MOVING_LINE_NOTE: string =
  'A moving line is the place where the situation is not sitting still — the point in the picture that is already in motion while you are asking about it. Because a moving line flips to its opposite, the six lines together produce a second, changed hexagram, and the natural mistake is to read that second picture as the ending. It is better read as the direction of travel: what this situation turns into if the movement already underway continues on its present course, with the roles and the palace of the original still attached to it. So the pair is a tendency, not a verdict — the first hexagram is where you are standing, the moving line is what is shifting under you, and the changed hexagram is where the shift is currently pointed.';
