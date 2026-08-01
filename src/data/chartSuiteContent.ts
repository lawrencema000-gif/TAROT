// Content for the extended chart suite UI — chart type explainers,
// Firdaria time-lord meanings, and return-chart house emphasis notes.
// Voice: warm, second-person, insightful, never fatalistic.

export interface ChartTypeInfo {
  key: string;
  name: string;
  tagline: string;
  description: string;
  whenToRead: string;
}

export const CHART_TYPES: ChartTypeInfo[] = [
  {
    key: 'natal',
    name: 'Natal Chart',
    tagline: 'The sky at your first breath',
    description:
      'Your natal chart is a snapshot of the heavens at the exact moment and place you were born. It maps your core temperament, gifts, and growth edges — the raw material you get to shape into a life. Everything else in astrology is read against this foundation.',
    whenToRead:
      'Read it whenever you want to return to who you are underneath the noise. It is the anchor for every other chart here.',
  },
  {
    key: 'transits',
    name: 'Transits',
    tagline: 'Where the sky meets your chart today',
    description:
      'Transits track where the planets are right now and how they touch your natal chart. They describe the weather moving through your life — invitations, pressures, and openings that come and go. Nothing in a transit forces your hand; it simply shows you what season you are in.',
    whenToRead:
      'Check transits when life feels charged and you want to name what is stirring. They are your day-to-day and month-to-month forecast.',
  },
  {
    key: 'solar-return',
    name: 'Solar Return',
    tagline: 'Your birthday chart for the year',
    description:
      'A solar return chart is cast for the instant the Sun comes back to its exact natal position each year — your true astrological birthday. It sketches the themes, priorities, and growth areas of your personal year ahead. Think of it as the table of contents for your next trip around the Sun.',
    whenToRead:
      'Read it near your birthday to set intentions for the year, or revisit it mid-year to see how its themes are unfolding.',
  },
  {
    key: 'lunar-return',
    name: 'Lunar Return',
    tagline: 'Your emotional month, mapped',
    description:
      'A lunar return is cast for the moment the Moon returns to its natal position, roughly every 27 days. It reveals the emotional tone and inner focus of your month ahead — where your feelings, needs, and instincts will want attention. It is the intimate, fast-moving cousin of the solar return.',
    whenToRead:
      'Read it at the start of each lunar month when you want a heads-up on your emotional landscape and self-care priorities.',
  },
  {
    key: 'progressions',
    name: 'Secondary Progressions',
    tagline: 'Your inner life, slowly unfolding',
    description:
      'Secondary progressions advance your natal chart one day for each year of life, tracing the slow evolution of who you are becoming. They speak to inner shifts — maturing needs, changing identity, quiet turning points — rather than outside events. Your progressed Moon alone tells a rich story of your emotional chapters.',
    whenToRead:
      'Turn to progressions during big identity shifts or when you sense you are becoming someone new and want language for it.',
  },
  {
    key: 'tertiary',
    name: 'Tertiary Progressions',
    tagline: 'The fast current beneath your months',
    description:
      'Tertiary progressions move your chart one day for each lunar month of life, running quicker than secondary progressions. They capture the subtle undercurrents of your weeks and months — moods, motivations, and inner tides that transits alone can miss. They add fine detail to the bigger progressed picture.',
    whenToRead:
      'Read them when you want a closer look at a particular stretch of weeks, especially alongside your secondary progressions.',
  },
  {
    key: 'solar-arc',
    name: 'Solar Arc Directions',
    tagline: 'Every planet moving at the Sun’s pace',
    description:
      'Solar arc directions advance every point in your chart by the Sun’s yearly motion — about one degree per year of life. When a directed planet reaches an exact aspect to a natal point, it often marks a memorable milestone or threshold. It is one of astrology’s clearest tools for timing significant chapters.',
    whenToRead:
      'Check solar arcs around major life events or birthdays to see which long-building themes are ripening this year.',
  },
  {
    key: 'firdaria',
    name: 'Firdaria',
    tagline: 'Ancient time-lords of your life story',
    description:
      'Firdaria is a Persian timing technique that divides your life into planetary chapters, each ruled by a time-lord who colors that era. Knowing your current lord — and sub-lord — reveals which part of your chart is holding the pen right now. It offers a wide-angle view of your life as a sequence of meaningful seasons.',
    whenToRead:
      'Read it when you want the big picture: which life chapter you are in, when it began, and what the next one will emphasize.',
  },
  {
    key: 'composite',
    name: 'Composite Chart',
    tagline: 'The chart of the relationship itself',
    description:
      'A composite chart blends two people’s charts by taking the midpoints between their planets, creating a third chart for the relationship itself. It describes the “we” — the shared purpose, chemistry, and challenges that belong to the bond rather than to either person. Couples often recognize their dynamic in it instantly.',
    whenToRead:
      'Read it when you want to understand what a relationship is here to do and how it behaves as its own living thing.',
  },
  {
    key: 'davison',
    name: 'Davison Chart',
    tagline: 'A real moment between two births',
    description:
      'The Davison chart finds the midpoint in time and space between two people’s births and casts a real chart for that moment. Unlike the composite, it corresponds to an actual sky, so it can be read with transits and progressions. It shows the relationship as an entity with its own unfolding timeline.',
    whenToRead:
      'Use it to explore a relationship’s deeper purpose, or to time its seasons by running transits to it like a natal chart.',
  },
  {
    key: 'progressed-composite',
    name: 'Progressed Composite',
    tagline: 'How your bond evolves over time',
    description:
      'The progressed composite advances a relationship’s composite chart through time, showing how the bond itself matures. Relationships are not static — they move through honeymoons, tests, deepenings, and reinventions — and this chart names the current chapter. It reveals what the “we” is learning right now.',
    whenToRead:
      'Read it when a relationship feels like it is shifting and you want to understand the season it is entering together.',
  },
  {
    key: 'synastry',
    name: 'Synastry',
    tagline: 'Two charts in conversation',
    description:
      'Synastry lays one person’s chart over another’s to see how their planets interact — where they spark, soothe, challenge, and teach each other. It maps the chemistry between you: what feels effortless, what needs patience, and what each of you awakens in the other. Every contact is information, not a verdict.',
    whenToRead:
      'Read it when you want to understand the dynamics between you and someone specific — romantic, family, friend, or colleague.',
  },
  {
    key: 'sky-now',
    name: 'Sky Now',
    tagline: 'The current sky, no birth data needed',
    description:
      'Sky Now is a chart of the heavens at this very moment, independent of anyone’s birth data. It shows the collective weather everyone is living under — lunar phases, planetary sign changes, and aspects forming overhead. It is the shared backdrop against which all our personal charts play out.',
    whenToRead:
      'Glance at it any time you are curious what is happening overhead, or before a reading to feel into the day’s atmosphere.',
  },
];

