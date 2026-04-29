// Numerology learn-hub data: 9 core numbers (1-9) + 3 master numbers (11, 22, 33).
// Tradition: Pythagorean numerology as practiced in modern Western numerology
// (the lineage running through Pythagoras, Cheiro / Count Louis Hamon, L. Dow
// Balliett, Florence Campbell, and Juno Jordan). Life-path is computed by
// reducing the full date of birth to a single digit, with master numbers
// (11, 22, 33) preserved rather than reduced.

export type NumerologyCategory = 'core' | 'master' | 'compound';

export interface NumerologyEntry {
  slug: string;
  number: string;
  category: NumerologyCategory;
  symbol: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  // Personality + life themes
  personality: string;
  strengths: string[];
  challenges: string[];
  // Practice areas
  inLove: string;
  inCareer: string;
  inSpirituality: string;
  inHealth: string;
  // How to calculate (life-path)
  lifePathExplanation: string;
  // Tarot bridge
  tarotMajorArcana: string;
  tarotConnection: string;
  // Famous examples
  famousExamples: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedEntries: string[];
}

export const numerologyEntries: NumerologyEntry[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // CORE NUMBERS 1–9
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: '1',
    number: '1',
    category: 'core',
    symbol: 'I',
    keywords: ['independence', 'leadership', 'initiative', 'originality', 'courage', 'will', 'beginnings'],
    shortDescription: 'The pioneer — first cause, the will to begin, the lone leader.',
    longDescription:
      'In Pythagorean numerology, 1 is the monad — the source from which all other numbers flow. It is pure beginning, the singular point before division into duality. People who carry 1 strongly are wired to initiate: to start companies, write the first draft, walk the road no one has walked. The number 1 is masculine, active, and Sun-ruled in classical correspondences. Where 1 governs, the soul learns through standing alone before it can stand with others.',
    personality:
      'A "Number 1" person is a self-starter and natural leader, often impatient with consensus and uncomfortable in subordinate roles. They are direct, ambitious, and individualistic — the kind of person who would rather be first at something small than fifth at something large. Underneath the drive sits a quiet need to prove they can do it themselves.',
    strengths: [
      'pioneering vision and originality',
      'decisive action under pressure',
      'natural authority that others follow',
      'high self-reliance and willpower',
      'courage to dissent from the group',
      'creative force when given a blank page',
    ],
    challenges: [
      'isolation from over-reliance on self',
      'arrogance or domineering leadership',
      'impatience with slower collaborators',
      'difficulty receiving help or feedback',
      'ego identification with achievement',
      'restlessness once the new thing is built',
    ],
    inLove:
      'The 1 needs a partner who admires their drive without competing for the spotlight, yet who has enough independence to not be absorbed. The lesson of 1 in love is to soften from "I" to "we" without losing the self. They love hard but can forget to ask what the other person needs.',
    inCareer:
      'Founder, CEO, inventor, surgeon, lead athlete, military commander, lead designer — any role where the buck stops with one person. They are unhappy under heavy supervision and tend to leave organisations once they have learned the trade. Self-employment or running their own division usually brings out the best in a 1.',
    inSpirituality:
      'The path of the 1 is the path of original will: to discover what is uniquely yours to bring into the world and to have the courage to bring it. Meditation on the unity of all things — that the One is not opposed to the many but contains them — is the antidote to the 1\'s tendency toward separation and ego inflation.',
    inHealth:
      'Solar/cardiac correspondences traditionally rule 1: the heart, spine, and circulation. Burnout, hypertension, and stress headaches are typical when the 1 over-drives. Vigorous solo exercise (running, weights, cycling) channels the energy well; rest is the discipline they most resist and most need.',
    lifePathExplanation:
      'Your life-path number is the single-digit reduction of your full date of birth. For 1, sum the month, day, and full four-digit year, then keep reducing until one digit remains (preserving 11, 22, 33 if encountered along the way). For example, July 19, 1982 → 7 + 1 + 9 + 1 + 9 + 8 + 2 = 37 → 3 + 7 = 10 → 1 + 0 = 1. Anyone whose reduced birth total lands on 1 is walking the life-path of the pioneer.',
    tarotMajorArcana: 'The Magician',
    tarotConnection:
      'The Magician (Key I) is the perfect tarot correspondence for 1: a single figure, one hand to heaven and one to earth, channelling will into manifestation. Where The Magician teaches that you have all four elements at your disposal, the number 1 teaches that you have one self capable of using them. Both speak of beginnings made conscious.',
    famousExamples: ['Martin Luther King Jr.', 'Steve Jobs', 'Lady Gaga', 'Walt Disney', 'Tom Hanks'],
    faqs: [
      { q: 'What does the number 1 mean in numerology?', a: 'It means individuation, leadership, and the beginning of a cycle. The 1 is the seed-impulse of any new venture and the archetype of the self-made person.' },
      { q: 'Is life-path 1 a good number?', a: 'There are no "bad" numbers in numerology — only numbers whose lessons are easier or harder. The 1 carries the gift of leadership and the cost of loneliness; both are part of its curriculum.' },
      { q: 'Which numbers are compatible with 1?', a: 'Traditionally, 1 pairs well with 3 (creative spark), 5 (shared love of freedom), and 9 (visionary breadth). It clashes most with another 1 (two leaders, no follower) and can struggle with the slower rhythm of 4.' },
      { q: 'Why is 1 ruled by the Sun?', a: 'Cheiro, following older Chaldean correspondences, assigned the Sun to 1 because both are central, radiant, and singular in their domain. The Sun is the sole star of our system; 1 is the sole originator of the numeric series.' },
      { q: 'How do I know if I am a Number 1?', a: 'You are a 1 if your reduced birthdate equals 1, or if your name reduces to 1 in expression number, or if 1 dominates your core chart (life-path, expression, soul-urge, personality).' },
    ],
    relatedEntries: ['3', '5', '9'],
  },

  {
    slug: '2',
    number: '2',
    category: 'core',
    symbol: 'II',
    keywords: ['duality', 'partnership', 'intuition', 'diplomacy', 'sensitivity', 'cooperation', 'balance'],
    shortDescription: 'The diplomat — the second voice, the pair, the listener.',
    longDescription:
      'If 1 is the singular self, 2 is the discovery that the self has a counterpart. The number 2 is the dyad — relationship, polarity, the mirror that allows reflection. In Pythagorean teaching, 2 is the first feminine number and the principle of receptivity. People who carry 2 strongly think relationally: they read rooms, sense moods, and instinctively seek balance. The Moon is the classical correspondence — soft, reflective, tidal.',
    personality:
      'A "Number 2" person is gentle, intuitive, and deeply attuned to others. They are the peacemakers, the second-in-command who often runs the show better than the front-of-house leader, the friend who knows what you need before you say it. Their sensitivity is their gift and their wound.',
    strengths: [
      'profound empathy and emotional intelligence',
      'gift for partnership and team-building',
      'subtle, accurate intuition',
      'patient, gracious diplomacy',
      'attention to detail others overlook',
      'capacity for deep, lasting loyalty',
    ],
    challenges: [
      'over-giving until resentment builds',
      'difficulty making decisions alone',
      'absorbing others\' moods as their own',
      'conflict-avoidance that allows harm',
      'self-doubt and over-apologising',
      'losing identity inside relationship',
    ],
    inLove:
      'The 2 thrives in committed partnership and often feels half-alive without one. They love through small acts — remembering, anticipating, smoothing the rough edges of daily life. The lesson is to bring the same tenderness to themselves that they pour into the other, and to choose partners who can hold space for their depth.',
    inCareer:
      'Mediator, therapist, diplomat, executive assistant, nurse, HR director, musician (especially in duet or ensemble), counsellor. They excel anywhere relationship is the work. They struggle in cutthroat environments and in roles that demand confrontation as a daily tool.',
    inSpirituality:
      'The path of 2 is the path of devotion and union — the bhakti road, the path of the beloved. Spiritual progress comes through relationship, not solitude: through the other, through prayer addressed to a Thou, through the slow softening of the boundary between self and what holds it. Lunar practices (working with the moon\'s phases) suit the 2 well.',
    inHealth:
      'Lunar correspondences rule the 2: the stomach, lymph, fluids, and reproductive system in women. Stress lodges as digestive trouble, water-retention, and emotional eating. Gentle rhythmic exercise (swimming, walking, yoga) and protected solitude restore the 2; loud, competitive environments deplete them.',
    lifePathExplanation:
      'Reduce your full birthdate to one digit. For example, March 14, 1990 → 3 + 1 + 4 + 1 + 9 + 9 + 0 = 27 → 2 + 7 = 9. A person born June 11, 1985 → 6 + 1 + 1 + 1 + 9 + 8 + 5 = 31 → 3 + 1 = 4. Note: if any intermediate sum is 11, 22, or 33, traditional numerology preserves it as a master number rather than reducing further. A pure 2 life-path most often arises when the day, month, and year reduce cleanly to 2 without crossing master territory.',
    tarotMajorArcana: 'The High Priestess',
    tarotConnection:
      'The High Priestess (Key II) is the veiled woman between the pillars of Boaz and Jachin — the embodiment of the dyad, of inner knowing held quietly between opposites. Like the 2, she does not speak first. She listens, she dreams, she remembers. The number 2 is the energy of the Priestess: receptive, intuitive, the keeper of the unspoken.',
    famousExamples: ['Barack Obama', 'Madonna', 'Wolfgang Amadeus Mozart', 'Kanye West', 'Jennifer Aniston'],
    faqs: [
      { q: 'What does life-path 2 mean?', a: 'It means your soul-curriculum centres on relationship, sensitivity, and cooperative work. You are here to learn the strength inside softness.' },
      { q: 'Is 2 a weak number?', a: 'No — it is often misread as weak because its power is quiet. The 2 holds together what the 1 starts. Without 2s, no organisation, marriage, or movement survives.' },
      { q: 'Who is compatible with a 2?', a: 'The 6 (mutual love of harmony), the 8 (the executive paired with the diplomat), and the 9 (shared depth of feeling). Two 2s can be either deeply attuned or mutually overwhelmed.' },
      { q: 'Why is 2 ruled by the Moon?', a: 'The Moon mirrors the Sun; she has no light of her own but reflects another. So too the 2 finds its identity through the relationships it reflects.' },
      { q: 'Can a 2 lead?', a: 'Yes, but rarely from the front. The 2 leads through influence, persuasion, and behind-the-scenes orchestration — the chief of staff, not the president.' },
    ],
    relatedEntries: ['6', '8', '11'],
  },

  {
    slug: '3',
    number: '3',
    category: 'core',
    symbol: 'III',
    keywords: ['creativity', 'expression', 'joy', 'communication', 'imagination', 'optimism', 'fertility'],
    shortDescription: 'The creator — the storyteller, the artist, the joyful child.',
    longDescription:
      'The 3 is the triad — the first geometric form, the triangle, the synthesis of 1 and 2 into a third thing that is more than its parts. In Pythagorean tradition, 3 is the first truly creative number: where 1 begins and 2 mirrors, 3 makes. The number rules speech, art, music, and the playful intelligence that turns experience into expression. Jupiter is the classical ruler — expansive, generous, lucky.',
    personality:
      'A "Number 3" person is sociable, witty, and irrepressibly creative. They are the friend who tells the best stories, the artist who can\'t not make things, the speaker who can charm a hostile room. Beneath the sparkle is often a depth they hide with humour — the 3 jokes about what the 7 broods over.',
    strengths: [
      'natural gift for words and images',
      'infectious optimism that lifts others',
      'broad imagination across mediums',
      'social charm and warmth',
      'ability to find humour in hard places',
      'creative resilience — bounce-back energy',
    ],
    challenges: [
      'scattered focus across too many projects',
      'avoidance of difficult emotions through performance',
      'sensitivity to criticism of creative work',
      'tendency to charm rather than confront',
      'impulsive spending on pleasures',
      'difficulty finishing what they joyfully start',
    ],
    inLove:
      'The 3 wants delight, conversation, and shared adventure. They flirt easily and fall in love often. The mature 3 learns that love is more than the spark — that staying through the unphotogenic seasons is itself the deepest creative act. They thrive with partners who laugh at their jokes and call them on their evasions.',
    inCareer:
      'Writer, performer, designer, marketer, teacher, journalist, comedian, broadcaster, host, entrepreneur in creative industries. They are happiest when the work is varied and the audience is real. Cubicle life withers them; gigwork, freelancing, and creative entrepreneurship suit them.',
    inSpirituality:
      'The path of 3 is the path of joy as devotion — the troubadour\'s road. The 3 awakens through beauty, laughter, and the act of making. The shadow practice for the 3 is to stay with grief, to refuse to perform their pain, to discover that depth is not the enemy of light.',
    inHealth:
      'Jupiter rules the liver, hips, and thighs in classical correspondence. The 3\'s typical health risks are weight gain from rich living, mood swings (the artist\'s rollercoaster), and throat troubles when expression is suppressed. Singing, dancing, and creative play are medicine.',
    lifePathExplanation:
      'Reduce your birthdate to a single digit. December 3, 1987 → 1 + 2 + 3 + 1 + 9 + 8 + 7 = 31 → 3 + 1 = 4. May 21, 1996 → 5 + 2 + 1 + 1 + 9 + 9 + 6 = 33 (master number, preserved). The cleanest 3 life-paths often arise from December births and from years that sum to 3 (1929, 1938, 1947, 1956, 1965, 1974, 1983, 1992, 2001, 2010, 2019, 2028).',
    tarotMajorArcana: 'The Empress',
    tarotConnection:
      'The Empress (Key III) is the great creative mother — seated in a field of wheat, crowned with stars, pregnant with possibility. She is fertility, art, abundance, the body\'s yes to life. The number 3 carries her energy in personal form: the impulse to create simply because it is in your nature, the joy of the made thing for its own sake.',
    famousExamples: ['Jackie Chan', 'Christina Aguilera', 'David Bowie', 'Reese Witherspoon', 'Snoop Dogg'],
    faqs: [
      { q: 'What does life-path 3 mean?', a: 'It is the path of creative self-expression. You are here to make, to communicate, to lift the room — and to learn that joy is a discipline, not just a mood.' },
      { q: 'Is 3 lucky in numerology?', a: 'Yes — Jupiter\'s number is traditionally considered fortunate, especially for endeavours involving communication, publishing, and the arts.' },
      { q: 'Why is 3 considered creative?', a: 'Because it is the first number that synthesises — it takes the seed of 1 and the mirror of 2 and produces a third thing. Creation, by definition, is the appearance of the third.' },
      { q: 'What jobs suit a 3?', a: 'Anything that lets them speak, write, perform, or design. They wilt in repetitive numerical or rule-bound work and bloom in roles that demand imagination.' },
      { q: 'Who is compatible with 3?', a: 'The 5 (shared restlessness and adventure), the 6 (steadier love of beauty), and the 9 (visionary creative collaboration). The 4 can either ground a 3 beautifully or feel like a wet blanket.' },
    ],
    relatedEntries: ['1', '5', '6'],
  },

  {
    slug: '4',
    number: '4',
    category: 'core',
    symbol: 'IV',
    keywords: ['foundation', 'discipline', 'structure', 'order', 'work', 'reliability', 'tradition'],
    shortDescription: 'The builder — the four corners, the foundation, the disciplined hand.',
    longDescription:
      'The 4 is the tetrad — the square, the four directions, the first number that makes a stable form in space. Where 3 makes art, 4 makes the house the art lives in. In Pythagorean tradition, 4 is the number of order, manifestation in matter, and the slow, patient work that turns vision into permanence. Uranus is the modern correspondence (per Cheiro), but older systems gave the 4 to the Earth itself — solid, square, foundational.',
    personality:
      'A "Number 4" person is practical, methodical, and deeply trustworthy. They are the friend who shows up on moving day, the colleague whose work is never late, the partner who quietly keeps the household running. They prize honesty, hate shortcuts, and have a long memory for both kindness and betrayal.',
    strengths: [
      'extraordinary work ethic and follow-through',
      'reliability that becomes legend',
      'practical problem-solving',
      'loyalty across decades',
      'attention to systems, structure, and process',
      'integrity — they say what they mean',
    ],
    challenges: [
      'rigidity when plans change',
      'workaholism at the cost of joy',
      'stubborn resistance to new methods',
      'over-criticism of self and others',
      'difficulty expressing softer emotions',
      'pessimism when over-tired',
    ],
    inLove:
      'The 4 loves through doing — building a life, paying the mortgage, fixing the leaking tap before it floods. Romance for the 4 is the long arc, not the grand gesture. They want a partner who values stability and who will not mistake their quietness for absence. Their love deepens with years.',
    inCareer:
      'Engineer, accountant, architect, builder, project manager, surgeon, lawyer, military officer, farmer, anything trades-based. They excel where mastery accrues with time and where shoddy work has consequences. They struggle in roles that demand constant pivoting or empty performance.',
    inSpirituality:
      'The 4\'s path is the monastic one — discipline as devotion. Daily practice, ritual, the rule of life. The 4 awakens through fidelity to small things: showing up, again and again, without applause. The shadow practice is to learn that grace cannot be earned by effort alone, that some doors only open when you stop pushing.',
    inHealth:
      'Earthy correspondences: the bones, joints, knees, and skin. The 4 tends to chronic conditions rather than acute ones — arthritis, back pain, repetitive-strain injury from over-work. Long walks, weight-bearing exercise, and forced rest days are medicine. They must also guard against emotional armouring expressed as muscular tension.',
    lifePathExplanation:
      'Reduce the full birthdate. October 17, 1968 → 1 + 0 + 1 + 7 + 1 + 9 + 6 + 8 = 33 (master, preserved). January 22, 1985 → 1 + 2 + 2 + 1 + 9 + 8 + 5 = 28 → 2 + 8 = 10 → 1 + 0 = 1. A clean 4 life-path emerges when day + month + year reduce to 4 — common in years like 1957, 1966, 1975, 1984, 1993, 2002, 2011, 2020.',
    tarotMajorArcana: 'The Emperor',
    tarotConnection:
      'The Emperor (Key IV) sits on a stone throne wearing armour, ram-headed (Aries-ruled in tarot), the very image of structure made flesh. He is law, order, the father, the institution. The 4 is the Emperor in everyday clothes — the person who makes the trains run on time, who defends the boundary, who builds what outlives them.',
    famousExamples: ['Bill Gates', 'Oprah Winfrey', 'Keanu Reeves', 'Brad Pitt', 'Frank Sinatra'],
    faqs: [
      { q: 'What does life-path 4 mean?', a: 'It means a life organised around building — a home, a body of work, a family, a reputation. The 4 is here to learn that lasting things are made slowly.' },
      { q: 'Is 4 unlucky?', a: 'In some Asian traditions 4 is associated with death (because of phonetic similarity in Mandarin and Japanese), but in Western Pythagorean numerology 4 is highly stabilising and not considered unlucky at all — only demanding.' },
      { q: 'Why are 4s so stubborn?', a: 'Because their gift is endurance. The same trait that lets a 4 finish a ten-year project is what makes them resist a sudden change of plan. The shadow of mastery is rigidity.' },
      { q: 'What careers fit a 4?', a: 'Anything where craftsmanship, structure, and reliability matter — engineering, building, accounting, law, surgery, farming, the military.' },
      { q: 'Who is compatible with 4?', a: 'The 2 (mutual care for the home), the 6 (shared family-orientation), and the 8 (matching ambition for tangible results). The 5 can feel like chaos to a 4; conscious work is needed.' },
    ],
    relatedEntries: ['2', '6', '8'],
  },

  {
    slug: '5',
    number: '5',
    category: 'core',
    symbol: 'V',
    keywords: ['change', 'freedom', 'adventure', 'curiosity', 'sensuality', 'communication', 'versatility'],
    shortDescription: 'The traveller — the five senses, the open road, the restless mind.',
    longDescription:
      'The 5 is the pentad — the five-pointed star, the five senses, the human form with arms and legs outstretched. It is the centre of the 1–9 series and the great pivot from inwardness to outwardness. In Pythagorean tradition, 5 is the number of motion, change, and embodied experience. Mercury is its classical ruler — the messenger, the trickster, the quicksilver mind.',
    personality:
      'A "Number 5" person is curious, charismatic, and constitutionally unable to sit still for long. They are the friend with three passports, the colleague who has had six careers, the partner who needs space the way other people need air. They are quick learners, brilliant talkers, and easily bored.',
    strengths: [
      'adaptability across cultures and roles',
      'magnetic charm and wit',
      'rapid learning and pattern-recognition',
      'love of freedom that liberates others',
      'sensual, embodied presence',
      'gift for languages and communication',
    ],
    challenges: [
      'difficulty with commitment and routine',
      'overindulgence in food, sex, or substances',
      'restlessness that becomes flight',
      'impulsivity that wastes momentum',
      'shallow learning across too many fields',
      'fear of being trapped',
    ],
    inLove:
      'The 5 in love is intense, playful, and easily spooked by anything that smells of cage. They want a partner who is also a fellow traveller, who will not need them to be home every night, who treats commitment as choice repeated rather than chains. They learn through their mistakes that freedom and faithfulness are not opposites.',
    inCareer:
      'Journalist, salesperson, marketer, travel writer, translator, pilot, broadcaster, entrepreneur in trade, performer. They thrive in any role that involves variety, travel, and communication. They do badly in roles that demand long sedentary hours under fluorescent lights.',
    inSpirituality:
      'The 5\'s path is the path of the wanderer-mystic — the pilgrim who learns through encounter. They awaken through travel, through the body, through the shock of the new. The shadow practice for the 5 is stillness: to discover that the deepest journey is interior, that the same lessons keep finding them no matter how often they move.',
    inHealth:
      'Mercurial correspondences: the nervous system, lungs, hands, and respiratory system. The 5 burns through energy fast and tends toward anxiety, insomnia, and substance over-use when ungrounded. Practices that link breath, movement, and rhythm (yoga, dance, martial arts) regulate them best.',
    lifePathExplanation:
      'Reduce the full birthdate. April 23, 1978 → 4 + 2 + 3 + 1 + 9 + 7 + 8 = 34 → 3 + 4 = 7. A 5 life-path appears when the totals reduce to 5 — common in years 1958, 1967, 1976, 1985, 1994, 2003, 2012, 2021. The 5 life-path is statistically common and tends to produce many lives — multiple careers, multiple homes, multiple languages.',
    tarotMajorArcana: 'The Hierophant',
    tarotConnection:
      'The Hierophant (Key V) seems at first an odd match for the freedom-loving 5 — but read more carefully, he is the teacher who hands on the keys of tradition while also pointing beyond it. The 5 in its mature form is the same: someone who has wandered widely enough to know which traditions are worth keeping and which are walls to walk through. The number teaches how to bridge the visible and invisible.',
    famousExamples: ['Angelina Jolie', 'Mick Jagger', 'Steven Spielberg', 'Beyoncé', 'Abraham Lincoln'],
    faqs: [
      { q: 'What does life-path 5 mean?', a: 'It is the path of constructive freedom — learning to use change, travel, and variety as instruments of growth rather than escape.' },
      { q: 'Why are 5s restless?', a: 'Because Mercury rules them. The 5 is wired to gather experience the way a bee gathers pollen — many flowers, much movement. The challenge is to find the hive.' },
      { q: 'Are 5s good in relationships?', a: 'Yes, with the right partner. They struggle with possessive love and shine with secure, independent partners who delight in their stories.' },
      { q: 'What jobs suit a 5?', a: 'Anything involving travel, communication, sales, languages, journalism, or entrepreneurship. The 5 needs variety baked into the job description.' },
      { q: 'Who is compatible with 5?', a: 'The 1 (shared independence), the 3 (creative play and conversation), and the 7 (the 5 keeps the 7 from over-isolating; the 7 gives the 5 depth). The 4 can feel like a prison.' },
    ],
    relatedEntries: ['1', '3', '7'],
  },

  {
    slug: '6',
    number: '6',
    category: 'core',
    symbol: 'VI',
    keywords: ['love', 'harmony', 'responsibility', 'family', 'service', 'beauty', 'nurture'],
    shortDescription: 'The lover — the heart of the home, the carer, the keeper of harmony.',
    longDescription:
      'The 6 is the hexad — the perfect number in Pythagorean teaching (1+2+3=6 and 1×2×3=6), the geometry of the honeycomb, the form of the human family. It is the number of love made practical: not romance as fantasy but love as the daily work of caring for others. Venus is its classical ruler — beauty, harmony, the relational arts.',
    personality:
      'A "Number 6" person is warm, responsible, and deeply attuned to the wellbeing of those around them. They are the friend everyone calls in crisis, the parent who remembers every birthday, the boss who knows their team\'s kids\' names. They have an instinctive sense of beauty and a constant inner question: who needs me?',
    strengths: [
      'profound capacity for love and care',
      'natural counsellor and mediator',
      'eye for beauty in homes and design',
      'strong sense of justice and fairness',
      'reliability in family and community',
      'ability to create harmony in groups',
    ],
    challenges: [
      'over-responsibility — carrying others\' weight',
      'martyrdom and silent resentment',
      'meddling in others\' lives "for their own good"',
      'perfectionism in domestic life',
      'difficulty receiving care',
      'codependency in relationships',
    ],
    inLove:
      'The 6 is the most relationship-oriented of the core numbers. They want commitment, family, and a beautiful shared life. They give generously — sometimes too much, then feel unappreciated. The lesson of 6 in love is to receive as gracefully as they give and to let the beloved face their own consequences without rescuing them.',
    inCareer:
      'Teacher, doctor, nurse, counsellor, social worker, interior designer, chef, hospitality, family lawyer, anyone who tends. They are also gifted in the arts that beautify daily life. They may struggle with cutthroat or impersonal corporate environments.',
    inSpirituality:
      'The 6\'s path is the path of the heart — bhakti in the East, the way of love in the West. They awaken through service to family and community, through the slow polishing of the heart through daily care. The shadow practice is to let go of the savior role, to know that not every burden is theirs to carry.',
    inHealth:
      'Venusian correspondences: the throat, kidneys, and reproductive system. Caregiver burnout is the classic 6 syndrome — exhaustion from giving without replenishment. Beauty and pleasure are not luxuries for the 6; they are medicine. Massage, music, and protected solitude are essential.',
    lifePathExplanation:
      'Reduce the full birthdate. June 15, 1969 → 6 + 1 + 5 + 1 + 9 + 6 + 9 = 37 → 3 + 7 = 10 → 1 + 0 = 1. A 6 life-path is common from June births and from years summing to 6 (1959, 1968, 1977, 1986, 1995, 2004, 2013, 2022). The 6 carries the curriculum of teacher and healer in this life.',
    tarotMajorArcana: 'The Lovers',
    tarotConnection:
      'The Lovers (Key VI) shows two figures beneath a winged angel — relationship blessed from above. The card is not only about romance; it is about the conscious choice to be in relationship, to take on the responsibility of loving someone over time. The number 6 is exactly that: love as choice, beauty as ethics, harmony as the daily work of two or more.',
    famousExamples: ['John Lennon', 'Albert Einstein', 'Meryl Streep', 'Eddie Murphy', 'Jennifer Lawrence'],
    faqs: [
      { q: 'What does life-path 6 mean?', a: 'It means a life centred on love, family, and service — the path of teacher, healer, parent, and counsellor.' },
      { q: 'Are 6s natural parents?', a: 'Many are, and many become parents to people who are not their biological children — students, employees, friends. The nurturing impulse is constitutional.' },
      { q: 'Why is 6 called the perfect number?', a: 'Because in Pythagorean mathematics, the divisors of 6 (1, 2, 3) sum and multiply to 6 itself — the number contains and expresses its own parts. It was considered geometrically and ethically complete.' },
      { q: 'What is the shadow of a 6?', a: 'Martyrdom — giving until empty and then resenting the receivers. The 6 must learn to ask for what they need and to allow others to grow through their own difficulties.' },
      { q: 'Who is compatible with 6?', a: 'The 2 (shared sensitivity and care), the 3 (warmth plus creative joy), the 9 (broad humanitarian love). Two 6s can build a beautiful home but must guard against mutual smothering.' },
    ],
    relatedEntries: ['2', '3', '9'],
  },

  {
    slug: '7',
    number: '7',
    category: 'core',
    symbol: 'VII',
    keywords: ['introspection', 'spirituality', 'analysis', 'mystery', 'wisdom', 'solitude', 'truth-seeking'],
    shortDescription: 'The seeker — the inner room, the analyst, the mystic alone.',
    longDescription:
      'The 7 is the heptad — the seven planets of antiquity, the seven days of the week, the seven notes of the diatonic scale, the seven chakras. It is the most "sacred" number in many traditions, including Pythagorean. In numerology, 7 is the bridge between the material and the unseen — the number of philosophers, mystics, scientists, and detectives. Neptune is the modern correspondence, but older systems give it to the Moon\'s deeper, hidden phase.',
    personality:
      'A "Number 7" person is thoughtful, reserved, and instinctively private. They are the colleague who says little and notices everything, the friend whose few words land hard, the partner who needs long stretches of solitude to feel like themselves. They mistrust easy answers and small talk and are drawn to depth in any field they enter.',
    strengths: [
      'penetrating analytical mind',
      'spiritual depth and contemplative gift',
      'ability to see what others miss',
      'integrity that refuses easy compromise',
      'specialist mastery — the deep dive',
      'gift for solitude as creative ground',
    ],
    challenges: [
      'isolation that becomes loneliness',
      'cynicism and over-skepticism',
      'difficulty with surface social demands',
      'over-analysis paralysing action',
      'perfectionism that delays sharing work',
      'tendency to numb depth with substances or screens',
    ],
    inLove:
      'The 7 loves slowly and selectively. They need a partner who respects their solitude, who is not threatened by their long silences, and who offers depth as readily as the 7 does. Once committed, they are loyal beyond fashion. The lesson of 7 in love is to let another person past the inner moat — to risk being known.',
    inCareer:
      'Researcher, scientist, philosopher, theologian, psychologist, programmer, detective, surgeon, scholar, monastic, writer of serious books. They thrive in any role demanding depth over breadth and that allows long stretches of focused solitary work.',
    inSpirituality:
      'The 7\'s path is the contemplative one — the way of the monk, the philosopher, the mystic. They awaken through silence, study, and the slow penetration of mystery. Their natural prayer is wordless. The shadow practice is to bring their depth back into community, to share what they learn rather than hoarding it.',
    inHealth:
      'Lunar/Neptunian correspondences: the nervous system, pineal gland, lymphatic and immune systems. The 7\'s health risks are nervous exhaustion, insomnia from over-thinking, and depression from too much aloneness. They must guard their sleep, limit stimulants, and protect at least one place where they cannot be reached.',
    lifePathExplanation:
      'Reduce the full birthdate. November 7, 1962 → 1 + 1 + 7 + 1 + 9 + 6 + 2 = 27 → 2 + 7 = 9. A 7 life-path appears in years summing to 7 (1960, 1969, 1978, 1987, 1996, 2005, 2014, 2023). Many 7s find their calling later in life, often after a period of withdrawal, study, or retreat.',
    tarotMajorArcana: 'The Chariot',
    tarotConnection:
      'The Chariot (Key VII) shows a figure controlling two opposed sphinxes — black and white, conscious and unconscious — through inner mastery alone. The card is about victory through self-knowledge, not force. The number 7 is the same: the seeker who, through patient inner work, learns to harness opposing currents within and arrives at a truth they alone could find.',
    famousExamples: ['Princess Diana', 'Stephen Hawking', 'Marilyn Monroe', 'Eric Clapton', 'Leonardo DiCaprio'],
    faqs: [
      { q: 'What does life-path 7 mean?', a: 'It means a life dedicated to seeking truth — through philosophy, science, mysticism, or art. The 7 is here to think deeply and live by what they find.' },
      { q: 'Are 7s loners?', a: 'They need solitude more than most, but the healthiest 7s build a small circle of trusted intimates and contribute to the world from their deep work. Pure isolation is the shadow path.' },
      { q: 'Why is 7 considered sacred?', a: 'Because it appears at the intersection of the natural and symbolic — seven planets, seven days, seven notes, seven chakras, seven heavens. It is mathematically prime and culturally everywhere.' },
      { q: 'What jobs suit a 7?', a: 'Research, scholarship, science, programming, philosophy, depth psychology, theology, investigative work — anywhere depth beats breadth and quiet beats noise.' },
      { q: 'Who is compatible with 7?', a: 'The 5 (the 5\'s breadth complements the 7\'s depth), the 9 (shared idealism and depth), and another 7 (deep parallel solitudes). They struggle with the 3\'s scattered surface energy unless mutual respect is high.' },
    ],
    relatedEntries: ['5', '9', '11'],
  },

  {
    slug: '8',
    number: '8',
    category: 'core',
    symbol: 'VIII',
    keywords: ['power', 'abundance', 'mastery', 'authority', 'ambition', 'karma', 'material'],
    shortDescription: 'The executive — the architect of empires, the master of matter and spirit balanced.',
    longDescription:
      'The 8 is the ogdoad — the eight directions, the cube unfolded, the lemniscate (∞) standing on its end. In Pythagorean numerology it is the number of power, abundance, and the karmic exchange between effort and reward. Saturn is its classical ruler — the disciplinarian, the lord of time, the teacher who delivers exactly what was earned. The 8 is sometimes called the karma-number because its lessons return precisely.',
    personality:
      'A "Number 8" person is ambitious, capable, and instinctively aware of power dynamics. They are the executive who reads a room in seconds, the entrepreneur who sees the market gap, the manager whose teams over-deliver. They respect strength, reward results, and have little patience for performative effort. Beneath the drive often sits a hunger to prove worth.',
    strengths: [
      'executive capacity and strategic vision',
      'ability to manifest in the material world',
      'natural authority and leadership presence',
      'resilience after financial or career setbacks',
      'gift for organisation at scale',
      'ability to balance vision with practicality',
    ],
    challenges: [
      'workaholism and identity-fusion with success',
      'misuse of power when ego dominates',
      'attachment to status and material symbols',
      'difficulty showing vulnerability',
      'control issues in relationships',
      'cycles of dramatic financial rise and fall',
    ],
    inLove:
      'The 8 loves seriously and protects fiercely. They want a partner who is their equal — not subordinate, not threatened by their drive — and who can soften them at home. The lesson of 8 in love is to bring the same strategic intelligence to the relationship that they bring to their career, and to let the partner be the one place where they don\'t have to be in charge.',
    inCareer:
      'CEO, banker, investor, lawyer, judge, real-estate developer, surgeon, athlete at elite level, military officer, anyone running large operations. They thrive where authority and accountability are clear and where compensation is tied to results. They struggle when their power is undermined or when they are micromanaged.',
    inSpirituality:
      'The 8\'s path is the integration of matter and spirit — the householder yogi, the Zen master who runs a business, the contemplative who builds institutions. They awaken through the right use of power. The shadow practice is to discover that material success without inner alignment becomes its own bondage.',
    inHealth:
      'Saturnine correspondences: bones, teeth, joints, gallbladder, and the structural body. The 8\'s health risks are stress-related — heart attacks, hypertension, chronic back trouble from carrying too much. They must learn that rest is not failure and that the body, like a business, has a balance sheet.',
    lifePathExplanation:
      'Reduce the full birthdate. August 8, 1962 → 8 + 8 + 1 + 9 + 6 + 2 = 34 → 3 + 4 = 7. October 26, 1947 → 1 + 0 + 2 + 6 + 1 + 9 + 4 + 7 = 30 → 3 + 0 = 3. The 8 life-path emerges in years summing to 8 (1961, 1970, 1979, 1988, 1997, 2006, 2015, 2024) — a karmic curriculum of power tested across a lifetime.',
    tarotMajorArcana: 'Strength',
    tarotConnection:
      'In the Rider-Waite tradition, Strength (Key VIII) shows a woman gently closing the jaws of a lion — power not through force but through inner mastery and grace. The lemniscate above her head is the same symbol that defines the 8. The number 8 in its mature form is exactly that: power that no longer needs to dominate, mastery that can be tender. (Older decks placed Strength at XI and Justice at VIII; both readings illuminate the 8\'s themes.)',
    famousExamples: ['Pablo Picasso', 'Barack Obama (Expression 8)', 'Nelson Mandela', 'Bernie Sanders', 'Sandra Bullock'],
    faqs: [
      { q: 'What does life-path 8 mean?', a: 'It means a life-curriculum of power, money, and the right use of authority. The 8 is here to learn that real abundance flows when ego serves a larger purpose.' },
      { q: 'Are 8s materialistic?', a: 'They have a natural relationship with the material world and often accumulate wealth. Whether that becomes greed or stewardship depends on inner work. The 8 is not punished for prosperity — only for its misuse.' },
      { q: 'Why is 8 called the karma number?', a: 'Because its lessons return symmetrically. What an 8 sows in business, relationships, and use of power, they tend to reap rapidly and unmistakably. Saturn keeps strict accounts.' },
      { q: 'What jobs suit an 8?', a: 'Executive leadership, finance, law, real estate, large-scale entrepreneurship, surgery, elite athletics — anywhere stakes are high and authority is real.' },
      { q: 'Who is compatible with 8?', a: 'The 2 (the diplomat balances the executive), the 4 (shared ambition for built things), and the 6 (love and home as counterweight to drive). Two 8s can be a power couple or a war.' },
    ],
    relatedEntries: ['2', '4', '22'],
  },

  {
    slug: '9',
    number: '9',
    category: 'core',
    symbol: 'IX',
    keywords: ['completion', 'wisdom', 'humanitarianism', 'compassion', 'release', 'old soul', 'universal love'],
    shortDescription: 'The humanitarian — the closing of the cycle, the wise one who serves the whole.',
    longDescription:
      'The 9 is the ennead — the last single digit, the closing of the cycle before return to 1. In Pythagorean tradition, 9 is the number of completion, integration, and the wisdom that comes from having lived through the lessons of 1 through 8. Mars is its classical ruler in some systems, but the 9\'s nature is more like Mars transmuted — fierce energy turned to service. The 9 is often called the old soul.',
    personality:
      'A "Number 9" person is broad-hearted, idealistic, and pulled instinctively toward the welfare of others. They are the friend who can\'t walk past suffering, the colleague who quietly funds the team\'s coffee fund, the artist whose work always carries a humanitarian edge. They feel everything strongly and often carry old grief that does not seem entirely their own.',
    strengths: [
      'wide compassion that includes strangers',
      'wisdom that sees the long arc',
      'creative gifts in art, writing, performance',
      'ability to release what no longer serves',
      'natural mentor and elder-energy',
      'capacity for forgiveness and reconciliation',
    ],
    challenges: [
      'martyrdom and saviour complex',
      'difficulty letting go of old wounds',
      'idealism that disappoints in real relationships',
      'emotional flooding from absorbing others\' pain',
      'tendency to disappear when overwhelmed',
      'struggle with personal money while serving the world',
    ],
    inLove:
      'The 9 loves with a wide, tender, sometimes impersonal warmth — they want to love everyone, which can make the beloved feel one of many. They thrive with partners who share their idealism, who don\'t need them to be only-yours, and who can witness their grief without being scared by it. The lesson of 9 in love is to bring the universal back to the particular.',
    inCareer:
      'Healer, humanitarian, NGO leader, doctor, therapist, artist, writer, teacher, philanthropist, religious vocation. They thrive in roles that serve the larger whole and often find their best work after a major loss or transition. They struggle in roles whose only goal is profit.',
    inSpirituality:
      'The 9\'s path is the path of the bodhisattva — the awakening that includes all beings. They awaken through service, through letting go, through learning that everything must end so something else can begin. The shadow practice is to receive: to let themselves be cared for, to recognise that giving without taking is its own form of pride.',
    inHealth:
      'The 9\'s health is governed by their emotional life more than any other number. They somatise grief — chronic fatigue, autoimmune flare-ups, mysterious illness during family crises. Practices that release (yoga, breathwork, therapy, ritual) are essential. Long walks in nature reset them.',
    lifePathExplanation:
      'Reduce the full birthdate. May 18, 1953 → 5 + 1 + 8 + 1 + 9 + 5 + 3 = 32 → 3 + 2 = 5. A 9 life-path emerges from years summing to 9 (1953, 1962, 1971, 1980, 1989, 1998, 2007, 2016, 2025). Note an interesting numerological feature: any number multiplied by 9 reduces back to 9 (e.g. 9×7=63, 6+3=9), reinforcing 9\'s reputation as the number of completion that cannot be escaped.',
    tarotMajorArcana: 'The Hermit',
    tarotConnection:
      'The Hermit (Key IX) stands alone on a snowy peak holding a lantern — a single point of light offered to whoever follows. He has walked the long road and now serves as guide. The number 9 is the Hermit\'s wisdom in numeric form: the one who has been through the whole cycle, who carries the lamp, who knows that the deepest service is often the quiet kind.',
    famousExamples: ['Mother Teresa', 'Mahatma Gandhi', 'Carl Jung', 'Bob Marley', 'Jim Carrey'],
    faqs: [
      { q: 'What does life-path 9 mean?', a: 'It is the path of completion, wisdom, and humanitarian service — the closing curriculum of the 1–9 cycle, often felt as an old-soul life.' },
      { q: 'Why are 9s called old souls?', a: 'Because the 9 contains all preceding numbers (1+2+3+...+9 reduces to 9 in different combinations). Numerologically, the 9 has already walked the curriculum of every other number.' },
      { q: 'Are 9s lucky?', a: 'They tend to attract dramatic life events — both gain and loss — because their soul-curriculum is completion. The luck of a 9 is the luck of release.' },
      { q: 'What jobs suit a 9?', a: 'Humanitarian, artistic, healing, teaching, and any role serving the larger whole. They often have non-linear careers shaped by callings rather than ambitions.' },
      { q: 'Who is compatible with 9?', a: 'The 3 (creative joy meets visionary depth), the 6 (shared love of family and humanity), the 7 (depth meets compassion). The 9 needs partners who do not require their full attention all the time.' },
    ],
    relatedEntries: ['3', '6', '7'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MASTER NUMBERS 11, 22, 33
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: '11',
    number: '11',
    category: 'master',
    symbol: 'XI',
    keywords: ['intuition', 'vision', 'illumination', 'inspiration', 'spiritual messenger', 'sensitivity', 'idealism'],
    shortDescription: 'The visionary — the master intuitive, the lightning rod of inspiration.',
    longDescription:
      'The 11 is the first master number in Pythagorean numerology — a doubled 1 that does not reduce. It is the visionary, the channel, the one through whom inspired ideas arrive seemingly from elsewhere. Where the 1 begins and the 2 cooperates, the 11 unites both into a higher octave: the leader-as-channel, the teacher who teaches more than they know. The 11 is sometimes called the psychic number because of its open, often porous, nervous system.',
    personality:
      'A "Number 11" person carries an electric quality — they pick up moods, atmospheres, and ideas before others. They are inspirational speakers, artists, healers, and teachers, but they pay for their gift with an unusually sensitive nervous system. Many 11s feel different from a young age and spend years learning to integrate the sheer volume of what they perceive.',
    strengths: [
      'powerful intuition bordering on the psychic',
      'ability to inspire and uplift others',
      'visionary insight ahead of the curve',
      'spiritual sensitivity and refinement',
      'creative channel for art, music, ideas',
      'capacity for profound mentorship',
    ],
    challenges: [
      'nervous overload and anxiety',
      'difficulty grounding visions into form',
      'extreme sensitivity to environments',
      'self-doubt that paralyses action',
      'tendency to spiritual bypass under stress',
      'fluctuation between brilliance and burnout',
    ],
    inLove:
      'The 11 loves intensely and intuitively — they often know things about their partner the partner has not yet said. They need a grounded counterpart who values their sensitivity rather than dismissing it, and who can hold steady when the 11 spirals. The lesson of 11 in love is to land — to let the relationship be ordinary as well as cosmic.',
    inCareer:
      'Spiritual teacher, therapist, artist, musician, healer, inspirational speaker, prophet, visionary entrepreneur, designer, intuitive consultant. They thrive in roles that honour their sensitivity and creative channel. They suffer in any role demanding emotional armour — corporate sales, hard law, military combat — unless they have other strong numbers to balance.',
    inSpirituality:
      'The 11\'s path is overtly spiritual whether they want it to be or not. They are wired to be in contact with the unseen and to bring its messages back. They awaken through dreams, contemplative practice, time in nature, and learning to discriminate inspiration from delusion. The shadow practice is grounding — the body, food, exercise, sleep — without which the 11\'s gift becomes nervous illness.',
    inHealth:
      'The 11\'s nervous system is the dominant theme. Insomnia, anxiety, sensory overload, autoimmune issues, and migraines are typical when the 11 lives ungrounded. Earthing practices (walking barefoot on grass, cold water, weight-training, regular meals) are not optional — they are how the 11 stays well.',
    lifePathExplanation:
      'In modern Pythagorean numerology, the 11 is preserved when it appears as an intermediate sum during life-path reduction. For example, June 29, 1976 → 6 + 2 + 9 + 1 + 9 + 7 + 6 = 40 → 4 + 0 = 4 (no 11). But February 2, 2009 → 2 + 2 + 2 + 0 + 0 + 9 = 15 → 1 + 5 = 6. To find an 11, look for a date where one of the components naturally totals 11 (e.g. 2 November any year, or any combination summing first to 11 before further reduction). 11s are among the rarer life-paths.',
    tarotMajorArcana: 'Justice',
    tarotConnection:
      'In modern decks Justice is Key XI — the figure of the woman with sword and scales, weighing truth without sentiment. This is a fitting partner for the 11: the master intuitive must also be the master of inner truth, weighing inspiration against reality, vision against responsibility. (In some older decks Strength holds XI; both readings carry the 11\'s themes of inner balance.) The 11 is the visionary who must also be just.',
    famousExamples: ['Barack Obama', 'Michelle Obama', 'Jennifer Aniston', 'Madonna', 'Edgar Allan Poe'],
    faqs: [
      { q: 'What does life-path 11 mean?', a: 'It means a soul-curriculum of intuition, vision, and spiritual leadership. The 11 is here to be a bridge between the seen and unseen and to inspire others with what they perceive.' },
      { q: 'Why is 11 a master number?', a: 'Because it doubles the 1\'s pioneering will and adds the 2\'s sensitivity, producing a higher octave that is preserved rather than reduced. Master numbers carry both greater gift and greater difficulty.' },
      { q: 'Are 11s spiritual?', a: 'Most are, by temperament if not by tradition. The 11 is wired for contact with the numinous; the question is whether they integrate it consciously or are overwhelmed by it.' },
      { q: 'Is 11 better than 2?', a: 'Neither is "better." If the 11 is unintegrated, the person tends to fall back on 2 energy (sensitivity, partnership) — which is also valid. The 11 is not a reward; it is an assignment.' },
      { q: 'What does seeing 11:11 mean?', a: 'In popular culture, 11:11 is read as a moment of synchronicity or spiritual nudge. Within numerology proper, doubled 1s reinforce the master-11 themes — alignment, vision, the call to wake up to one\'s deeper purpose.' },
    ],
    relatedEntries: ['2', '7', '22'],
  },

  {
    slug: '22',
    number: '22',
    category: 'master',
    symbol: 'XXII',
    keywords: ['master builder', 'manifestation', 'large-scale vision', 'practical idealism', 'legacy', 'architecture', 'global'],
    shortDescription: 'The master builder — the architect who turns vision into civilisation-scale form.',
    longDescription:
      'The 22 is the second master number — a doubled 2 that does not reduce, often called the Master Builder. Where the 11 receives vision, the 22 builds it into the world. Where the 4 builds a house, the 22 builds an institution, a movement, or a city. In Pythagorean tradition, the 22 is the rarest and most powerful of the master numbers — an 11 that has come down to earth. It carries enormous potential and equal responsibility.',
    personality:
      'A "Number 22" person combines the visionary sensitivity of the 11 with the practical mastery of the 4. They tend to be capable, calm under pressure, and oriented toward projects that take decades. They are the rare soul who can both see what is needed and assemble the resources, people, and structures to make it happen. Many 22s feel the weight of their own potential as a kind of pressure long before they understand what they are here to build.',
    strengths: [
      'extraordinary capacity for large-scale manifestation',
      'practical idealism — visions that ship',
      'ability to organise people and resources',
      'long-arc patience for civilisation-scale work',
      'integrity that holds across decades',
      'ability to translate the spiritual into the institutional',
    ],
    challenges: [
      'crushing self-imposed pressure to "live up to" the number',
      'avoidance of greatness through retreat into ordinary 4 work',
      'workaholism and identity loss',
      'difficulty delegating once they see the whole',
      'periodic existential crises about purpose',
      'tendency to override their own intuition for results',
    ],
    inLove:
      'The 22 loves through building — a shared life, a family business, a foundation, a body of joint work. They want a partner who shares their long-arc orientation and who understands that the work is not separate from love but part of it. The lesson of 22 in love is to remember that the partner is not a project, that intimacy needs presence as well as plans.',
    inCareer:
      'Founder of institutions, civil engineer, architect, surgeon-leader, head of state, NGO founder, scientist whose work changes a field, religious founder, orchestrator of large humanitarian works. The 22 is happiest in roles whose timescale is generational and whose impact is structural.',
    inSpirituality:
      'The 22\'s path is the path of the master builder for the divine — Solomon\'s temple, Gaudí\'s Sagrada Família, Mother Teresa\'s order. They awaken by discovering that their work itself is the prayer. The shadow practice is to take regular sabbaticals from the work, to remember that they are not the work, and that grace built the architect before the architect built anything.',
    inHealth:
      'The 22 carries 11\'s nervous sensitivity inside 4\'s structural body. They tend to chronic stress conditions — back trouble, hypertension, autoimmune flare-ups under sustained pressure. Long sleep, regular long walks, and one full day a week with no work are the disciplines that keep a 22 well over decades.',
    lifePathExplanation:
      'The 22 is preserved when an intermediate sum equals 22 during reduction. For example, December 22, 1969 → 1 + 2 + 2 + 2 + 1 + 9 + 6 + 9 = 32 → 3 + 2 = 5 (no 22). But December 31, 1985 → 1 + 2 + 3 + 1 + 1 + 9 + 8 + 5 = 30 → 3 + 0 = 3 (still no 22). A clean 22 life-path arises when the day-month-year sums to 22 before final reduction — for instance, August 14, 1972 → 8 + 1 + 4 + 1 + 9 + 7 + 2 = 32, no; but November 11, 1991 → 1 + 1 + 1 + 1 + 1 + 9 + 9 + 1 = 23, also no. Genuine 22s are rare; many people who flirt with the number actually walk a 4 with strong 22 themes.',
    tarotMajorArcana: 'The Fool / The World',
    tarotConnection:
      'The Major Arcana itself contains exactly 22 cards — from The Fool (0) through The World (XXI) — and the 22 carries this completeness within its number. The 22 holds both the Fool\'s open-hearted leap and the World\'s integrated mastery. Some traditions assign the 22 specifically to The Fool (the master builder must remain a beginner inwardly to keep building); others to The World (manifestation completed). Both readings illuminate the 22\'s arc: from leap to legacy.',
    famousExamples: ['Dalai Lama', 'Paul McCartney', 'Will Smith', 'Oprah Winfrey (22 expression)', 'Bill Clinton'],
    faqs: [
      { q: 'What does life-path 22 mean?', a: 'It means a soul-curriculum of large-scale, practical service — bringing visions into form on a scale that benefits many. The 22 is the rarest and most demanding life-path in Pythagorean numerology.' },
      { q: 'Why is 22 called the master builder?', a: 'Because it combines the 11\'s visionary intuition with the 4\'s structural discipline. The 22 sees what is needed and has the practical machinery to build it — the rare combination Pythagoras prized.' },
      { q: 'Is 22 the most powerful number?', a: 'Many numerologists consider it so, because it carries the highest material potential of any number. But power and ease are different — 22s often have hard, demanding lives commensurate with their gift.' },
      { q: 'How do I know if I\'m a 22 or a 4?', a: 'Most people who could be 22 also live as 4 for parts of their life. A true 22 generally feels called to work that is bigger than personal stability — building something that outlasts them. If the 4 feels confining without you knowing why, look for the 22.' },
      { q: 'Who is compatible with 22?', a: 'The 11 (vision and builder unite), the 8 (shared scale of ambition), and the 6 (love and home as ground for the work). The 22 must guard against being so fused with the work that no partner can compete.' },
    ],
    relatedEntries: ['4', '11', '8'],
  },

  {
    slug: '33',
    number: '33',
    category: 'master',
    symbol: 'XXXIII',
    keywords: ['master teacher', 'compassion', 'selfless service', 'healing', 'avatar', 'unconditional love', 'sacrifice'],
    shortDescription: 'The master teacher — the embodiment of compassion in service to humanity.',
    longDescription:
      'The 33 is the third and rarest master number — a doubled 3 that some traditions describe as the Master Teacher or the Christ-number. Where the 11 envisions and the 22 builds, the 33 loves — and through love, heals and teaches. The 33 carries the creative joy of the 3 amplified into universal scale, expressed as compassionate service. Many traditional numerologists do not even count the 33 unless it appears as a life-path total in its full form, considering it too rare and too demanding to claim lightly.',
    personality:
      'A "Number 33" person, when truly embodying the master vibration, is rare — most people with this potential live as 6 (the reduction) for much of their lives, growing into the 33 work later or never fully claiming it. The 33 is wired for selfless service: the teacher whose presence heals, the healer whose words teach, the leader whose authority comes from love rather than power. They feel everyone\'s pain and have to learn how to serve without dissolving.',
    strengths: [
      'profound capacity for unconditional love',
      'natural healer presence — calming to others',
      'creative expression in service of healing',
      'wisdom that teaches without lecturing',
      'sacrificial generosity of time and resources',
      'ability to inspire whole communities',
    ],
    challenges: [
      'martyrdom carried to physical breakdown',
      'dissolution of personal life in service to others',
      'difficulty receiving anything for themselves',
      'spiritual ego and saviour complex',
      'emotional flooding and depression',
      'feeling separate from "ordinary" human concerns',
    ],
    inLove:
      'The 33\'s love is wide enough to include strangers, which can make a partner feel one of many. They thrive with mature partners who share their service orientation and who can call them home from their work without resentment. The lesson of 33 in love is the human-sized particularity of one beloved — not love-the-idea, but this specific person at this kitchen table.',
    inCareer:
      'Master teacher, master healer, religious leader, founder of healing traditions, doctor whose practice is also a ministry, artist whose work heals, philanthropist of the most self-effacing kind. They thrive when the work is the embodiment of compassion at scale and crumble when forced into roles requiring competition or ego.',
    inSpirituality:
      'The 33\'s path is the path of the bodhisattva, the saint, the avatar — whether or not they use those words. They awaken through service so complete it dissolves the boundary between self and other. The shadow practice is to remember the body, the personal, the small. Without this, the 33\'s light burns out the lamp.',
    inHealth:
      'The 33 carries the most demanding nervous system of any of the master numbers — the porousness of the 11 doubled. Caregiver burnout, autoimmune disease, depression, and chronic fatigue are constant risks. Strict practices of solitude, embodiment (massage, dance, yoga), and refusing to over-give are essential. The 33 must be its own first patient.',
    lifePathExplanation:
      'The 33 is preserved as a life-path only when an intermediate sum lands cleanly on 33 before the final reduction. For example, June 6, 1957 → 6 + 6 + 1 + 9 + 5 + 7 = 34 → 3 + 4 = 7 (no 33). October 17, 1968 → 1 + 0 + 1 + 7 + 1 + 9 + 6 + 8 = 33 (preserved as master). True 33 life-paths are extremely rare — many practitioners only count the 33 when it arises this way. Otherwise the person is read as a 6 with master 33 potential.',
    tarotMajorArcana: 'Death / The World',
    tarotConnection:
      'The 33 has no single tarot Major it sits cleanly upon, because it is a master number whose true expression is rare. Two cards illuminate it. Death (Key XIII, where 1+3=4 — the disciplined letting go) speaks to the 33\'s ego-death in service. The World (Key XXI, where 2+1=3 — completion as joyful expression) speaks to the 33\'s mature gift: love that has integrated everything. Together they map the 33\'s arc: die to the small self, dance for the whole.',
    famousExamples: ['Albert Einstein (33 life-path)', 'Salma Hayek', 'Meryl Streep', 'John Lennon (33 expression)', 'Stephen King'],
    faqs: [
      { q: 'What does life-path 33 mean?', a: 'It means a soul-curriculum of master-level compassionate service — teaching, healing, and loving on a scale that touches many. It is the rarest of the Pythagorean master numbers.' },
      { q: 'Why do some numerologists not count the 33?', a: 'Because it is so rare and so demanding that many traditions reserve the designation only for those whose life-path totals to 33 cleanly, treating others with 33-potential as 6s. The school of Cheiro tends to be conservative; later American schools (Florence Campbell, Juno Jordan) more readily acknowledge the 33.' },
      { q: 'Is 33 the most spiritual number?', a: 'It is often called so because of its association with the Christ-number (Jesus is traditionally said to have died at 33), the 33 vertebrae of the human spine, the 33 degrees of Scottish Rite Masonry, and the 33 years of Krishna\'s mission. Whether this is the highest or only one expression among the masters depends on tradition.' },
      { q: 'How do I know if I\'m a 33 or a 6?', a: 'A true 33 generally has a life that demands compassionate service at a scale that exceeds personal life — they are pulled, often against their will, into roles of teacher or healer to many. A 6 lives the same gifts in smaller, family-and-community-scale form. Both are honourable.' },
      { q: 'Who is compatible with 33?', a: 'The 22 (master builder meets master teacher), the 11 (visionary meets healer), and the 9 (shared humanitarian breadth). The 33 must beware of partners who unconsciously want to be saved, and seek instead those who are fellow servants.' },
    ],
    relatedEntries: ['6', '11', '22'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getNumerologyEntry(slug: string): NumerologyEntry | null {
  return numerologyEntries.find((e) => e.slug === slug) ?? null;
}

export function getNumerologyByCategory(
  category: NumerologyCategory,
): NumerologyEntry[] {
  return numerologyEntries.filter((e) => e.category === category);
}
