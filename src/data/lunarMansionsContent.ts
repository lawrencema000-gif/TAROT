// 二十八宿 — the Twenty-Eight Lunar Mansions — interpretation content.
//
// CONTENT ONLY. This module holds no calculation and imports nothing: no
// lunar conversion, no mansion-of-the-day count, no quadrant derivation.
// It is the text layer that `lunarMansions.ts` looks entries up in once it
// already knows which mansion a date or a birth falls in. Deliberately
// dependency-free so the two files cannot form an import cycle.
//
// ── KEY SCHEME ────────────────────────────────────────────────────────────
// Keys are lowercase pinyin. Five mansions collide when romanised, so they
// carry a descriptive suffix. `lunarMansions.ts` must use the same keys:
//   尾 → wei_tail      危 → wei_danger    胃 → wei_stomach
//   壁 → bi_wall       畢 → bi_net
// Every other key is its plain pinyin: jiao, kang, di, fang, xin, ji, dou,
// niu, nu, xu, shi, kui, lou, mao, zi, shen, jing, gui, liu, xing, zhang,
// yi, zhen.
//
// ── SOURCES ───────────────────────────────────────────────────────────────
// Each mansion's character is taken from the classical astronomical
// treatises, not from generic horoscope filler. Primary basis:
//
//   [1] 晉書·天文志 (Book of Jin, Treatise on Astronomy), 卷十一 — the
//       canonical 主事 ("what it governs") line for every one of the 28.
//       https://zh.wikisource.org/wiki/晉書/卷011
//   [2] 史記·天官書 (Records of the Grand Historian, Treatise on the
//       Celestial Offices) — the older epithets: 角為天關, 亢為疏廟,
//       氐為天根, 房為天駟, 心為明堂, 尾為九子, 箕為敖客.
//       http://www.sidneyluo.net/a/a01/027.htm
//   [3] 二十八宿 — asterism imagery, 四象 grouping, the 禽星 animal and the
//       seven-luminary/weekday attribution (角木蛟, 亢金龍, …).
//       https://zh.wikipedia.org/zh-tw/二十八宿
//       https://en.wikipedia.org/wiki/Twenty-Eight_Mansions
//   [4] 值日吉凶歌 / 二十八宿擇日法 — the day-selection tradition that gives
//       each mansion its 宜忌 (what the day suits and what it does not).
//       https://www.yixiansheng.com/article/4496.html
//       https://www.huangli.com/wenhua/14887.html
//   [5] 四象 (Four Symbols) — direction, season and element per quadrant.
//       https://en.wikipedia.org/wiki/Four_Symbols
//   [6] Tomb of Marquis Yi of Zeng (曾侯乙墓), c. 433 BCE — the lacquer chest
//       bearing all 28 mansion names around the graph 斗, the earliest known
//       complete list. https://en.wikipedia.org/wiki/Tomb_of_Marquis_Yi_of_Zeng
//
// ── A SOURCE CONFLICT, STATED PLAINLY ─────────────────────────────────────
// The 吉/凶 (auspicious/inauspicious) assignment per mansion is NOT stable
// across the almanac tradition. The widely-reproduced list [4] reads
// 角 as favourable and 亢 as unfavourable; at least one popular modern
// summary (yyzfs.ren, "二十八宿主事及吉凶详解") reverses those two and
// several of their neighbours — it appears to have shifted the 值日吉凶歌
// verses by one position, since the verses themselves ("角木蛟：嫁娶婚姻生
// 貴子" favourable / "亢金龍：兒孫新婦守空房" unfavourable) match [4].
// WE FOLLOW THE MAINSTREAM READING OF [4] AND [5]. Where a mansion is
// traditionally called 凶, we render it as a day that suits consolidating,
// tending and finishing rather than launching — which is what 擇日 actually
// encodes (fitness of an activity to a day), not misfortune. No entry here
// predicts harm, and none should ever be edited to.
//
// ── VOICE ─────────────────────────────────────────────────────────────────
// Warm, second person, specific. A tendency and the work it asks for —
// never a fixed fate, never a verdict, never doom. No medical, legal or
// financial claims. Anything health-adjacent points to a real professional.

/**
 * Introduction to the system for a reader who knows the twelve Western
 * signs and has never met the mansions. Honest about the mechanism: the
 * day-mansion is a calendrical count, not a live measurement of the Moon.
 */
