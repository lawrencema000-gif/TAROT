/**
 * The reading summary's English templates: the source of truth (WP-NF-02 A9).
 *
 * A flat record of typed keys with {{…}} placeholders, in American spelling
 * as the card corpus writes it. ja, ko and zh are overlays of the same keys
 * (src/i18n/locales/<lng>/summary.json, loaded by loadPhrases.ts); a key an
 * overlay lacks falls back to this English. `count.*` is English only: ja, ko
 * and zh write counts in digits.
 *
 * Safety (safety.test.ts): no template claims certainty or names a medical,
 * legal or financial act.
 */
export const PHRASES_EN = {
  // Headings of the whole picture
  'heading.whole': 'The whole picture',
  'heading.story': 'Position by position',
  'heading.connections': 'How the cards connect',
  'heading.patterns': 'What stands out',
  'heading.turning': 'The turning point',
  'heading.todo': 'What to do',
  'heading.layers': 'The card in layers',
  'heading.cardOwn': 'The card on its own',

  // The short summary (A6)
  'short.one': '{{card}}: {{essence}}.',
  'short.answer': 'The answer: {{answer}}.',
  'short.present': '{{card}} is where you stand: {{essence}}.',
  'short.grewLeans': 'It grew out of {{card}} ({{essence}}) and leans toward {{card2}}: {{essence2}}.',
  'short.heartCrossed': 'At the heart of this reading is {{card}} — {{essence}} — crossed by {{card2}}: {{essence2}}.',
  'short.heart': 'At the heart of this reading is {{card}}: {{essence}}.',
  'short.leans': 'If nothing changes, it leans toward {{card}}: {{essence}}.',
  'short.begins': 'It begins with {{card}}: {{essence}}.',
  'short.ends': 'It ends on {{card}}: {{essence}}.',
  'short.canChange': '{{position}} is the card you can change: {{advice}}',

  // The advice, in the card's own words ({{card}} without its orientation)
  'advice.upright': '{{card}} advises, in its own words: “{{affirmation}}”',
  'advice.reversed': 'For {{card}} (reversed), the way through is in its upright words: “{{affirmation}}”',

  // Position by position
  'story.cross': 'The cross, cards 1 to 6, is the situation itself.',
  'story.staff': 'The staff, cards 7 to 10, is you, the world around you and where it leads.',
  'story.line': '{{position}}: {{card}} — {{essence}}.',
  'story.inTime': 'Read in time, it moves from {{from}} through {{through}} to {{to}}.',
  'story.inOrder': 'Read in order, it moves from {{from}} to {{to}}.',

  // How the cards connect
  'conn.method':
    'In tarot’s elemental dignities, cards of one element strengthen each other, while Fire and Water, or Air and Earth, pull against each other.',
  'conn.opposed': '{{position}} and {{position2}}: {{card}} and {{card2}} pull against each other.',
  'conn.same': '{{position}} and {{position2}}: {{card}} and {{card2}} are both {{element}}, and strengthen each other.',
  'conn.reinforces': 'In {{owner}} own notes, {{card}} reinforces it: “{{reason}}”',
  'conn.opposes': 'In {{owner}} own notes, {{card}} works against it: “{{reason}}”',
  'conn.numbers': '{{count}} {{ranks}} ({{cards}}) repeat one theme: {{theme}}.',
  'conn.courts': '{{count}} court cards bring people into the story: {{list}}.',
  'conn.courtItem': '{{card}} in {{position}}',

  // What stands out
  'pat.majorsNone': 'No Major Arcana: this is everyday matter, and it is in your hands.',
  'pat.majorsMany':
    '{{count}} of the {{total}} cards are Major Arcana ({{names}}): larger turning points are in play, not only everyday detail.',
  'pat.majorsSome_one': '{{names}} marks the larger theme; the other {{rest}} cards show how it plays out day to day.',
  'pat.majorsSome_other': '{{names}} mark the larger themes; the other {{rest}} cards show how they play out day to day.',
  'pat.suitLeads': '{{suit}} lead, {{count}} of {{total}}: the reading is really about {{domain}}.',
  'pat.elementRuns': '{{element}} runs through {{count}} of the {{total}} cards, {{names}} included.',
  'pat.missing.wands': 'No Wands: drive is quiet here.',
  'pat.missing.cups': 'No Cups: feeling is quiet here.',
  'pat.missing.swords': 'No Swords: thought is quiet here.',
  'pat.missing.pentacles': 'No Pentacles: money, work and the body are quiet here.',
  'pat.reversedMany': '{{count}} of the {{total}} cards are reversed: much of this is held back, delayed or turned inward.',
  'pat.reversedSome_one': '{{names}} is reversed: read it as held back, delayed or turned inward.',
  'pat.reversedSome_other': '{{names}} are reversed: read them as held back, delayed or turned inward.',

  // The turning point
  'turn.crossing': '{{position}} is the turning point: {{card}} — {{essence}}.',
  'turn.crossCeltic':
    'The spread reads this card as the tension acting on everything else: sometimes an obstacle, sometimes the very thing that gives the situation its shape.',
  'turn.hinge': '{{position}} is the hinge: {{card}} — {{essence}}. The other cards are read against it.',
  'turn.major': 'A Major Arcana card here marks a larger turn.',

  // What to do
  'todo.canChange':
    '{{self}} is the card you can change. {{outcome}} is a forecast, not a verdict: it updates the moment you change anything in {{self}} or {{hopes}}.',
  'todo.question': 'A question to carry: {{question}}',

  // One card in layers (A7)
  'layer.major': 'Major Arcana, {{element}}: a larger theme in your life, not only everyday detail.',
  'layer.suit': '{{suit}}, {{element}}: {{domain}}.',
  'layer.number': '{{rank}}: {{theme}}.',
  'layer.upright': 'Upright: read as it stands.',
  'layer.reversed': 'Reversed: held back, delayed or turned inward.',

  // A playing card alone (A8)
  'playing.one': '{{card}}: {{essence}}.',
  'playing.layers': 'In layers: {{suit}} for {{verb}}, {{rank}} for {{key}}, {{color}} for {{mood}}.',
  'playing.joker': 'In layers: a Joker, outside the four suits: {{keyword}}.',
  'playing.advice': 'The advice: “{{advice}}”',
  'playing.color.red': 'red',
  'playing.color.black': 'black',
  'playing.mood.red': 'ease and warmth',
  'playing.mood.black': 'effort and care',
  'playing.rank.ace': 'the Ace',
  'playing.rank.2': 'the Two',
  'playing.rank.3': 'the Three',
  'playing.rank.4': 'the Four',
  'playing.rank.5': 'the Five',
  'playing.rank.6': 'the Six',
  'playing.rank.7': 'the Seven',
  'playing.rank.8': 'the Eight',
  'playing.rank.9': 'the Nine',
  'playing.rank.10': 'the Ten',
  'playing.rank.jack': 'the Jack',
  'playing.rank.queen': 'the Queen',
  'playing.rank.king': 'the King',

  // Card references
  'ref.reversed': '{{card}} (reversed)',
  'ref.element': '{{card}} ({{element}})',
  'ref.elementReversed': '{{card}} ({{element}}, reversed)',

  // The four suits and the four elements (and Spirit, for Judgement)
  'suit.wands': 'Wands',
  'suit.cups': 'Cups',
  'suit.swords': 'Swords',
  'suit.pentacles': 'Pentacles',
  'suit.wands.domain': 'drive and creative fire',
  'suit.cups.domain': 'feeling and relationships',
  'suit.swords.domain': 'thought, words and truth',
  'suit.pentacles.domain': 'work, money and the body',
  'element.Fire': 'Fire',
  'element.Water': 'Water',
  'element.Air': 'Air',
  'element.Earth': 'Earth',
  'element.Spirit': 'Spirit',

  // Number themes (NF-D4): the number lines of the cards' own numerology texts
  'theme.1': 'a beginning, a seed just planted',
  'theme.2': 'a choice or a pairing',
  'theme.3': 'growth, with others joining in',
  'theme.4': 'stability, or standing still',
  'theme.5': 'friction and loss that unsettle what was steady',
  'theme.6': 'balance returning, help given and received',
  'theme.7': 'a test of nerve, faith or patience',
  'theme.8': 'movement and effort',
  'theme.9': 'something nearly complete',
  'theme.10': 'a cycle completing',
  'theme.11': 'news and first steps',
  'theme.12': 'movement and pursuit',
  'theme.13': 'maturity held within',
  'theme.14': 'mastery turned outward',

  // Ranks, one and many
  'rank.1': 'Ace',
  'rank.2': 'Two',
  'rank.3': 'Three',
  'rank.4': 'Four',
  'rank.5': 'Five',
  'rank.6': 'Six',
  'rank.7': 'Seven',
  'rank.8': 'Eight',
  'rank.9': 'Nine',
  'rank.10': 'Ten',
  'rank.11': 'Page',
  'rank.12': 'Knight',
  'rank.13': 'Queen',
  'rank.14': 'King',
  'rank.1_other': 'Aces',
  'rank.2_other': 'Twos',
  'rank.3_other': 'Threes',
  'rank.4_other': 'Fours',
  'rank.5_other': 'Fives',
  'rank.6_other': 'Sixes',
  'rank.7_other': 'Sevens',
  'rank.8_other': 'Eights',
  'rank.9_other': 'Nines',
  'rank.10_other': 'Tens',
  'rank.11_other': 'Pages',
  'rank.12_other': 'Knights',
  'rank.13_other': 'Queens',
  'rank.14_other': 'Kings',

  // Counts in words (English only; ja, ko and zh write digits)
  'count.1': 'one',
  'count.2': 'two',
  'count.3': 'three',
  'count.4': 'four',
  'count.5': 'five',
  'count.6': 'six',
  'count.7': 'seven',
  'count.8': 'eight',
  'count.9': 'nine',
  'count.10': 'ten',
} as const;

export type PhraseKey = keyof typeof PHRASES_EN;

/** Keys only English carries: the overlays never hold them (phrases.test.ts). */
export const EN_ONLY_PREFIXES = ['count.'] as const;

export function isEnOnlyKey(key: string): boolean {
  return EN_ONLY_PREFIXES.some((p) => key.startsWith(p));
}
