// Glossary data for the /glossary learn hub on tarotlife.app.
// Self-contained TypeScript module — no external imports.

export type GlossaryCategory =
  | 'tarot'
  | 'astrology'
  | 'numerology'
  | 'spirituality'
  | 'divination'
  | 'general';

export interface GlossaryEntry {
  slug: string;
  term: string;
  category: GlossaryCategory;
  shortDefinition: string;
  longDefinition: string;
  pronunciation?: string;
  origin?: string;
  alsoKnownAs?: string[];
  example?: string;
  relatedEntries: string[];
}

export const glossaryEntries: GlossaryEntry[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // TAROT
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'arcana',
    term: 'Arcana',
    category: 'tarot',
    shortDefinition:
      'The two divisions of a tarot deck — the Major and Minor Arcana — that together form the 78 cards.',
    longDefinition:
      'Arcana is the Latin plural of arcanum, meaning "secret" or "mystery." In tarot, the term refers to the structural division of the deck into the 22 Major Arcana, which depict broad life themes and archetypes, and the 56 Minor Arcana, which describe everyday situations and emotional textures. The split was popularised in the late 19th century by occultists who reframed playing-card decks as a system of esoteric knowledge. Reading both arcana together gives a fuller picture: the Major sets the stage, the Minor fills in the details.',
    pronunciation: 'ar-KAY-nuh',
    origin:
      'From Latin arcanum, meaning "hidden thing" or "secret." Adopted into tarot vocabulary by 19th-century French occultists.',
    alsoKnownAs: ['Trumps and pips', 'Greater and lesser secrets'],
    example:
      'A spread that pulls mostly from the Major Arcana usually points to a turning-point moment rather than a passing mood.',
    relatedEntries: ['major-arcana', 'minor-arcana', 'deck', 'suit'],
  },
  {
    slug: 'major-arcana',
    term: 'Major Arcana',
    category: 'tarot',
    shortDefinition:
      'The 22 trump cards of a tarot deck, from The Fool to The World, depicting universal life themes.',
    longDefinition:
      'The Major Arcana is the symbolic backbone of the tarot. Numbered 0 through 21, the cards are often read as a single narrative known as the Fool\'s Journey, tracing a soul from naive beginning to integrated wholeness. Each card stands for a large archetypal force — the Lovers for choice, Death for transformation, the Tower for sudden change. When several Majors appear in a reading, it usually signals that the situation has weight beyond day-to-day concerns.',
    origin:
      'The 22 trumps appear in 15th-century Italian tarocchi decks. The esoteric framing as "Major Arcana" dates to the 18th and 19th centuries.',
    alsoKnownAs: ['Trumps', 'Greater Arcana'],
    example:
      'Drawing The Tower in a reading about a job is rarely about the job alone — the Major Arcana is pointing at a deeper structural shift.',
    relatedEntries: ['arcana', 'minor-arcana', 'deck', 'spread'],
  },
  {
    slug: 'minor-arcana',
    term: 'Minor Arcana',
    category: 'tarot',
    shortDefinition:
      'The 56 suit cards of a tarot deck, divided into four suits of fourteen cards each.',
    longDefinition:
      'The Minor Arcana mirrors a regular playing-card deck but adds an extra court figure, the Page. The four suits — Wands, Cups, Swords, Pentacles — represent the four classical elements and the four domains of human life: action, feeling, thought, and material reality. Where the Major Arcana speaks of fate and turning points, the Minor Arcana describes how those forces play out in concrete, everyday detail. Most readings draw heavily from the Minor cards because most life is lived in the small.',
    alsoKnownAs: ['Pip cards', 'Lesser Arcana'],
    example:
      'A spread full of Cups and Pentacles often reads as a question about home, money, and emotional security rather than a grand life pivot.',
    relatedEntries: ['arcana', 'major-arcana', 'suit', 'court-cards'],
  },
  {
    slug: 'suit',
    term: 'Suit',
    category: 'tarot',
    shortDefinition:
      'One of the four families of the Minor Arcana — Wands, Cups, Swords, or Pentacles.',
    longDefinition:
      'A suit groups fourteen cards (Ace through Ten plus four court cards) under a single elemental theme. Wands map to fire and creative drive, Cups to water and emotion, Swords to air and intellect, Pentacles to earth and material life. Other tarot traditions use Batons, Chalices, Blades, and Coins, but the meanings hold. Reading the dominant suit in a spread is a quick way to see which part of life the question is really about.',
    alsoKnownAs: ['Pip suit', 'Element suit'],
    example:
      'Three Swords in a five-card spread suggests the querent is stuck in their head about the situation, not their heart.',
    relatedEntries: ['minor-arcana', 'court-cards', 'arcana', 'spread'],
  },
  {
    slug: 'court-cards',
    term: 'Court Cards',
    category: 'tarot',
    shortDefinition:
      'The sixteen figure cards of the Minor Arcana — Page, Knight, Queen, and King across four suits.',
    longDefinition:
      'Court cards usually represent people, personalities, or modes of behaviour rather than events. Pages are learners and messengers, Knights are doers and seekers, Queens hold and nurture mastery, Kings command and direct it. They can describe the querent, someone in their life, or an attitude they are being asked to embody. Many readers find courts the trickiest part of the deck precisely because their meaning depends so much on context.',
    alsoKnownAs: ['Face cards', 'People cards'],
    example:
      'The Knight of Swords in a career spread often points to someone moving fast and arguing hard rather than a literal stranger on horseback.',
    relatedEntries: ['page', 'knight', 'queen', 'king'],
  },
  {
    slug: 'page',
    term: 'Page',
    category: 'tarot',
    shortDefinition:
      'The youngest court card of each suit, associated with messages, learning, and beginnings.',
    longDefinition:
      'Pages stand at the start of their suit\'s journey. They carry curiosity, study, and news — the Page of Cups dreams up a feeling, the Page of Pentacles begins a craft. In a reading they can show up as a literal child or young person, but more often they describe a beginner\'s energy or a fresh piece of information arriving. Treat them as invitations rather than verdicts.',
    alsoKnownAs: ['Princess (in some decks)', 'Jack'],
    example:
      'The Page of Wands appearing alongside a job question often hints at an early-stage idea worth playing with, not a finished plan.',
    relatedEntries: ['court-cards', 'knight', 'queen', 'king'],
  },
  {
    slug: 'knight',
    term: 'Knight',
    category: 'tarot',
    shortDefinition:
      'The active court card of each suit, associated with movement, pursuit, and momentum.',
    longDefinition:
      'Knights are the doers of the deck. Each rides into their suit\'s territory at full tilt — the Knight of Swords charging through ideas, the Knight of Cups offering devotion, the Knight of Wands chasing inspiration, the Knight of Pentacles plodding steadily through work. Their gift is forward motion; their risk is excess. A reading heavy in Knights usually means a phase of action rather than reflection.',
    alsoKnownAs: ['Prince (in some Thoth-style decks)'],
    example:
      'When the Knight of Pentacles shows up around a savings goal, the message is usually patience and steady deposits rather than a lucky break.',
    relatedEntries: ['court-cards', 'page', 'queen', 'king'],
  },
  {
    slug: 'queen',
    term: 'Queen',
    category: 'tarot',
    shortDefinition:
      'The receptive mastery card of each suit, associated with depth, holding, and inner authority.',
    longDefinition:
      'Queens embody their suit fully but inwardly. Where the Knight pursues, the Queen contains. The Queen of Cups holds emotion without being swept by it, the Queen of Swords thinks clearly without becoming cruel, the Queen of Pentacles tends a home without losing herself, the Queen of Wands inspires without burning out. They often appear when a reading asks the querent to embody steadiness rather than action.',
    alsoKnownAs: ['Mother card'],
    example:
      'Drawing the Queen of Swords in a difficult conversation reading is a nudge to speak with clean honesty, not soften the truth.',
    relatedEntries: ['court-cards', 'page', 'knight', 'king'],
  },
  {
    slug: 'king',
    term: 'King',
    category: 'tarot',
    shortDefinition:
      'The outward mastery card of each suit, associated with authority, structure, and command.',
    longDefinition:
      'Kings are the externalised face of their suit\'s power. They build structures, set rules, and take responsibility for outcomes. The King of Pentacles runs a stable enterprise, the King of Cups governs his feelings rather than denying them, the King of Swords cuts through complexity with law and logic, the King of Wands leads through vision. Kings can warn against rigidity as easily as they confer authority — context decides which.',
    alsoKnownAs: ['Father card'],
    example:
      'The King of Wands in a leadership question usually means: own the vision out loud rather than waiting for permission.',
    relatedEntries: ['court-cards', 'page', 'knight', 'queen'],
  },
  {
    slug: 'spread',
    term: 'Spread',
    category: 'tarot',
    shortDefinition:
      'A defined layout of cards in which each position carries a specific meaning.',
    longDefinition:
      'A spread turns a pile of cards into a structured reading. The simplest is a single-card pull; common forms include the three-card past–present–future, the Celtic Cross, and the relationship cross. Each position frames the cards that fall into it — the same card means something different in "obstacle" than in "outcome." Readers often design custom spreads for specific questions, which keeps the practice precise.',
    alsoKnownAs: ['Layout', 'Tableau'],
    example:
      'A three-card spread for a creative block might use positions like "what is stuck," "what wants to move," and "what supports the move."',
    relatedEntries: ['querent', 'significator', 'reversed', 'upright'],
  },
  {
    slug: 'querent',
    term: 'Querent',
    category: 'tarot',
    shortDefinition: 'The person for whom a tarot reading is being conducted.',
    longDefinition:
      'The querent is the one with the question, even when the reader and querent are the same person. Naming someone as the querent matters because it locates the reading — every card is interpreted in relation to their situation, not the world in general. Good readers will often pause to confirm the querent\'s actual question rather than the surface one, since tarot tends to answer what is asked precisely.',
    pronunciation: 'KWEHR-uhnt',
    origin:
      'From Latin quaerens, "one who seeks" — the present participle of quaerere, "to ask."',
    alsoKnownAs: ['Seeker', 'Sitter'],
    example:
      'Before laying any cards, ask the querent to phrase their question in one sentence — vague questions get vague readings.',
    relatedEntries: ['spread', 'significator', 'reversed', 'upright'],
  },
  {
    slug: 'reversed',
    term: 'Reversed',
    category: 'tarot',
    shortDefinition:
      'A card drawn upside down relative to the reader, often read with a modified meaning.',
    longDefinition:
      'When a card lands rotated 180 degrees, many readers shift its interpretation — toward blockage, internalisation, delay, or the shadow side of the upright meaning. Not every tradition reads reversals; some readers ignore orientation entirely and rely on context. If reversals are used, the rule is to be consistent: shuffle thoroughly so reversals are genuinely random, then trust them as signal rather than noise.',
    alsoKnownAs: ['Inverted', 'Ill-dignified'],
    example:
      'The Sun reversed is rarely "no joy" — more often it means the joy is muted, delayed, or being kept private.',
    relatedEntries: ['upright', 'spread', 'querent', 'significator'],
  },
  {
    slug: 'upright',
    term: 'Upright',
    category: 'tarot',
    shortDefinition:
      'A card drawn right-side-up relative to the reader, read with its standard meaning.',
    longDefinition:
      'Upright is the default orientation for a tarot card and corresponds to its primary, most direct meaning. Readers who use reversals contrast upright with reversed; readers who do not still notice orientation when imagery cues it. The upright meaning is the one printed in most guidebooks and is the cleanest expression of the card\'s archetype.',
    alsoKnownAs: ['Right-side-up', 'Well-dignified'],
    example:
      'Three of Cups upright in a friendship spread is straightforward — celebration, reunion, shared joy.',
    relatedEntries: ['reversed', 'spread', 'querent', 'significator'],
  },
  {
    slug: 'significator',
    term: 'Significator',
    category: 'tarot',
    shortDefinition:
      'A card chosen to represent the querent or the heart of the question within a spread.',
    longDefinition:
      'A significator anchors the reading. Some readers pick it deliberately based on the querent\'s sun sign, age, or temperament; others draw it at random from the deck before laying the spread. The significator gives the rest of the cards something to be in relation to — it answers "who is this about?" before the spread answers "what is happening?" Many modern readers skip it, treating the question itself as anchor.',
    pronunciation: 'sig-NIF-i-kay-tor',
    origin:
      'From Latin significator, "one who signifies." Borrowed into tarot from horary astrology.',
    alsoKnownAs: ['Karaka (in Indian astrology, related concept)'],
    example:
      'For a 40-year-old querent asking about ambition, the King of Wands is a common significator choice.',
    relatedEntries: ['querent', 'spread', 'court-cards', 'major-arcana'],
  },
  {
    slug: 'deck',
    term: 'Deck',
    category: 'tarot',
    shortDefinition:
      'The complete set of 78 cards used for a tarot reading.',
    longDefinition:
      'A tarot deck is a working tool, not just a printed set of cards. Readers often have a deck they have shuffled into their own rhythm — the back of the cards softens, the imagery becomes familiar, and the deck starts to "speak" in the reader\'s own vocabulary. The Rider–Waite–Smith deck (1909) is the most widely used reference deck; the Thoth deck and Marseille deck represent two other major traditions. Decks are personal, and most serious readers keep more than one.',
    alsoKnownAs: ['Pack'],
    example:
      'It is common to break in a new deck by shuffling it through one card a day for a few weeks before doing a full spread.',
    relatedEntries: ['arcana', 'major-arcana', 'minor-arcana', 'spread'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ASTROLOGY
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'natal-chart',
    term: 'Natal Chart',
    category: 'astrology',
    shortDefinition:
      'A map of the sky at the exact moment, date, and place of a person\'s birth.',
    longDefinition:
      'A natal chart, also called a birth chart, plots the positions of the Sun, Moon, planets, and key angles against the twelve zodiac signs and twelve houses. It is the foundational document of personal astrology — every transit, progression, and synastry reading is interpreted in relation to it. Accurate birth time matters: a few minutes can change the Ascendant and the entire house structure. Most astrologers treat the natal chart as a snapshot of potential rather than fixed destiny.',
    alsoKnownAs: ['Birth chart', 'Radix', 'Genethliacal chart'],
    example:
      'Two people born on the same day have similar planet positions but often very different natal charts because their Ascendants differ.',
    relatedEntries: ['ascendant', 'descendant', 'midheaven', 'transit'],
  },
  {
    slug: 'ascendant',
    term: 'Ascendant',
    category: 'astrology',
    shortDefinition:
      'The zodiac sign rising on the eastern horizon at the moment of birth.',
    longDefinition:
      'The Ascendant, often called the rising sign, sets the cusp of the first house and shapes the structure of the entire natal chart. It is commonly read as the "outer self" — the way a person meets new situations and how others first perceive them. Because the Ascendant changes roughly every two hours, accurate birth time is essential to determine it. Many astrologers consider it as personally significant as the Sun sign.',
    pronunciation: 'uh-SEN-dent',
    alsoKnownAs: ['Rising sign', 'ASC', '1st house cusp'],
    example:
      'A Cancer Sun with a Capricorn Ascendant often reads as someone who feels deeply but presents as composed and competent.',
    relatedEntries: ['descendant', 'midheaven', 'ic', 'natal-chart'],
  },
  {
    slug: 'descendant',
    term: 'Descendant',
    category: 'astrology',
    shortDefinition:
      'The zodiac sign setting on the western horizon at the moment of birth, opposite the Ascendant.',
    longDefinition:
      'The Descendant marks the cusp of the seventh house and is read as the realm of close partnerships — what the chart-holder seeks in others, and what they tend to project onto others. It is always exactly opposite the Ascendant: a Libra rising has an Aries Descendant, and so on. Read together with the Ascendant, the axis describes the basic relational pattern of the chart: who I show up as, and who I look for to complete the picture.',
    pronunciation: 'duh-SEN-dent',
    alsoKnownAs: ['DSC', '7th house cusp'],
    example:
      'A querent with a Sagittarius Descendant often picks partners who feel like a window onto a larger world.',
    relatedEntries: ['ascendant', 'midheaven', 'ic', 'natal-chart'],
  },
  {
    slug: 'midheaven',
    term: 'Midheaven',
    category: 'astrology',
    shortDefinition:
      'The highest point of the ecliptic at the moment of birth, marking the cusp of the tenth house.',
    longDefinition:
      'The Midheaven, often abbreviated MC, sits at the top of the natal chart and represents public life, vocation, and how a person is recognised in the world. It is not literally directly overhead; it is the southernmost intersection of the meridian and the ecliptic in the northern hemisphere. The MC paired with the Ascendant gives a quick read of how someone presents and what they are publicly steering toward.',
    pronunciation: 'MID-heh-vuhn',
    origin:
      'From the Latin medium coeli, "middle of the sky," abbreviated MC.',
    alsoKnownAs: ['MC', 'Medium Coeli', '10th house cusp'],
    example:
      'A Capricorn Midheaven often shows up as a serious, structured public reputation — even if the rest of the chart is playful.',
    relatedEntries: ['ic', 'ascendant', 'descendant', 'natal-chart'],
  },
  {
    slug: 'ic',
    term: 'IC',
    category: 'astrology',
    shortDefinition:
      'The Imum Coeli — the lowest point of the chart and cusp of the fourth house.',
    longDefinition:
      'The IC sits directly opposite the Midheaven and represents private life: home, lineage, the inner foundation a person is built on. While the MC is the chart\'s public face, the IC is the basement. Family of origin, ancestral pattern, and the place a person retreats to all live here. A strong IC connection in synastry often shows up as feeling immediately at home with someone.',
    pronunciation: 'eye-see',
    origin:
      'From the Latin imum coeli, "bottom of the sky." Abbreviated IC.',
    alsoKnownAs: ['Imum Coeli', 'Nadir', '4th house cusp'],
    example:
      'A Cancer IC often suggests a person whose private life is built around food, family, and emotional safety.',
    relatedEntries: ['midheaven', 'ascendant', 'descendant', 'natal-chart'],
  },
  {
    slug: 'transit',
    term: 'Transit',
    category: 'astrology',
    shortDefinition:
      'A current planetary position interacting with a placement in the natal chart.',
    longDefinition:
      'A transit happens when a planet in the sky right now forms a meaningful angle to a planet, point, or house cusp in the natal chart. Transits are how astrologers describe timing — the slow Saturn transit that builds discipline, the Jupiter transit that opens an opportunity, the Mars transit that pushes someone to act. Outer-planet transits (Saturn, Uranus, Neptune, Pluto) tend to mark life chapters; inner-planet transits flavour the day or week.',
    pronunciation: 'TRAN-zit',
    alsoKnownAs: ['Current transit', 'Sky transit'],
    example:
      'When Saturn transits a person\'s natal Moon, it often shows up as a sober, slow reckoning with old emotional patterns.',
    relatedEntries: ['retrograde', 'aspect', 'natal-chart', 'ephemeris'],
  },
  {
    slug: 'retrograde',
    term: 'Retrograde',
    category: 'astrology',
    shortDefinition:
      'An apparent backwards motion of a planet as seen from Earth.',
    longDefinition:
      'Retrograde motion is an optical effect — planets do not actually reverse course. As Earth overtakes or is overtaken by another planet in their orbits, the other planet appears, for a stretch of weeks or months, to move backwards through the zodiac. Astrologers read retrograde periods as invitations to revisit, review, or revise whatever the planet rules. Mercury retrograde gets the headlines, but every planet beyond the Moon has retrograde phases.',
    pronunciation: 'RET-roh-grayd',
    origin:
      'From the Latin retrogradus, "stepping backward." The term is descriptive, not literal.',
    alsoKnownAs: ['Rx', 'Apparent retrograde motion'],
    example:
      'During a Venus retrograde it is common for old relationships to surface — the planet of love is asking for review, not always reunion.',
    relatedEntries: ['mercury-retrograde', 'mercury-station', 'transit', 'ephemeris'],
  },
  {
    slug: 'conjunction',
    term: 'Conjunction',
    category: 'astrology',
    shortDefinition:
      'An aspect formed when two planets occupy the same point in the zodiac.',
    longDefinition:
      'A conjunction is the tightest of the major aspects: two planets sit in the same degree, fusing their energies. The result depends on which planets meet — Sun conjunct Jupiter often expands confidence, while Mars conjunct Saturn can feel like driving with the brake on. Conjunctions are the engine of the chart; they concentrate themes that other aspects merely flavour.',
    pronunciation: 'kon-JUNK-shun',
    alsoKnownAs: ['Conj', '0° aspect'],
    example:
      'A natal Moon–Venus conjunction often reads as someone who needs beauty and softness as part of their basic emotional diet.',
    relatedEntries: ['opposition', 'square', 'trine', 'sextile'],
  },
  {
    slug: 'opposition',
    term: 'Opposition',
    category: 'astrology',
    shortDefinition:
      'An aspect formed when two planets sit 180 degrees apart in the zodiac.',
    longDefinition:
      'Oppositions place two planets directly across from each other and read as a polarity — pulled in two directions, looking for balance. Unlike a square, which feels internal and frictional, an opposition often projects onto other people: the relationship, the rival, the partner. Working with an opposition usually means stopping the see-saw and integrating both ends rather than picking a side.',
    pronunciation: 'op-uh-ZISH-un',
    alsoKnownAs: ['180° aspect', 'Opp'],
    example:
      'A natal Sun–Moon opposition often shows up as a lifelong negotiation between identity and emotional needs.',
    relatedEntries: ['conjunction', 'square', 'trine', 'sextile'],
  },
  {
    slug: 'square',
    term: 'Square',
    category: 'astrology',
    shortDefinition:
      'An aspect formed when two planets sit 90 degrees apart in the zodiac.',
    longDefinition:
      'A square is the classic friction aspect. Two planets ninety degrees apart pull on each other from incompatible signs and modalities, creating tension that demands resolution. Squares show up as the recurring problem the chart is working on — the same lesson dressed in different clothes. They are often described as growth aspects: uncomfortable, but the source of real development if engaged honestly.',
    pronunciation: 'skwair',
    alsoKnownAs: ['90° aspect', 'Quadrate'],
    example:
      'A Mars square Saturn often reads as someone who feels their effort is constantly meeting a wall — and who builds real strength by working with that wall rather than against it.',
    relatedEntries: ['conjunction', 'opposition', 'trine', 'sextile'],
  },
  {
    slug: 'trine',
    term: 'Trine',
    category: 'astrology',
    shortDefinition:
      'A harmonious aspect formed when two planets sit 120 degrees apart in the zodiac.',
    longDefinition:
      'Trines link planets in the same element — fire to fire, earth to earth — and are usually read as easy flow. Where squares grind, trines glide. The risk is that trine energy can be so frictionless it goes unused; a person may not develop the gift the trine offers because nothing is forcing them to. Trines are best treated as resources rather than guarantees.',
    pronunciation: 'tryn',
    alsoKnownAs: ['120° aspect'],
    example:
      'A natal Mercury trine Jupiter often shows up as a person who learns languages, ideas, or systems more easily than most, but who has to choose to use that ease.',
    relatedEntries: ['conjunction', 'opposition', 'square', 'sextile'],
  },
  {
    slug: 'sextile',
    term: 'Sextile',
    category: 'astrology',
    shortDefinition:
      'A supportive aspect formed when two planets sit 60 degrees apart in the zodiac.',
    longDefinition:
      'A sextile is a cooperative aspect — less powerful than a trine, but more active. It links planets in compatible but different elements, like fire and air or earth and water. Sextiles are read as opportunities that show up if the person reaches for them; the energy is available but not delivered automatically. They often appear in the chart as gentle openings rather than dramatic events.',
    pronunciation: 'SEK-styl',
    alsoKnownAs: ['60° aspect'],
    example:
      'A Venus sextile Mars in synastry often shows up as a relationship with easy chemistry that still needs initiative to actually move.',
    relatedEntries: ['conjunction', 'opposition', 'square', 'trine'],
  },
  {
    slug: 'aspect',
    term: 'Aspect',
    category: 'astrology',
    shortDefinition:
      'The angular relationship between two points in a chart, measured in degrees.',
    longDefinition:
      'Aspects describe how planets talk to each other. The major aspects are the conjunction (0°), sextile (60°), square (90°), trine (120°), and opposition (180°); minor aspects include the quincunx, semi-sextile, and quintile. Each aspect type has a flavour — easy, tense, integrative — and applies whether the planets meet in a natal chart, a transit, or a synastry comparison. Reading a chart is largely the work of reading its aspects.',
    pronunciation: 'AS-pekt',
    origin:
      'From Latin aspectus, "a looking at." Planets were said to "look at" each other from specific angles.',
    alsoKnownAs: ['Angle', 'Configuration'],
    example:
      'When astrologers ask "what are the aspects?" they usually mean: which planets are talking, and how nicely?',
    relatedEntries: ['conjunction', 'opposition', 'square', 'trine'],
  },
  {
    slug: 'ephemeris',
    term: 'Ephemeris',
    category: 'astrology',
    shortDefinition:
      'A table or database of planetary positions for a given period of time.',
    longDefinition:
      'An ephemeris is the working dictionary of an astrologer. Before software, ephemerides were thick books listing the daily longitude of each planet; today they are usually queried by computer. They allow astrologers to look up where any planet was on any date — essential for casting natal charts, tracking transits, and timing events. The plural is ephemerides.',
    pronunciation: 'eh-FEM-er-iss',
    origin:
      'From Greek ephemeros, "lasting only a day." A daybook of the heavens.',
    alsoKnownAs: ['Planetary tables', 'Star almanac'],
    example:
      'Without a birth time, an ephemeris can still tell you the Sun, Moon, and most planet positions to within a degree.',
    relatedEntries: ['natal-chart', 'transit', 'retrograde', 'aspect'],
  },
  {
    slug: 'decan',
    term: 'Decan',
    category: 'astrology',
    shortDefinition:
      'A ten-degree subdivision of a zodiac sign, giving each sign three decans.',
    longDefinition:
      'Each zodiac sign covers thirty degrees, and each thirty-degree slice is split into three ten-degree decans. Different traditions assign rulers to decans — Hellenistic astrology uses planetary rulers in a fixed sequence (the Chaldean order), while modern astrology often uses elemental rulers. Decans give astrologers a finer brush: a 4° Leo and a 24° Leo behave with the same Leo logic but in noticeably different keys.',
    pronunciation: 'DEH-kan',
    origin:
      'From the Greek dekanos, "chief of ten." The decan system originated in ancient Egyptian star calendars.',
    alsoKnownAs: ['Decanate', 'Face'],
    example:
      'Someone with the Sun in the second decan of Capricorn (10°–19°) is often read as Capricorn flavoured with the practical earthiness of Taurus.',
    relatedEntries: ['natal-chart', 'aspect', 'transit', 'ascendant'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NUMEROLOGY
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'life-path',
    term: 'Life Path',
    category: 'numerology',
    shortDefinition:
      'The single-digit number derived from a person\'s full birth date, considered the core number in numerology.',
    longDefinition:
      'The life path number is calculated by reducing the birth date to a single digit (with the master numbers 11, 22, and 33 left unreduced). It is read as the dominant theme of a lifetime — the lesson, terrain, or recurring story a person is here to work on. Of all numerology numbers, it is the most widely used and the easiest to compute. A life path 1 is wired for leadership and self-direction; a life path 7 for inquiry and inwardness; and so on.',
    alsoKnownAs: ['Destiny path', 'Birth path number'],
    example:
      'A person born 4 March 1990 has a life path of 8 (4 + 3 + 1 + 9 + 9 + 0 = 26 → 2 + 6 = 8).',
    relatedEntries: ['expression-number', 'soul-urge', 'master-number', 'numerology'],
  },
  {
    slug: 'expression-number',
    term: 'Expression Number',
    category: 'numerology',
    shortDefinition:
      'A number derived from the letters of a person\'s full birth name, describing their natural talents and outward purpose.',
    longDefinition:
      'The expression number is calculated by converting each letter of a person\'s full birth name into a number (typically using the Pythagorean system, A=1 through I=9, repeating), summing them, and reducing to a single digit or master number. It is read as the gifts and tools a person was born with — the way they are meant to express themselves. Where the life path is the road, the expression is the vehicle.',
    alsoKnownAs: ['Destiny number', 'Name number'],
    example:
      'Two siblings can share the same life path but have very different expression numbers because their names differ.',
    relatedEntries: ['life-path', 'soul-urge', 'pythagorean', 'numerology'],
  },
  {
    slug: 'soul-urge',
    term: 'Soul Urge',
    category: 'numerology',
    shortDefinition:
      'A number derived from the vowels of a person\'s birth name, said to describe their deepest motivations.',
    longDefinition:
      'The soul urge — sometimes called the heart\'s desire — is calculated by summing the numerical values of the vowels in a person\'s full birth name. Numerologists read it as what the person quietly wants underneath their public choices. A soul urge 4 craves stability and structure; a soul urge 9 longs to serve a wider whole. It is often the number that explains why a life path 1 is exhausted by leadership — the underlying soul urge wanted something else.',
    alsoKnownAs: ['Heart\'s desire number', 'Inner-self number'],
    example:
      'A person with a soul urge 6 often feels most alive when caring for someone or something — even if their life path points elsewhere.',
    relatedEntries: ['expression-number', 'life-path', 'pythagorean', 'numerology'],
  },
  {
    slug: 'master-number',
    term: 'Master Number',
    category: 'numerology',
    shortDefinition:
      'A double-digit number — 11, 22, or 33 — that is not reduced further in numerological calculations.',
    longDefinition:
      'Master numbers are read as carrying both the energy of their double digit and the reduced form. 11 is treated as a higher octave of 2 — intuition and vision; 22 as a higher 4 — building large structures; 33 as a higher 6 — service at scale. They are considered demanding rather than lucky: the gift comes with a heavier load. Some numerologists also recognise 44 and 55 as emerging master numbers.',
    alsoKnownAs: ['Master vibration', 'Power number'],
    example:
      'A life path 11 often experiences early life as overwhelming intuition that only stabilises once the person learns to ground it.',
    relatedEntries: ['life-path', 'karmic-number', 'numerology', 'expression-number'],
  },
  {
    slug: 'karmic-number',
    term: 'Karmic Number',
    category: 'numerology',
    shortDefinition:
      'A number — typically 13, 14, 16, or 19 — that appears in a calculation and is read as a lesson carried over from past patterns.',
    longDefinition:
      'Karmic numbers, also called karmic debt numbers, are specific double-digit values that, when they appear in core calculations before reduction, are said to indicate areas where work was left unfinished. 13 is read as a debt around discipline, 14 around moderation, 16 around ego and humility, 19 around independence and the right use of power. Whether or not one accepts the past-life framing, the numbers point to recognisable life lessons.',
    alsoKnownAs: ['Karmic debt number'],
    example:
      'A person whose life-path calculation passes through 16 before reducing to 7 is said to be working on the lesson of humility.',
    relatedEntries: ['life-path', 'master-number', 'numerology', 'karma'],
  },
  {
    slug: 'numerology',
    term: 'Numerology',
    category: 'numerology',
    shortDefinition:
      'A divinatory and symbolic system that assigns meaning to numbers and the relationships between them.',
    longDefinition:
      'Numerology treats numbers as a language for describing personality, timing, and pattern. The two main modern systems are Pythagorean and Chaldean, both of which convert letters and dates into numbers and read the results. Numerology is not arithmetic in the predictive sense; it is a symbolic frame, similar in spirit to astrology, that gives a person a vocabulary for their own tendencies. Most practitioners combine multiple core numbers — life path, expression, soul urge — rather than relying on a single one.',
    pronunciation: 'noo-mer-OL-uh-jee',
    origin:
      'The modern Western tradition draws on Pythagorean philosophy (6th century BCE) and was systematised in the early 20th century by L. Dow Balliett and others.',
    alsoKnownAs: ['Number divination', 'Arithmancy (older usage)'],
    example:
      'A numerology reading typically begins with the full birth name and exact birth date.',
    relatedEntries: ['life-path', 'expression-number', 'pythagorean', 'chaldean'],
  },
  {
    slug: 'pythagorean',
    term: 'Pythagorean Numerology',
    category: 'numerology',
    shortDefinition:
      'The most common Western numerology system, mapping letters A–I to 1–9 and repeating.',
    longDefinition:
      'Pythagorean numerology takes its name from the Greek philosopher Pythagoras, though the modern system is a 20th-century reconstruction rather than a direct lineage. Letters are assigned values 1 through 9 in alphabetical order (A=1, B=2 … I=9, J=1, and so on). Calculations are then reduced to a single digit, except when a master number appears. It is the dominant system in English-language numerology because of its simplicity and consistency.',
    pronunciation: 'puh-thag-uh-REE-uhn',
    alsoKnownAs: ['Modern numerology', 'Western numerology'],
    example:
      'In Pythagorean numerology, the name "Anna" reduces as 1 + 5 + 5 + 1 = 12 → 1 + 2 = 3.',
    relatedEntries: ['chaldean', 'numerology', 'expression-number', 'life-path'],
  },
  {
    slug: 'chaldean',
    term: 'Chaldean Numerology',
    category: 'numerology',
    shortDefinition:
      'An older numerology system rooted in ancient Babylonian practice, using values 1–8 and treating 9 as sacred.',
    longDefinition:
      'Chaldean numerology assigns letters to numbers based on the sound and vibrational quality of each letter rather than alphabetical order. It uses values 1 through 8 and reserves 9 for the divine, never assigning it directly. The Chaldean system places more emphasis on the name a person actually goes by — what other people call them — than on the legal birth name. It is widely used in Indian astrological numerology and is considered more interpretive but less accessible than Pythagorean.',
    pronunciation: 'kal-DEE-uhn',
    origin:
      'Named after the Chaldeans of ancient Mesopotamia, who systematised earlier Babylonian number lore.',
    alsoKnownAs: ['Mystic numerology', 'Babylonian numerology'],
    example:
      'A practitioner using Chaldean numerology will often ask which name a client uses daily, not just the legal one.',
    relatedEntries: ['pythagorean', 'numerology', 'life-path', 'expression-number'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SPIRITUALITY
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'chakra',
    term: 'Chakra',
    category: 'spirituality',
    shortDefinition:
      'An energy centre in the subtle body, traditionally numbered seven along the spine.',
    longDefinition:
      'In yogic and tantric traditions, chakras are nodes where the subtle body\'s energy channels meet. The seven-chakra system most familiar in the West runs from the root at the base of the spine to the crown at the top of the head, with each centre tied to a colour, sound, element, and area of life. Older Indian sources describe more chakras and somewhat different systems. Modern usage often borrows the framework loosely; serious practice involves breath, posture, and meditation rather than colour symbolism alone.',
    pronunciation: 'CHUH-kruh',
    origin:
      'From the Sanskrit chakra, meaning "wheel" or "disk." Earliest references appear in the Upanishads.',
    alsoKnownAs: ['Energy centre', 'Subtle body wheel'],
    example:
      'A person who feels chronically ungrounded is often said to need work at the root chakra rather than the crown.',
    relatedEntries: ['aura', 'kundalini', 'third-eye', 'meditation'],
  },
  {
    slug: 'aura',
    term: 'Aura',
    category: 'spirituality',
    shortDefinition:
      'A subtle energetic field said to surround the human body.',
    longDefinition:
      'The aura is described in many esoteric traditions as a layered field of energy extending outward from the physical body. Different systems map it differently — etheric, emotional, mental, and spiritual layers are common — but most agree on the core idea: the aura carries information about a person\'s state and shifts as they shift. Some practitioners report seeing it as colour; others sense it as quality or pressure. Whether one takes it literally or as metaphor, the language of "aura" still gives useful shorthand for the felt presence of another person.',
    pronunciation: 'AW-ruh',
    origin:
      'From the Greek aura, meaning "breeze" or "breath." Used in spiritual contexts since at least the early 20th century via Theosophical writing.',
    alsoKnownAs: ['Energy field', 'Subtle body'],
    example:
      'Walking into a tense room, most people sense it before anyone says a word — that felt sense is sometimes described as reading the room\'s aura.',
    relatedEntries: ['chakra', 'third-eye', 'intuition', 'grounding'],
  },
  {
    slug: 'third-eye',
    term: 'Third Eye',
    category: 'spirituality',
    shortDefinition:
      'A subtle perception centre traditionally located between the eyebrows, associated with insight and intuition.',
    longDefinition:
      'The third eye is the sixth chakra in the seven-chakra system — Ajna, "command" — and is described as the seat of inner sight. Activation practices include focused meditation on the brow point, breath retention, and visualisation. Traditionally, opening the third eye is considered a serious undertaking that depends on grounding the lower chakras first; many teachers warn against rushing into upper-body work before that foundation is in place. The bindi worn between the brows in some Indian traditions marks this point.',
    alsoKnownAs: ['Ajna chakra', 'Brow chakra', 'Inner eye'],
    example:
      'Sustained meditation on the breath often produces, over time, a steady awareness behind the eyes that some traditions call third-eye opening.',
    relatedEntries: ['chakra', 'intuition', 'meditation', 'aura'],
  },
  {
    slug: 'kundalini',
    term: 'Kundalini',
    category: 'spirituality',
    shortDefinition:
      'A latent spiritual energy described in tantric traditions as coiled at the base of the spine.',
    longDefinition:
      'Kundalini is imagined as a serpent of energy lying dormant at the root chakra. Through sustained practice — pranayama, mantra, asana, devotion — the energy is said to rise through the chakras toward the crown, producing states ranging from clarity to overwhelm. The classical texts treat kundalini awakening as a serious matter best approached with a teacher. In Western popular spirituality the term is often used loosely; the original tradition is more cautious and more demanding.',
    pronunciation: 'koon-duh-LEE-nee',
    origin:
      'From the Sanskrit kundalini, "coiled one." Central to Shakta and Tantric strands of Hindu philosophy.',
    alsoKnownAs: ['Serpent energy', 'Shakti'],
    example:
      'Practitioners often describe a kundalini awakening as a sustained energetic shift rather than a single event — months or years of recalibration.',
    relatedEntries: ['chakra', 'third-eye', 'meditation', 'grounding'],
  },
  {
    slug: 'akashic-records',
    term: 'Akashic Records',
    category: 'spirituality',
    shortDefinition:
      'A theosophical concept of a non-physical archive containing the record of every soul and event.',
    longDefinition:
      'The Akashic Records are described as a kind of cosmic library — every thought, word, and action of every soul, indexed and accessible to the trained reader. The concept was popularised by 19th- and 20th-century theosophists and by the American psychic Edgar Cayce. Modern Akashic readers usually approach the Records meditatively, asking permission to view a soul\'s information for a specific purpose. Whether read literally or as metaphor, the framework treats memory as something larger than a single brain.',
    pronunciation: 'uh-KAH-shik',
    origin:
      'From the Sanskrit akasha, meaning "ether" or "sky." Brought into Western occultism by H. P. Blavatsky and the Theosophical Society in the late 19th century.',
    alsoKnownAs: ['Book of Life', 'Soul records'],
    example:
      'An Akashic reading is more like reading a long biography than receiving a quick yes-or-no answer.',
    relatedEntries: ['karma', 'intuition', 'meditation', 'manifestation'],
  },
  {
    slug: 'karma',
    term: 'Karma',
    category: 'spirituality',
    shortDefinition:
      'The principle that actions carry consequences across time, shaping future experience.',
    longDefinition:
      'In its original Indian context, karma is not a moral scoreboard but a description of how cause and effect operate at the level of intention and action. A choice plants a seed; conditions ripen it later. The Hindu, Buddhist, and Jain traditions develop the idea differently — as cycles of rebirth, as habit-energy, as conditioning — but they share the basic claim that what is done shapes what comes. The English use of karma as instant payback is a popular distortion; classical karma works on much longer arcs.',
    pronunciation: 'KAR-muh',
    origin:
      'From the Sanskrit karma, "action" or "deed." The root verb kr means simply "to do."',
    alsoKnownAs: ['Action-consequence', 'Cause and effect'],
    example:
      'A long-running pattern of broken trust in friendships is sometimes described, in the karmic sense, as a seed needing to be replanted rather than a punishment.',
    relatedEntries: ['karmic-number', 'akashic-records', 'meditation', 'manifestation'],
  },
  {
    slug: 'meditation',
    term: 'Meditation',
    category: 'spirituality',
    shortDefinition:
      'A practice of trained attention, often used to cultivate calm, insight, or specific states of mind.',
    longDefinition:
      'Meditation is an umbrella term for many techniques: focusing on breath, repeating a mantra, observing thoughts without engaging them, generating compassion, resting in open awareness. Different traditions emphasise different goals — concentration in samatha, insight in vipassana, devotion in bhakti, non-dual recognition in dzogchen — but all involve sustained, intentional attention. Regular practice produces measurable changes in attention, mood regulation, and stress response, regardless of metaphysical framing.',
    pronunciation: 'meh-dih-TAY-shun',
    origin:
      'From the Latin meditari, "to think upon." The English word covers a much broader landscape than its etymology suggests.',
    alsoKnownAs: ['Contemplation', 'Sitting practice'],
    example:
      'A simple ten-minute breath meditation done daily for a few months tends to do more than an occasional hour-long session.',
    relatedEntries: ['mindfulness', 'chakra', 'third-eye', 'grounding'],
  },
  {
    slug: 'mindfulness',
    term: 'Mindfulness',
    category: 'spirituality',
    shortDefinition:
      'The practice of paying open, non-judgmental attention to the present moment.',
    longDefinition:
      'Mindfulness is a translation of the Pali word sati, originally referring to a specific quality of remembered awareness in early Buddhist practice. In modern usage, especially in clinical settings, it has been adapted into secular programs like Mindfulness-Based Stress Reduction. The core move is the same: notice what is happening in body, feeling, thought, and surroundings without immediately judging or trying to change it. Sustained practice tends to widen the gap between stimulus and response.',
    pronunciation: 'MYND-full-niss',
    origin:
      'A 19th-century English translation of the Pali sati, "memory" or "presence of mind."',
    alsoKnownAs: ['Present-moment awareness', 'Sati'],
    example:
      'Stopping to notice three breaths before answering a hard email is a small mindfulness practice with outsized returns.',
    relatedEntries: ['meditation', 'grounding', 'intuition', 'manifestation'],
  },
  {
    slug: 'manifestation',
    term: 'Manifestation',
    category: 'spirituality',
    shortDefinition:
      'The practice of consciously cultivating intention, attention, and action toward a desired outcome.',
    longDefinition:
      'Modern manifestation traditions — visualisation, scripting, vision boards, affirmations — borrow from older esoteric practices and from 20th-century New Thought writers. Stripped of magical thinking, the working principle is fairly simple: clear intention plus repeated attention plus aligned action shifts what a person notices, chooses, and pursues. The serious traditions emphasise the action half; manifestation without behaviour change tends to stall. Whether one frames the results as cosmic or psychological, the discipline of clarity tends to be useful either way.',
    pronunciation: 'man-uh-fes-TAY-shun',
    origin:
      'From the Latin manifestare, "to make clear." Popularised in modern spiritual usage through New Thought writers and 20th-century self-development.',
    alsoKnownAs: ['Intention setting', 'Conscious creation'],
    example:
      'A vision board only really works once it is paired with the small daily actions the board points toward.',
    relatedEntries: ['mindfulness', 'meditation', 'intuition', 'karma'],
  },
  {
    slug: 'smudging',
    term: 'Smudging',
    category: 'spirituality',
    shortDefinition:
      'The practice of burning sacred herbs to cleanse a space, object, or person.',
    longDefinition:
      'Smudging in its specific sense refers to ceremonies practised by some Indigenous peoples of North America, in which herbs like sage, sweetgrass, cedar, and tobacco are burned for cleansing and prayer. The word is also used more loosely in modern spiritual culture for any incense-based clearing practice. Out of respect, many practitioners now distinguish between Indigenous smudging — which carries specific protocols and lineages — and broader smoke-clearing practices. White sage in particular is overharvested and often sourced unsustainably.',
    pronunciation: 'SMUHJ-ing',
    alsoKnownAs: ['Smoke cleansing', 'Saining (Celtic equivalent)'],
    example:
      'A common modern practice is to burn rosemary or garden sage from a kitchen plant rather than purchased white sage.',
    relatedEntries: ['grounding', 'aura', 'meditation', 'intuition'],
  },
  {
    slug: 'grounding',
    term: 'Grounding',
    category: 'spirituality',
    shortDefinition:
      'A practice of bringing attention into the body and the present to feel steady and connected.',
    longDefinition:
      'Grounding is a basic skill in most spiritual and somatic traditions. It means returning attention from rumination, anxiety, or dissociation back to physical sensation — feet on the floor, breath in the belly, sound in the room. Techniques include barefoot walking, slow breathing, eating something dense, or naming five things one can see. In subtle-body language, it is sometimes described as drawing energy down through the root chakra into the earth. The functional outcome is the same: the nervous system settles.',
    pronunciation: 'GROWN-ding',
    alsoKnownAs: ['Earthing', 'Centering'],
    example:
      'Before a difficult conversation, a thirty-second grounding pause — feet on the floor, three slow breaths — is often more useful than a long pep talk.',
    relatedEntries: ['meditation', 'mindfulness', 'chakra', 'aura'],
  },
  {
    slug: 'intuition',
    term: 'Intuition',
    category: 'spirituality',
    shortDefinition:
      'Direct knowing that arrives without conscious reasoning.',
    longDefinition:
      'Intuition is the felt sense that something is true, off, important, or about to happen, without the steps that justify the conclusion. Cognitive science describes much of it as fast pattern-matching from accumulated experience; spiritual traditions describe it as a finer sense organ, the third eye in subtle-body terms. Both descriptions point to the same practical reality: useful information arrives faster than the rational mind can articulate. Trained intuition is built by paying attention to the body, taking notes, and checking outcomes over time.',
    pronunciation: 'in-too-ISH-un',
    origin:
      'From the Latin intueri, "to look upon" or "to consider."',
    alsoKnownAs: ['Inner knowing', 'Gut feeling'],
    example:
      'The pull to take a different route home that turns out to have avoided a delay is the small, mundane edge of intuition most people use without naming.',
    relatedEntries: ['third-eye', 'aura', 'meditation', 'mindfulness'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // DIVINATION
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'divination',
    term: 'Divination',
    category: 'divination',
    shortDefinition:
      'The practice of seeking insight into a question or situation through symbolic or ritual means.',
    longDefinition:
      'Divination is an umbrella term covering tarot, runes, the I Ching, scrying, palmistry, dowsing, astrology, and dozens of regional practices. What unites them is the use of a structured, symbolic system to surface information the rational mind has not organised yet. Divination is not the same as prediction; most serious practitioners describe it as a way of asking better questions and seeing the situation more clearly, with predictive accuracy as a secondary effect.',
    pronunciation: 'div-uh-NAY-shun',
    origin:
      'From the Latin divinare, "to foresee" or "to be inspired by a god." Derived from divus, "of the gods."',
    alsoKnownAs: ['Augury', 'Mantic arts'],
    example:
      'Daily card pulls, monthly star transits, and the occasional pendulum swing are all small forms of personal divination.',
    relatedEntries: ['scrying', 'oracle', 'runes', 'i-ching'],
  },
  {
    slug: 'scrying',
    term: 'Scrying',
    category: 'divination',
    shortDefinition:
      'A divinatory practice of gazing into a reflective or shifting surface to receive impressions.',
    longDefinition:
      'Scrying uses a focal point — a black mirror, a bowl of water, a candle flame, smoke, polished obsidian, a crystal ball — to produce a soft, defocused gaze. As the eyes relax, the practitioner waits for images, thoughts, or feelings to surface. The technique is found in many cultures: water-scrying in ancient Greece, mirror-scrying in Renaissance Europe, smoke-reading in parts of Africa and Latin America. It is closer to guided reverie than to seeing literal pictures in the surface.',
    pronunciation: 'SKRY-ing',
    origin:
      'From the Old English descry, "to make out" or "to spy."',
    alsoKnownAs: ['Crystal-gazing', 'Mirror-gazing', 'Hydromancy (water)'],
    example:
      'A simple scrying practice is to sit with a bowl of dark water by candlelight and write down whatever images surface in twenty minutes.',
    relatedEntries: ['divination', 'oracle', 'intuition', 'meditation'],
  },
  {
    slug: 'oracle',
    term: 'Oracle',
    category: 'divination',
    shortDefinition:
      'A person, deck, or place through which guidance is received from a source beyond ordinary knowing.',
    longDefinition:
      'Oracle is one of the oldest words in the divinatory vocabulary. In ancient Greece it meant a sanctuary like Delphi where a priestess delivered prophecies; today it most often refers to oracle decks — themed card sets that, unlike tarot, have no fixed structure of suits or arcana. Oracle decks tend to be more direct and message-based than tarot, and many readers use them alongside tarot rather than instead of it.',
    pronunciation: 'OR-uh-kuhl',
    origin:
      'From the Latin oraculum, derived from orare, "to speak" or "to pray."',
    alsoKnownAs: ['Oracle deck', 'Seer'],
    example:
      'Many readers begin a session by pulling one oracle card to set the tone and then drawing tarot for the structured question.',
    relatedEntries: ['divination', 'runes', 'i-ching', 'lenormand'],
  },
  {
    slug: 'runes',
    term: 'Runes',
    category: 'divination',
    shortDefinition:
      'A set of carved symbols from early Germanic alphabets, used both as writing and as a divinatory system.',
    longDefinition:
      'The runes were the writing system of the early Germanic peoples. The Elder Futhark, the oldest known set, has twenty-four runes; later Younger Futhark and Anglo-Saxon Futhorc variants differ slightly. Each rune has a name, a sound, and a symbolic meaning — Fehu for cattle and movable wealth, Ansuz for divine speech, Algiz for protection. Modern rune divination usually involves drawing one or more runes from a bag and reading them in position, similar to tarot.',
    pronunciation: 'roonz',
    origin:
      'From Old Norse run, meaning "secret" or "whisper." The same root gives English "rune" and German raunen, "to murmur."',
    alsoKnownAs: ['Futhark', 'Norse runes'],
    example:
      'Drawing Berkano in a question about a new project is often read as a fertile beginning that needs gentle tending.',
    relatedEntries: ['divination', 'oracle', 'i-ching', 'lenormand'],
  },
  {
    slug: 'i-ching',
    term: 'I Ching',
    category: 'divination',
    shortDefinition:
      'An ancient Chinese divination system based on 64 hexagrams formed of broken and unbroken lines.',
    longDefinition:
      'The I Ching, or Book of Changes, is one of the oldest continuously used divinatory texts in the world, with roots in Bronze Age China. A reader generates a hexagram — six stacked yin or yang lines — by tossing coins or sorting yarrow stalks. Each of the sixty-four hexagrams has a commentary describing the situation it represents and the movement implied by any "changing lines." The Confucian and Daoist traditions both treat it as a wisdom text as much as an oracle.',
    pronunciation: 'EE-jing',
    origin:
      'From the Chinese yi (change) and jing (classic). The current text was redacted in the late Western Zhou (c. 9th century BCE) with later commentaries.',
    alsoKnownAs: ['Yi Jing', 'Book of Changes', 'Zhouyi'],
    example:
      'Asking the I Ching how to handle a conflict and receiving Hexagram 6, "Conflict," is a typical reminder that the oracle answers in the language of the question.',
    relatedEntries: ['divination', 'runes', 'oracle', 'lenormand'],
  },
  {
    slug: 'lenormand',
    term: 'Lenormand',
    category: 'divination',
    shortDefinition:
      'A 36-card divination deck named after the 19th-century French cartomancer Marie Anne Lenormand.',
    longDefinition:
      'Lenormand decks differ from tarot in structure and style. They have thirty-six cards, each with a clear, single image — Tree, Fox, Letter, Ring — and tend to be read in combinations rather than as individual archetypes. The Grand Tableau, a layout of all thirty-six cards, is the system\'s most distinctive spread. Lenormand reads more like sentences than poems: it is direct, situational, and well suited to concrete questions.',
    pronunciation: 'LEH-nor-mahn',
    origin:
      'Named after Mademoiselle Marie Anne Lenormand (1772–1843), a celebrated Parisian cartomancer. The first Petit Lenormand decks appeared shortly after her death.',
    alsoKnownAs: ['Petit Lenormand', 'French cartomancy'],
    example:
      'A Lenormand pull of Ring + Letter + Anchor often reads as: a binding agreement arriving in writing, with lasting weight.',
    relatedEntries: ['divination', 'oracle', 'i-ching', 'runes'],
  },
  {
    slug: 'palmistry',
    term: 'Palmistry',
    category: 'divination',
    shortDefinition:
      'The practice of interpreting a person\'s character and life through the lines and shape of the hands.',
    longDefinition:
      'Palmistry, or chiromancy, reads the hand on several layers: the shape of the palm and fingers (linked to elemental temperaments), the major lines (life, head, heart, fate), the mounts at the base of each finger, and finer markings. The system is shared, with regional variations, across India, China, the Middle East, and Europe. Indian palmistry — Hast Samudrika Shastra — gives it the most sustained classical literature. A serious palmist treats the hand as evolving rather than fixed; lines do change, sometimes in months.',
    pronunciation: 'PAHM-ree',
    origin:
      'From the Greek cheir (hand) and manteia (divination), via Latin chiromantia.',
    alsoKnownAs: ['Chiromancy', 'Hast Samudrika'],
    example:
      'A long, clear head line is often read as a sign of sustained, methodical thinking — independent of any particular career.',
    relatedEntries: ['divination', 'dowsing', 'intuition', 'oracle'],
  },
  {
    slug: 'dowsing',
    term: 'Dowsing',
    category: 'divination',
    shortDefinition:
      'A practice of using a pendulum, rod, or stick to locate water, objects, or answers to yes-or-no questions.',
    longDefinition:
      'Dowsing has two main branches. Field dowsing, with forked sticks or L-rods, has been used for centuries to locate water, minerals, or buried objects; the practice is widespread enough that some rural well-drillers still keep a dowser on call. Pendulum dowsing applies the same principle to direct questions: the practitioner holds a weighted string, calibrates "yes" and "no" swings, and asks. Sceptics attribute the movement to the ideomotor effect; practitioners find that, calibrated honestly, it is a useful intuition tool either way.',
    pronunciation: 'DOW-zing',
    alsoKnownAs: ['Divining', 'Water-witching', 'Pendulum work'],
    example:
      'A common pendulum practice is to hold the weight steady, ask the body to show "yes," then ask to show "no," before posing the real question.',
    relatedEntries: ['divination', 'palmistry', 'intuition', 'oracle'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GENERAL
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: 'new-moon',
    term: 'New Moon',
    category: 'general',
    shortDefinition:
      'The lunar phase when the Moon and Sun share the same zodiac longitude and the Moon is invisible from Earth.',
    longDefinition:
      'The new moon marks the beginning of the lunar cycle. Astrologically, it is read as a fresh slate in whichever sign it falls — a Cancer new moon emphasises home and emotion, a Capricorn new moon emphasises structure and ambition. Many practitioners use the new moon as a moment for setting intentions, journaling, and starting new cycles. Practically, the sky is at its darkest in the day or two around the new moon, which is why astronomers favour it for observing faint stars.',
    alsoKnownAs: ['Lunation', 'Dark moon (specifically the night before)'],
    example:
      'A new moon ritual does not need to be elaborate — a clean page, three intentions for the cycle, and a date to revisit them at the next new moon is enough.',
    relatedEntries: ['full-moon', 'eclipse', 'mercury-retrograde', 'transit'],
  },
  {
    slug: 'full-moon',
    term: 'Full Moon',
    category: 'general',
    shortDefinition:
      'The lunar phase when the Moon and Sun sit opposite each other in the zodiac and the Moon is fully illuminated.',
    longDefinition:
      'The full moon is the peak of the lunar cycle. Astrologically, it is a moment of culmination — whatever was seeded at the previous new moon is now visible, for better or worse. Full moons fall in the sign opposite the current Sun sign, which is why a Leo Sun produces an Aquarius full moon. Many traditions use it as a moment of release: writing down what is being let go, making peace with what has matured. Sleep researchers have found subtle disruptions around the full moon even when participants cannot see the sky.',
    alsoKnownAs: ['Plenilune'],
    example:
      'Energetic restlessness in the few days around a full moon is well documented enough that schools and emergency rooms anecdotally plan for it.',
    relatedEntries: ['new-moon', 'eclipse', 'mercury-retrograde', 'transit'],
  },
  {
    slug: 'eclipse',
    term: 'Eclipse',
    category: 'general',
    shortDefinition:
      'A new or full moon that occurs near the lunar nodes, producing a solar or lunar eclipse.',
    longDefinition:
      'Eclipses come in pairs or triplets and arrive roughly twice a year, in eclipse seasons. A solar eclipse happens at a new moon when the Moon blocks the Sun; a lunar eclipse happens at a full moon when the Earth\'s shadow falls on the Moon. Astrologically, eclipses are read as accelerated turning points — events that compress what might otherwise take months into days. They are usually felt strongest by people whose natal placements sit close to the eclipse degree.',
    alsoKnownAs: ['Solar eclipse', 'Lunar eclipse'],
    example:
      'Major life shifts — moves, breakups, new commitments — clustered around an eclipse season are common enough that astrologers expect them.',
    relatedEntries: ['new-moon', 'full-moon', 'mercury-retrograde', 'transit'],
  },
  {
    slug: 'mercury-retrograde',
    term: 'Mercury Retrograde',
    category: 'general',
    shortDefinition:
      'The roughly three-week period, three or four times a year, when Mercury appears to move backwards through the zodiac.',
    longDefinition:
      'Mercury retrograde has become the best-known astrological transit in popular culture. The planet rules communication, contracts, travel, and short-form thinking, and during its retrograde periods these areas are commonly described as glitch-prone — missed messages, technology hiccups, second-guessed decisions. Astrologers usually advise reviewing rather than launching: rewrite the document, revisit the conversation, recheck the booking. Treated as a built-in editing window rather than a curse, it is genuinely useful.',
    pronunciation: 'MUR-kyoor-ee REH-troh-grayd',
    alsoKnownAs: ['Mercury Rx'],
    example:
      'Signing a major contract in the middle of Mercury retrograde is not forbidden — it just usually means the contract gets renegotiated later.',
    relatedEntries: ['mercury-station', 'retrograde', 'transit', 'new-moon'],
  },
  {
    slug: 'mercury-station',
    term: 'Mercury Station',
    category: 'general',
    shortDefinition:
      'The moment when Mercury appears to stop in the sky, just before going retrograde or returning to direct motion.',
    longDefinition:
      'A planet stations when its apparent motion slows to zero before reversing. Mercury stations twice in each retrograde cycle — once going retrograde (station retrograde) and once turning forward again (station direct). Astrologers consider the station days the most concentrated part of the retrograde, because the planet sits at the same degree for several days running. Communication snags, second-guessing, and odd timing are most common in these windows.',
    pronunciation: 'MUR-kyoor-ee STAY-shun',
    alsoKnownAs: ['Mercury stationary', 'Stationary Mercury'],
    example:
      'A pattern of unusually slow email replies clustered around the Mercury station is the kind of detail astrologers pay attention to.',
    relatedEntries: ['mercury-retrograde', 'retrograde', 'transit', 'ephemeris'],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Look up a single glossary entry by its slug.
 * Returns null if no entry is found.
 */
export function getGlossaryEntry(slug: string): GlossaryEntry | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  const match = glossaryEntries.find((entry) => entry.slug === normalized);
  return match ?? null;
}

/**
 * Return every glossary entry in the given category, sorted alphabetically by term.
 */
export function getGlossaryByCategory(
  category: GlossaryCategory,
): GlossaryEntry[] {
  return glossaryEntries
    .filter((entry) => entry.category === category)
    .slice()
    .sort((a, b) => a.term.localeCompare(b.term));
}