export const MANSION_INTRO: string =
  'Long before anyone in China drew a twelve-sign zodiac, astronomers there divided the sky into twenty-eight uneven lodges — 二十八宿, the mansions — marking the band of stars the Moon travels through as it circles the Earth roughly every twenty-seven and a third days. The full list is already carved on a lacquer chest from a tomb sealed around 433 BCE, which makes this one of the oldest surviving maps of the sky anywhere, and it grew up entirely independent of the Greek and Babylonian signs; the two systems are not translations of each other and do not line up. Each of the twenty-eight is a stretch of sky with a name and a character — a horn, a heart, a winnowing basket, a wall — and the almanac tradition assigns one mansion to each day in an unbroken rotation, so that people could ask what a given day was fit for before they chose to build, marry, travel or begin. Be clear about how that rotation works: it is a count, one mansion per day cycling through all twenty-eight and starting again, so after a while it no longer tracks where the Moon actually is — it is a calendar rhythm, not an observation. Your birth mansion is read differently again: not a forecast, but a description of temperament — the particular gift you were handed and the particular work it keeps asking of you.';

/**
 * The four quadrants (四象). Direction, season and element per [5]; the
 * temperament of each is drawn from the shared character of its seven
 * mansions in [1].
 */
export const QUADRANT_MEANINGS: Record<
  'azureDragon' | 'blackTortoise' | 'whiteTiger' | 'vermilionBird',
  { cn: string; en: string; text: string }
> = {
  azureDragon: {
    cn: '東方青龍',
    en: 'Azure Dragon of the East',
    text: 'East, spring, and the element Wood — the quarter of the sky that opens the year. Its seven mansions run from the dragon’s horn to its tail, and between them sit the celestial gate, the inner court that hears petitions, and the Bright Hall where policy is declared, so this is the temperament of beginning, of standing upright, and of being answerable for what you start. Dragon-quarter people tend to lead early and grow fast; the work is staying with a thing long enough for the growth to become structure.',
  },
  blackTortoise: {
    cn: '北方玄武',
    en: 'Black Tortoise of the North',
    text: 'North, winter, and the element Water — the deep, still, inward quarter. Its seven mansions are the measuring dipper, the labouring ox, the weaver at her cloth, the void, the high roof, the palace and the library wall: storing, enduring, keeping records, holding vigil. This is a temperament of patience and interiority, good at preservation and at the long unwitnessed stretch — and its work is coming back out, because a store that is never opened stops being a store.',
  },
  whiteTiger: {
    cn: '西方白虎',
    en: 'White Tiger of the West',
    text: 'West, autumn, and the element Metal — the quarter of harvest and of the blade. Its seven mansions hold the armoury, the gathering-pen, the granary, the ears and eyes of heaven, the hunting net, the army’s scout and the reaping stroke, so the shared instinct is to see clearly, gather in what is ripe and cut what is finished. Tiger-quarter people are decisive and hard to fool; the work is warmth, because accuracy without kindness lands as judgement.',
  },
  vermilionBird: {
    cn: '南方朱雀',
    en: 'Vermilion Bird of the South',
    text: 'South, summer, and the element Fire — the bright, visible, expressive quarter. Its seven mansions include heaven’s southern gate, the eye that sees through deception, the imperial kitchen, the embroidered robes, the music bureau and the chariot that carries the load, which makes this the temperament of display, hospitality, perception and performance. Bird-quarter people are generous and easily seen; the work is substance, so that what people admire from a distance holds up close.',
  },
};

/**
 * All 28 mansions as birth signs. `title` renders the asterism’s own name;
 * `text` is grounded in that mansion’s classical 主事 per [1] and [2] and
 * its 禽星 animal per [3] — 心宿 (the throne, reward and punishment) and
 * 鬼宿 (the eye of heaven, seeing hidden schemes) are deliberately nothing
 * alike, and neither is interchangeable with any other entry.
 */