export const FIRDARIA_LORD_MEANINGS: Record<string, string> = {
  Sun:
    'The Sun chapter turns the light toward identity, purpose, and visibility — a season for stepping into leadership and being seen for who you truly are. Themes of vitality, recognition, and connection to father figures or mentors tend to move to center stage, inviting you to live more wholeheartedly as yourself.',
  Venus:
    'The Venus chapter softens life toward love, beauty, and connection — relationships, artistry, and pleasure become your great teachers. It is a season for refining what you value, deepening bonds, and learning that receiving is a skill as important as giving.',
  Mercury:
    'The Mercury chapter quickens the mind — study, writing, commerce, and conversation take the lead, and your curiosity opens doors. It is a season for learning new skills, building networks, and discovering how much your words and ideas can shape your path.',
  Moon:
    'The Moon chapter draws you toward home, belonging, and the inner life — your needs, habits, and closest people ask for real attention. It is a season of emotional deepening and frequent change, teaching you to trust your instincts and honor your rhythms.',
  Saturn:
    'The Saturn chapter asks you to build something that lasts — responsibility, mastery, and patience become the raw materials of this era. Though it can feel weighty, this is the season where sustained effort turns into structure, authority, and quiet self-respect.',
  Jupiter:
    'The Jupiter chapter widens the horizon — growth, opportunity, teaching, travel, and faith in the future color these years. It is a season for saying yes to what expands you, developing your philosophy of life, and sharing your abundance generously.',
  Mars:
    'The Mars chapter stokes the fire of courage, drive, and independence — you are asked to act, compete, and fight for what matters. It is a season for building strength and learning to channel intensity with skill, so your boldness becomes achievement rather than friction.',
  'North Node':
    'The North Node chapter pulls you toward unfamiliar but destined territory — growth comes through appetite, ambition, and situations that stretch you past your comfort zone. It is a season of increase and forward motion, asking you to trust the direction your life keeps insisting on.',
  'South Node':
    'The South Node chapter invites release, reflection, and a return to inner wisdom — what is complete asks to be honored and set down. It is a quieter, more spiritual season, teaching that letting go is not loss but the clearing that makes your next chapter possible.',
};

export const RETURN_HOUSE_EMPHASIS: Record<string, string> = {
  '1':
    'A first-house emphasis puts you at the center of the story: this period is about your identity, vitality, and personal reinvention. Expect to feel more self-directed — how you show up sets the tone for everything else.',
  '2':
    'A second-house emphasis turns attention to money, resources, and self-worth. This period asks you to strengthen your material foundation and get honest about what you truly value.',
  '3':
    'A third-house emphasis fills the period with conversation, learning, short trips, and connections close to home. Your mind is the main instrument now — communicate, study, and stay curious.',
  '4':
    'A fourth-house emphasis roots the period in home, family, and your inner foundations. Matters of belonging, living space, and ancestry ask for care — tending your base steadies everything above it.',
  '5':
    'A fifth-house emphasis lights up creativity, romance, play, and children. This period wants you to make things, take heartfelt risks, and remember what genuinely delights you.',
  '6':
    'A sixth-house emphasis centers daily routines, work, health, and service. This period rewards refining your habits and craft — small consistent adjustments quietly transform the whole year.',
  '7':
    'A seventh-house emphasis makes partnership the main stage — marriage, close collaborations, and one-to-one bonds of every kind. Others act as mirrors now, teaching you about yourself through relationship.',
  '8':
    'An eighth-house emphasis draws you into depth: shared resources, intimacy, and honest reckonings with what must transform. This period favors merging wisely, releasing what is finished, and emerging renewed.',
  '9':
    'A ninth-house emphasis expands your world through travel, higher learning, publishing, and questions of meaning. This period invites you beyond familiar borders — literally or philosophically — to grow your faith in life.',
  '10':
    'A tenth-house emphasis spotlights career, reputation, and public direction. This period is about your contribution to the world — ambitions ripen, and how you are seen professionally takes on real weight.',
  '11':
    'An eleventh-house emphasis gathers friends, communities, and future visions around you. This period grows you through belonging — allies, networks, and shared hopes carry your goals further than solo effort could.',
  '12':
    'A twelfth-house emphasis turns the period inward toward rest, retreat, healing, and the life behind the scenes. It is a season for closure and spiritual replenishment — honoring your need for quiet prepares the ground for your next visible chapter.',
};