export const MANSION_MEANINGS: Record<string, { cn: string; title: string; text: string }> = {
  // ── 東方青龍 — Azure Dragon of the East ──────────────────────────────────
  jiao: {
    cn: '角',
    title: 'The Horn',
    // 晉書: 角二星爲天關，其間天門也 — the Celestial Gate, through which the
    // ecliptic and all seven luminaries pass. 史記: 角為天關. [1][2]
    text: 'The dragon’s horn is the Celestial Gate — the doorway the Sun, Moon and planets all pass through, which makes yours the temperament of the opening move. You go first without needing to be asked, you can see the way in when a situation looks sealed, and people follow you through doors you had not realised you were holding. The gift is initiative that reads as courage. The work is the middle and the end: a gate is not a road, and the thing you open is not finished until someone, preferably you, walks the whole length of it.',
  },
  kang: {
    cn: '亢',
    title: 'The Neck',
    // 晉書: 亢四星，天子之内朝也，總攝天下奏事，聽訟理獄録功者也 — the inner
    // court that hears petitions, judges disputes and records merit. The
    // graph 亢 also means high, upright, unyielding — cf. 亢龍有悔, the top
    // line of hexagram 乾 in the 易經. [1][2]
    text: 'The dragon’s raised neck is the inner court, where petitions are heard, disputes are settled and merit is written down. You hold yourself upright, you notice unfairness before anyone names it, and you will keep arguing a case long after it stops being comfortable. The gift is integrity that other people quietly rely on. The work is knowing when the neck has stiffened — the Book of Changes warns that the dragon who climbs too high has cause for regret, and your version of that is defending a position because it is yours rather than because it is right.',
  },
  di: {
    cn: '氐',
    title: 'The Root',
    // 晉書: 氐四星，王者之宿宮，后妃之府，休解之房 — the ruler's lodging
    // palace, the consorts' quarters, the chamber of rest and release.
    // 史記: 氐為天根. Animal 土貉, the badger. [1][2][3]
    text: 'Di is the root, and in the old records the ruler’s private lodging — the chamber of rest, where the day’s office is set down. You are one of the people who builds the base others stand on: dependable, unhurried, more interested in whether the foundation is sound than in how the façade photographs. The gift is that you make a real place to return to, for yourself and for the people you love. The work is coming back out of it, because your instinct for retreat is genuine restoration right up until it becomes a door you stop opening.',
  },
  fang: {
    cn: '房',
    title: 'The Chamber',
    // 晉書: 房四星，爲明堂，天子布政之宮也，亦四輔也 — the Bright Hall where
    // policy is issued, and the Four Assistants. 史記: 房為天駟, the four
    // celestial horses. Strongly favourable in the 值日 tradition. [1][2][4]
    text: 'Fang is the Bright Hall, the room where a decision is made and announced — and in the older reading, the four horses that pull the chariot away from it. You can hold a room, turn a vague intention into a plan people can act on, and get four separate wills moving in the same direction. The gift is real organising power, the sort that makes other people’s work possible. The work is remembering that the hall was never the point: declare less, and stay close enough to the horses to feel when the ground changes.',
  },
  xin: {
    cn: '心',
    title: 'The Heart',
    // 晉書: 心三星，天王正位也。中星曰明堂，天子位，爲大辰，主天下之賞罰 —
    // the true seat of the Heavenly King; the middle star governs reward and
    // punishment for all under heaven. That middle star is Antares, 大火,
    // "the Great Fire". Animal 月狐, the fox. [1][2][3]
    text: 'Xin is the seat of the king, and its middle star is the one the ancients called the Great Fire — a red heart burning at the centre of the eastern sky, charged with weighing what everyone deserves. Everything in your life routes through your centre; you feel the moral shape of a situation before you can explain it, and you cannot stay neutral about people once you have taken them in. The gift is a warmth and a sense of justice that others orient themselves by. The work is temperature: your judgement is usually right, and it lands far harder than you intend when the fire is running hot.',
  },
  wei_tail: {
    cn: '尾',
    title: 'The Tail',
    // 晉書: 尾九星，後宮之塲，妃后之府 — the rear palace and the consorts'
    // quarters. 史記: 尾為九子, the nine children, read as ruler and
    // ministers. Animal 火虎, the tiger. Favourable in [4].
    text: 'The dragon’s tail is the rear palace — the household, the lineage, the nine children walking behind the one in front. You are the continuity in your family or your team: the one who remembers how things are done, who stays after the founders leave, who makes sure the people coming up behind are actually looked after. The gift is loyalty with a long memory, which is rarer than it sounds. The work is claiming your own direction, because a tail is not merely dragged along — it is what a dragon steers with, and you are allowed to turn.',
  },
  ji: {
    cn: '箕',
    title: 'The Winnowing Basket',
    // 晉書: 箕四星…亦曰天津，一曰天鷄，主八風 — governs the eight winds.
    // 史記: 箕為敖客, the wandering guest, associated with 口舌 (speech,
    // gossip, disputes). Animal 水豹, the leopard. [1][2][3]
    text: 'Ji is the flat basket you toss grain in so the wind carries the husks away, and the same mansion governs the eight winds and, tellingly, talk. You sort instinctively — people, ideas, offers — and you can tell within minutes what has substance in it and what is chaff. You also tend to stand slightly outside the group, which is exactly why your read is clean. The gift is discernment plus the nerve to say what you found. The work is aim: winnowing keeps the grain, so make sure your sharpness ends with something saved and not merely with everything scattered.',
  },

  // ── 北方玄武 — Black Tortoise of the North ───────────────────────────────
  dou: {
    cn: '斗',
    title: 'The Dipper',
    // 晉書: 南斗六星，天廟也，丞相太宰之位，主褒賢進士，稟授爵祿 — the
    // celestial temple, seat of Chancellor and Grand Steward, governing the
    // promotion of the worthy and the conferring of rank. This is the
    // Southern Dipper (南斗), not the Big Dipper. [1][3][4]
    text: 'The Southern Dipper is a measuring ladle and, in the records, the celestial temple where the worthy are recommended and rank is conferred. You have an unusually accurate sense of what things and people are worth, and you give credit deliberately rather than sentimentally — which is why your praise carries weight. The gift is being a natural mentor: you notice talent early and you say so out loud. The work is turning the ladle on yourself gently, because the same exacting standard that makes your judgement trustworthy will quietly mark you down for years.',
  },
  niu: {
    cn: '牛',
    title: 'The Ox',
    // 晉書: 牽牛六星，天之關梁，主犧牲事 — the celestial bridge and pass,
    // governing sacrificial offerings. Contains Altair, the Cowherd of the
    // Cowherd-and-Weaver-Girl story, separated across the Milky Way. [1][3]
    text: 'Niu is the Herdsman star, the bridge across the celestial river, and the mansion in charge of what gets offered up. You carry, steadily and without commentary, and you are the reason a good many things in your life have not fallen over. Giving something up for someone else comes to you so naturally that you rarely notice you have done it. The gift is endurance that other people can build a life on. The work is discrimination: a sacrifice nobody asked for and nobody knows about is not devotion, it is subtraction — say what it cost, at least once.',
  },
  nu: {
    cn: '女',
    title: 'The Maid',
    // 晉書: 須女四星，天少府也。須，賤妾之稱，婦職之卑者也 — the Lesser
    // Treasury; the name denotes humble women's work, and the mansion governs
    // cloth, tailoring and the arranging of marriages. Contains Vega, the
    // Weaver Girl. Animal 土蝠, the bat. [1][3]
    text: 'Nu is the Lesser Treasury and the Weaver — the mansion of cloth, of fine tailoring, of skilled hands doing work the court depended on and never thanked. You are quietly, genuinely good at something intricate, and you would rather the thing came out right than that anyone watched you make it. The gift is craft: patience with detail that most people cannot sustain past the first hour. The work is visibility, and this is not vanity — a treasury nobody has been shown gets valued at nothing, so let your name stay attached to what you made.',
  },
  xu: {
    cn: '虛',
    title: 'The Void',
    // 晉書: 虛二星，塚宰之官也，主北方邑居廟堂祭祀祝禱事 — the office of the
    // Grand Steward, governing northern settlements, ancestral halls,
    // sacrifice and prayer. 虛 also carries the sense of an emptied ruin-mound,
    // and the mansion marked the winter solstice in antiquity. [1][3]
    text: 'Xu is emptiness — the mound where a settlement used to be — and also the ancestral hall, where prayer and offering are made. It marked the depth of winter, the still hinge of the year. You are comfortable with absence in a way that unsettles busier people: you can sit in a fallow stretch, an unanswered question or a grief without rushing to plug it. The gift is genuine spiritual patience and a talent for keeping vigil with others. The work is distinguishing the practice from the habit, because chosen stillness restores you and drifting stillness only looks like it.',
  },
  wei_danger: {
    cn: '危',
    title: 'The Rooftop',
    // 晉書: 危三星，主天府天市架屋 — governs the celestial treasury, the
    // celestial market and the raising of roofs (架屋). The graph 危 means
    // high, steep, precarious. Animal 月燕, the swallow — which nests under
    // eaves. [1][3]
    text: 'Wei is the roof-beam, and the single graph means both height and danger, which is the whole of its character: this mansion governs raising roofs and it governs the drop. You work at the exposed edge of things, you notice risk early, and you are usually the one who says the load-bearing part is not right. The gift is that you build real shelter — like the swallow that nests under the eaves, you make safety out of a precarious place. The work is rest: constant vigilance is not the same as safety, and your nervous system knows the difference even when you argue with it.',
  },
  shi: {
    cn: '室',
    title: 'The Encampment',
    // 晉書: 營室二星，天子之宮也。一曰玄宮，一曰淸廟 — the emperor's palace,
    // the Dark Palace, the Pure Temple; also read as the store of army grain
    // and the mansion of earthworks (軍糧之府及土功事). Strongly favourable
    // for building in the 值日 tradition. [1][4]
    text: 'Shi is the built house — palace and pure temple in one reading, army granary and earthworks in another, which is to say: walls, and enough food inside them. You make places. Rooms, teams, households, standing arrangements where people know they are provided for and can stop bracing. The gift is that your presence is structural; things settle around you. The work is the door, because a house that becomes the entire world is a smaller life than you are built for, and provisioning everyone can be a very tidy way of never leaving.',
  },
  bi_wall: {
    cn: '壁',
    title: 'The Wall',
    // 晉書: 東壁二星，主文章，天下圖書之秘府也 — governs writing and
    // literature; the secret archive of all the books under heaven. [1][4]
    text: 'The Eastern Wall is the library wall — the mansion of writing, and the hidden repository of every book under heaven. You are the one who keeps the record: you remember what was actually said, you write things down, and you can explain a complicated thing to someone who has no background in it. The gift is transmission, which is how anything survives past the people who made it. The work is porosity, since a wall preserves by shutting out — check now and then whether you are protecting the archive or just keeping the room quiet.',
  },

  // ── 西方白虎 — White Tiger of the West ───────────────────────────────────
  kui: {
    cn: '奎',
    title: 'The Stride',
    // 晉書: 奎十六星，天之武庫也 — the celestial armoury. The graph 奎 means
    // the stride or the space between the legs; 史記 also calls it 封豕, the
    // great boar. Animal 木狼, the wolf. Rated variously in [4]. [1][2][3]
    text: 'Kui is the arsenal of heaven, and its own name means a wide stride. You are equipped: you cover ground fast, you keep capability in reserve, and in a crisis people discover you had already thought about it. There is a wolf in this mansion, and you know it — you have force available and you do not always enjoy how ready you are to use it. The gift is preparedness that quietly protects everyone around you. The work is restraint, because an armoury is most useful when it stays shut, and not every disagreement is a frontier.',
  },
  lou: {
    cn: '婁',
    title: 'The Bond',
    // 晉書: 婁三星，爲天獄，主苑牧犧牲，供給郊祀 — the celestial enclosure,
    // governing parks and pastures, sacrificial herds, and supply for the
    // state sacrifices. The graph 婁 means to gather or tie together.
    // Favourable, but the tradition warns against launching on this day. [1][4]
    text: 'Lou means to gather and bind, and it is the enclosure where the herds are kept and readied for the great rites. You convene: you are the person who knows who should meet whom, who collects the scattered pieces of a project, who can hold a group together through a stretch that would otherwise dissolve it. The gift is that things you assemble tend to stay assembled. The work is asking what the gathering is for, because the same mansion is also called a pen — and a circle held too tightly stops being a bond and starts being a fence.',
  },
  wei_stomach: {
    cn: '胃',
    title: 'The Granary',
    // 晉書: 胃三星，天之廚藏，主食廩，五穀府也 — heaven's kitchen-store,
    // governing the grain stores, the treasury of the five grains. Animal
    // 土雉, the pheasant. Strongly favourable in [4]. [1][3]
    text: 'Wei is the stomach and the state granary at once — heaven’s kitchen-store, the treasury of the five grains. You take things in and convert them: raw experience into competence, other people’s half-formed ideas into something usable, scarcity into a stocked shelf. The gift is a steady sufficiency that makes you generous without effort, because you genuinely have enough. The work is digestion — you can take in far more than you process, and the cure for that heavy, overloaded feeling is not more input but finishing what is already on the shelf.',
  },
  mao: {
    cn: '昴',
    title: 'The Hairy Head',
    // 晉書: 昴七星，天之耳目也，主西方，主獄事 — the ears and eyes of heaven,
    // governing the west and judicial affairs. 史記 calls it 髦頭 and 胡星,
    // "the foreigner's star". This is the Pleiades. Animal 日雞, the
    // rooster. Traditionally counted among the 凶宿. [1][2][3][4]
    text: 'Mao is the Pleiades, called the ears and eyes of heaven, and set over the courts and the prisons. You perceive more than is convenient — the tone under the sentence, the detail that does not fit — and you have an instinct for weighing conduct that arrives long before you have the evidence. The old texts also call this the outsider’s star, and you may well have grown up feeling slightly foreign to your own surroundings. The gift is uncommon clarity. The work is suspending the verdict, because perception this fast can harden into a case before the person has finished speaking.',
  },
  bi_net: {
    cn: '畢',
    title: 'The Net',
    // 晉書: 畢八星，主邊兵，主弋獵 — governs frontier troops and hunting with
    // corded arrows. 史記 calls it 罕車, the net-chariot, and the tradition
    // knows it as 雨師, the Rain Master — 詩經: 月離于畢，俾滂沱矣, "when the
    // moon lodges in Bi, there will be downpours". Animal 月烏, the crow.
    text: 'Bi is the long-handled hunting net, posted on the frontier — and in the oldest songs it is the Rain Master, the mansion the Moon enters before a downpour. You go after what you want with a plan, you hold a boundary without drama, and you have a way of arriving with relief for people who have been parched for a while. The gift is effective pursuit: you catch things. The work is selectivity, because a net does not distinguish, and a life spent bringing in everything within reach leaves you sorting instead of living.',
  },
  zi: {
    cn: '觜',
    title: 'The Beak',
    // 晉書: 觜觿三星，爲三軍之候，行軍之藏府，主葆旅，收斂萬物 — the scout of
    // the three armies, the marching army's storehouse, governing the
    // garrison stores and the gathering-in of all things. 觜 is by far the
    // narrowest of the 28, its width reduced almost to nothing by precession
    // by the later dynasties. Animal 火猴, the monkey. [1][3]
    text: 'Zi is the tiger’s small sharp beak, and its office is scout: it rides ahead of the three armies, and it keeps the marching stores. It is also by far the narrowest mansion in the sky — a sliver between its larger neighbours. You are precise, quick, economical, better than almost anyone at going ahead and reporting back accurately, and you tidy as you go. The gift is that you see the terrain first. The work is taking up space: you have made a habit of occupying very little, and being the scout is not the same as being permanently unaccounted for.',
  },
  shen: {
    cn: '參',
    title: 'The Three Stars',
    // 晉書: 參十星…主斬刈 — governs cutting down and reaping. This is Orion,
    // the body of the White Tiger. 參 and 商 (an old name for 心宿) never
    // share the sky, giving the classical idiom 參商 for two who cannot meet
    // — 杜甫: 人生不相見，動如參與商. Animal 水猿, the ape. [1][3]
    text: 'Shen is Orion, the body of the White Tiger, and the records give it one blunt office: reaping. You cut cleanly — you end what is finished, you can say the true sentence in a room full of hedging, and you would rather have a clear break than a comfortable ambiguity. Classically, Shen and the Heart mansion never appear in the sky together, which is why the old poets used the pair as shorthand for people who love each other and keep missing; some of that ache is yours. The gift is decisive honesty. The work is discernment about which ties actually need cutting.',
  },

  // ── 南方朱雀 — Vermilion Bird of the South ───────────────────────────────
  jing: {
    cn: '井',
    title: 'The Well',
    // 晉書: 東井八星，天之南門，黃道所經，天之亭候，主水衡事，法令所取平也 —
    // heaven's southern gate, through which the ecliptic passes; heaven's
    // watchpost; governs water management and the levelling of law and
    // standards. Animal 木犴, a beast of judgement. [1][3]
    text: 'Jing is heaven’s southern gate and heaven’s watchpost, in charge of water and of the place where law is levelled to a single standard. You are a common resource: people come to you, you are the same person to all of them, and you have a strong instinct that the rule applied to one should be the rule applied to everyone. The gift is trustworthy fairness and real depth to draw on. The work is drawing it up, because a well serves nobody by being deep — and depth is not the same as clarity, so let people see what is actually down there.',
  },
  gui: {
    cn: '鬼',
    title: 'The Ghost',
    // 晉書: 輿鬼五星，天目也，主視，明察奸謀 — the eye of heaven, governing
    // sight and the exposure of hidden schemes. It contains 積屍氣, "the
    // vapour of massed corpses" — the Beehive Cluster, M44 — and the mansion
    // is bound up with funerary and ancestral rites. Animal 金羊, the sheep.
    // Traditionally 凶; rendered here as threshold work, not misfortune. [1][3][4]
    text: 'Gui is called the eye of heaven, and its office is seeing — specifically, seeing through a hidden scheme. Inside it sits the faint smudge the astronomers named the vapour of massed corpses, and the mansion has always kept company with funerals, ancestors and the boundary between the living and the dead. You perceive what people are actually doing, and you are unusually steady around grief, endings and the things everyone else edges away from. The gift is that you can be present at the hard threshold. The work is trust: not every closed door has something behind it.',
  },
  liu: {
    cn: '柳',
    title: 'The Willow',
    // 晉書: 柳八星，天之廚宰也，主尚食，和滋味，又主雷雨 — heaven's cook and
    // steward, governing the imperial table, the harmonising of flavours,
    // and also thunder and rain. Read as the bird's beak (鳥注). Animal
    // 土獐, the roe deer. Traditionally counted among the 凶宿. [1][3][4]
    text: 'Liu is heaven’s cook — charged with the imperial table and with harmonising flavours — and, in the same breath, with thunder and rain. That is exactly the shape of you: sensuous, hospitable, a natural blender of people and tastes, and weather-prone underneath it. You bend like the willow you are named for, which is a survival skill and occasionally a disappearing act. The gift is that you make gatherings feel good in a way nobody can quite reproduce. The work is keeping your own palate, and deciding nothing important while the storm is still overhead.',
  },
  xing: {
    cn: '星',
    title: 'The Star',
    // 晉書: 七星七星，一名天都，主衣裳文繡，又主急兵盜賊 — also called the
    // Celestial Capital, governing robes and embroidery, and also sudden
    // military alarms and brigandage. Read as the bird's neck and voice.
    // Animal 日馬, the horse. Traditionally 凶. [1][3][4]
    text: 'Xing is the Celestial Capital, set over robes and fine embroidery — and, in the very next line of the same record, over sudden alarms. You are visible: you have presence, style, a voice people turn toward, and life tends to arrive for you in bursts rather than gradients. The gift is expressive brilliance, the ability to make something look and sound the way it deserves. The work is holding your nerve when the alarm sounds — treat urgency as a question rather than an order, and make sure the substance underneath is as finished as the surface.',
  },
  zhang: {
    cn: '張',
    title: 'The Drawn Bow',
    // 晉書: 張六星，主珍寶、宗廟所用及衣服，又主天廚飲食賞齎之事 — governs
    // treasures, the furnishings of the ancestral temple and clothing, and
    // heaven's kitchen: food, drink, and the bestowal of rewards. The graph
    // 張 means to stretch or draw open — a bow, a net, the bird's crop.
    // Animal 月鹿, the deer. Strongly favourable in [4]. [1][3]
    text: 'Zhang means to stretch open — a bow, a net, the bird’s full crop — and it holds the treasury, the ancestral vessels and heaven’s kitchen, where food is served and rewards are handed out. You are expansive and genuinely generous: you set the table, you give the gift, you hand credit to the person who earned it. The gift is abundance that other people get to stand inside. The work is your own limit, because a bow held at full draw eventually shakes, and generosity that quietly keeps a ledger is not the thing you meant to give.',
  },
  yi: {
    cn: '翼',
    title: 'The Wings',
    // 晉書: 翼二十二星，天之樂府俳倡，又主夷狄遠客、負海之賓 — heaven's music
    // bureau and its performers; governs distant peoples, far-travelled
    // guests, and visitors from beyond the sea. Animal 火蛇, the snake.
    // Counted among the 凶宿 in [4]; rendered here as restlessness, not harm.
    text: 'Yi is the bird’s wings and, in the records, heaven’s music bureau — the performers — together with foreigners, distant guests and travellers who came from beyond the sea. You are artistic and mobile: drawn to the far edge of the map, at ease with people whose world is nothing like yours, and most yourself in front of an audience or on the way to somewhere. The gift is a genuinely cosmopolitan imagination. The work is landing, because flight makes a superb craft and a poor answer to a conversation you would rather not have.',
  },
  zhen: {
    cn: '軫',
    title: 'The Chariot',
    // 晉書: 軫四星，主冥宰，輔臣也；主車騎，主載任 — governs the hidden
    // steward and the supporting ministers; governs chariots and cavalry;
    // governs the carrying of loads. 軫 is literally the crossbar at the rear
    // of a chariot, the member that bears the weight. The mansion is also
    // associated with wind. Animal 水蚓, the earthworm. [1][3]
    text: 'Zhen is the crossbar at the back of a chariot — the timber that actually takes the load — and its offices are transport, carrying, and the supporting minister who works out of sight of the throne. You move things: goods, projects, people through hard passages, all of it without much need for the credit. The gift is that you are load-bearing, and everyone downstream of you can feel it even if they never name it. The work is the inventory, so take one honestly now and then: what am I carrying, and whose was it to begin with?',
  },
};

/**
 * One line per mansion for the daily-ritual card ("Today is 角 …").
 * Second person, imperative in tone, one sentence, distinct per mansion.
 * Each is built from that mansion's traditional 宜忌 in the 擇日 tradition
 * [4] read as fitness-of-activity — what the day suits — rather than as a
 * prediction of fortune or misfortune. Nothing here forecasts harm.
 */
export const MANSION_DAILY_ADVICE: Record<string, string> = {
  // 東方青龍
  jiao: 'A doorway of a day — begin the thing you actually intend to finish, and let the smaller openings wait their turn.',
  kang: 'Hold your line today, but check first that what you are defending is a principle and not simply your position.',
  di: 'Tend the foundation today: repairs, rest, and the unglamorous base that everything else is standing on.',
  fang: 'A good day to announce a decision and gather the people who will help you carry it out.',
  xin: 'Ask what sits at the centre of your life today, and give it your attention before you spend any on the edges.',
  wei_tail: 'Look after whoever is coming along behind you today — family, a student, anyone walking in your tracks.',
  ji: 'Sort today: keep what nourishes you, let the husks blow off, and watch your words while you are doing it.',
  // 北方玄武
  dou: 'Measure honestly today — work out what something is really worth, then give the credit where it is owed.',
  niu: 'Carry rather than launch today; steady work over familiar ground, and no new burden taken on out of guilt.',
  nu: 'Do the fine handwork today, the small skilled tasks nobody notices and everything quietly depends on.',
  xu: 'Leave a space today — cancel something, sit in the quiet it opens, and resist the urge to fill it straight away.',
  wei_danger: 'Check the roof today: make what already shelters you secure before you climb any higher.',
  shi: 'A good day for the house — build, stock, repair, and make the place you actually live in more livable.',
  bi_wall: 'Write it down today: the record, the letter, the thing you have been meaning to put into words for weeks.',
  // 西方白虎
  kui: 'Take stock of what you have and cover some ground today, but leave the weapons in the cupboard.',
  lou: 'A good day to bring people together for a clear purpose — gather first, and announce nothing new yet.',
  wei_stomach: 'Digest today: finish processing what you have already taken on before you reach for anything more.',
  mao: 'Watch and listen today, and hold your verdict until you have heard the whole of it.',
  bi_net: 'Go after one specific thing today — set the net where you genuinely want it, not across the entire river.',
  zi: 'Scout today rather than commit: gather information, tidy the stores, and keep the day deliberately small.',
  shen: 'Make the clean cut today — end what is already finished, and do it precisely rather than harshly.',
  // 南方朱雀
  jing: 'Be fair today: settle the shared matter by the same standard you would want turned on you.',
  gui: 'Look at what you have been avoiding today — the hidden thing, the grief, the account nobody wants to open.',
  liu: 'Feed people today and let the mood pass through you; cook, host, bend, and decide nothing during the storm.',
  xing: 'Show up well today, and treat any sudden alarm as a question to examine rather than an order to obey.',
  zhang: 'A generous day — set the table, give the gift, hand over the credit you have been quietly sitting on.',
  yi: 'Make something or welcome someone from far away today, and notice if travel is standing in for a conversation.',
  zhen: 'Move things today: the delivery, the journey, the load that someone near you cannot carry on their own.',
};
