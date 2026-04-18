import type { ZodiacSign } from '../types';
import { localizeZodiacProfile } from '../i18n/localizeZodiac';

export interface TarotArchetype {
  card: string;
  reason: string;
}

export interface ZodiacProfile {
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'cardinal' | 'fixed' | 'mutable';
  rulingPlanet: string;
  strengths: string[];
  challenges: string[];
  loveStyle: string;
  careerStrengths: string[];
  fullDescription: string;
  shadowPattern: string;
  loveDeep: string;
  careerDeep: string;
  moneyPattern: string;
  spiritualLesson: string;
  tarotArchetype: TarotArchetype;
}

export const zodiacProfiles: Record<ZodiacSign, ZodiacProfile> = {
  aries: {
    element: 'fire',
    modality: 'cardinal',
    rulingPlanet: 'Mars',
    strengths: ['courageous', 'determined', 'confident', 'enthusiastic', 'pioneering'],
    challenges: ['impatient', 'impulsive', 'competitive', 'confrontational'],
    loveStyle: 'passionate and direct',
    careerStrengths: ['leadership', 'initiative', 'pioneering', 'decision-making'],
    fullDescription: 'Aries is the spark of beginnings: direct, courageous, impatient with stagnation, and deeply energized by challenge. At best, Aries brings clarity\u2014what others overthink, Aries acts on. At its healthiest, Aries is the protector, the initiator, the one who says "we can do this" when everyone hesitates.\n\nRuled by Mars, Aries carries the energy of the warrior\u2014not through aggression, but through the willingness to go first. This is the sign that breaks ground, starts movements, and refuses to wait for permission. There is a raw honesty to Aries that others either find refreshing or intimidating.\n\nWhen an Aries is aligned, their courage is contagious. They make others believe that action is possible, that fear is just information, and that momentum matters more than perfection. Their gift is initiation\u2014the ability to turn thought into movement before doubt takes hold.',
    shadowPattern: 'When Aries feels powerless, it may become confrontational or restless rather than vulnerable. The shadow side of Aries rushes, reacts, or burns bridges when emotions rise. Impatience can turn into aggression, and the need to be first can become a need to be right at all costs.',
    loveDeep: 'Aries needs honesty, passion, and forward motion in love. Stagnant relationships feel like suffocation. Aries falls hard and fast, and shows love through action\u2014protecting, providing, and showing up with intensity. They need a partner who matches their directness and does not mistake their passion for hostility.',
    careerDeep: 'Aries thrives in roles with autonomy, speed, and competition\u2014leadership, entrepreneurship, sales, performance, emergency response, and anything that rewards decisive action. They are natural self-starters who wilt under micromanagement.',
    moneyPattern: 'Strong at earning through initiative and bold moves. Needs structure to avoid impulsive spending. Aries is better at making money than saving it, and benefits from systems that automate restraint.',
    spiritualLesson: 'Strength without aggression. Action guided by purpose, not just impulse.',
    tarotArchetype: { card: 'The Emperor', reason: 'Healthy leadership, clear boundaries, and purposeful direction\u2014the Emperor channels raw Aries energy into structured power.' },
  },
  taurus: {
    element: 'earth',
    modality: 'fixed',
    rulingPlanet: 'Venus',
    strengths: ['reliable', 'patient', 'practical', 'devoted', 'sensual'],
    challenges: ['stubborn', 'possessive', 'resistant to change', 'comfort-seeking'],
    loveStyle: 'sensual and devoted',
    careerStrengths: ['persistence', 'financial acumen', 'stability', 'craftsmanship'],
    fullDescription: 'Taurus is stability made human: loyal, sensual, grounded, and quietly powerful. Taurus builds what lasts\u2014relationships, routines, wealth, skills\u2014by showing up consistently. At its best, Taurus is the steady hand that calms chaos and turns dreams into something real.\n\nRuled by Venus, Taurus has a deep relationship with beauty, comfort, and the physical world. This is not superficial\u2014it is a genuine understanding that life is meant to be savored. Taurus knows the value of a well-cooked meal, a well-made garment, a garden tended with patience. They understand that mastery comes from repetition, not shortcuts.\n\nWhen Taurus is aligned, they become the foundation others build their lives on. Their reliability is not boring\u2014it is a form of love. The gift of Taurus is endurance: the ability to keep going when others quit, to see value in slowness, and to prove that consistency creates more than brilliance alone.',
    shadowPattern: 'Taurus can resist change even when change is necessary. When threatened, Taurus may become stubborn, possessive, or emotionally "fixed"\u2014refusing to let go of people, patterns, or possessions long past their expiration. Comfort can become a prison when growth requires discomfort.',
    loveDeep: 'Taurus needs safety, touch, and reliability in love. Love is shown through presence and effort, not drama or grand gestures. Taurus is intensely loyal and expects the same\u2014betrayal cuts deep and is rarely fully forgiven. They want a partner who shows up, not one who dazzles and disappears.',
    careerDeep: 'Taurus thrives where patience and mastery matter\u2014finance, design, food and hospitality, real estate, craftsmanship, management, and anything that rewards steady excellence over flashy innovation.',
    moneyPattern: 'Naturally aligned with long-term wealth building. Taurus understands compound interest intuitively. The risk is comfort spending as a coping mechanism\u2014using luxury to soothe stress rather than addressing it.',
    spiritualLesson: 'Security without rigidity. Growth without betrayal of the self.',
    tarotArchetype: { card: 'The Hierophant', reason: 'Values, commitment, and grounded wisdom\u2014the Hierophant reflects Taurus\u2019s devotion to what is tried, true, and deeply meaningful.' },
  },
  gemini: {
    element: 'air',
    modality: 'mutable',
    rulingPlanet: 'Mercury',
    strengths: ['adaptable', 'outgoing', 'intelligent', 'curious', 'witty'],
    challenges: ['inconsistent', 'indecisive', 'restless', 'scattered'],
    loveStyle: 'playful and communicative',
    careerStrengths: ['communication', 'versatility', 'networking', 'learning'],
    fullDescription: 'Gemini is curiosity and connection: quick, social, mentally agile, and hungry for meaning through conversation. Gemini processes life by naming it\u2014asking questions, linking ideas, exploring perspectives. At its best, Gemini is brilliant at learning, teaching, writing, and making life feel interesting again.\n\nRuled by Mercury, the messenger, Gemini carries information between worlds. They are translators\u2014able to speak the language of different groups, adapt to any room, and find the connecting thread between seemingly unrelated ideas. This is not superficiality; it is a genuine love of pattern recognition.\n\nWhen Gemini is aligned, they become the spark that wakes up a stale conversation, the friend who always has an insight, the mind that sees options where others see dead ends. Their gift is versatility: the ability to keep evolving, stay curious, and never stop asking "what if?"',
    shadowPattern: 'When overwhelmed, Gemini can scatter, avoid depth, or overthink instead of feeling. The shadow Gemini talks their way around emotions rather than through them, and may use humor or intellectualization as armor against vulnerability.',
    loveDeep: 'Gemini needs mental chemistry, play, and freedom to evolve in love. Monotony kills romance for Gemini faster than anything. They need a partner who can keep up intellectually, who surprises them, and who does not try to pin them down into a single version of themselves.',
    careerDeep: 'Gemini thrives in communication-heavy roles\u2014marketing, media, sales, product development, education, community management, journalism, and any role that rewards adaptability and quick thinking.',
    moneyPattern: 'Good at creating opportunities and generating income from multiple streams. Needs systems to avoid inconsistent financial habits. Gemini benefits from automation and having a trusted advisor for long-term planning.',
    spiritualLesson: 'Depth without losing freedom. Truth without constant distraction.',
    tarotArchetype: { card: 'The Magician', reason: 'Skill, communication, and focused intention\u2014the Magician represents Gemini\u2019s ability to channel scattered brilliance into purposeful creation.' },
  },
  cancer: {
    element: 'water',
    modality: 'cardinal',
    rulingPlanet: 'Moon',
    strengths: ['tenacious', 'loyal', 'emotional', 'sympathetic', 'intuitive'],
    challenges: ['moody', 'pessimistic', 'suspicious', 'clingy'],
    loveStyle: 'nurturing and protective',
    careerStrengths: ['intuition', 'caregiving', 'memory', 'emotional leadership'],
    fullDescription: 'Cancer is emotional intelligence and protection: deeply intuitive, loyal, and guided by feeling. Cancer senses what is unsaid, remembers what matters, and defends the people it loves fiercely. At its best, Cancer creates home\u2014physically and emotionally\u2014where others can soften and heal.\n\nRuled by the Moon, Cancer lives in cycles\u2014moods that wax and wane, energy that ebbs and flows with emotional tides. This is not weakness; it is attunement. Cancer reads rooms the way musicians read notes, catching the subtle shifts in energy that others miss entirely.\n\nWhen Cancer is aligned, they become a sanctuary. Their presence feels like being understood without having to explain yourself. The gift of Cancer is emotional memory: the ability to hold space for what matters, to create belonging, and to remind people that being cared for is not a luxury\u2014it is a need.',
    shadowPattern: 'When unsafe, Cancer can withdraw into their shell, become defensive, or cling to the past. The shadow Cancer builds walls disguised as softness\u2014quietly keeping score, holding grudges beneath a nurturing exterior, or using care as a form of control.',
    loveDeep: 'Cancer needs emotional safety, tenderness, and consistency in love. They love through care and devotion\u2014cooking, remembering, anticipating needs. They need a partner who values emotional labor and who does not mistake sensitivity for weakness.',
    careerDeep: 'Cancer thrives in caregiving or emotionally aware spaces\u2014hospitality, wellness, counseling, healthcare, HR, teaching, and leadership through empathy. They excel at roles where understanding people is the core skill.',
    moneyPattern: 'Often linked to security needs\u2014Cancer may save anxiously or spend to create comfort. Best served by gentle, long-term financial planning that reduces the anxiety around "enough."',
    spiritualLesson: 'Boundaries that do not become walls. Nourishing without self-erasure.',
    tarotArchetype: { card: 'The Chariot', reason: 'Emotional mastery and protective drive\u2014the Chariot reflects Cancer\u2019s ability to move forward powerfully while holding what they love close.' },
  },
  leo: {
    element: 'fire',
    modality: 'fixed',
    rulingPlanet: 'Sun',
    strengths: ['creative', 'passionate', 'generous', 'warm-hearted', 'inspiring'],
    challenges: ['arrogant', 'stubborn', 'self-centered', 'dramatic'],
    loveStyle: 'dramatic and generous',
    careerStrengths: ['leadership', 'creativity', 'performance', 'inspiration'],
    fullDescription: 'Leo is heart, visibility, and pride: warm, expressive, bold, and built for leadership through inspiration. Leo wants life to mean something and will not shrink to fit someone else\u2019s comfort. At its best, Leo is generous\u2014bringing joy, courage, and celebration to everyone around them.\n\nRuled by the Sun, Leo naturally gravitates toward center stage\u2014not out of vanity, but because their warmth genuinely lights up spaces. Leo understands something others often forget: that life is meant to be celebrated, that confidence is a gift you can give others, and that being seen fully is an act of courage.\n\nWhen Leo is aligned, their presence is magnetic without being overwhelming. They lift others through genuine enthusiasm, creative expression, and an unshakable belief that people deserve to feel special. The gift of Leo is generosity of spirit\u2014the willingness to shine and to make others feel like they can shine too.',
    shadowPattern: 'When insecure, Leo can seek validation compulsively, become controlling of attention and praise, or take things deeply personally. The shadow Leo mistakes admiration for love and may collapse when the spotlight moves elsewhere.',
    loveDeep: 'Leo needs loyalty, admiration, and romance that feels intentional. They give generously in love and need to feel that effort is reciprocated. Leo wants a partner who sees their full self\u2014not just the confident exterior\u2014and who is not intimidated by their bigness.',
    careerDeep: 'Leo thrives in roles with creativity and leadership\u2014management, entertainment, branding, entrepreneurship, public speaking, coaching, and any field where personal presence drives results.',
    moneyPattern: 'Can earn well through confidence and presence. The risk is spending tied to image or emotional states\u2014retail therapy, excessive generosity, or investments driven by ego rather than analysis.',
    spiritualLesson: 'Confidence without ego. Radiance without needing approval.',
    tarotArchetype: { card: 'Strength', reason: 'Heart-led courage and quiet dignity\u2014the Strength card reflects Leo\u2019s truest power: gentleness combined with unshakable inner fire.' },
  },
  virgo: {
    element: 'earth',
    modality: 'mutable',
    rulingPlanet: 'Mercury',
    strengths: ['loyal', 'analytical', 'kind', 'hardworking', 'precise'],
    challenges: ['shyness', 'worry', 'overly critical', 'perfectionistic'],
    loveStyle: 'thoughtful and devoted',
    careerStrengths: ['analysis', 'attention to detail', 'service', 'systems thinking'],
    fullDescription: 'Virgo is precision, devotion, and improvement: observant, practical, and deeply caring through action. Virgo sees what needs fixing\u2014not to criticize, but to protect the future. At its best, Virgo is healing energy: thoughtful, responsible, quietly brilliant.\n\nRuled by Mercury in its analytical form, Virgo processes the world through pattern recognition and discernment. Where Gemini uses Mercury for breadth, Virgo uses it for depth\u2014refining, organizing, perfecting. This is the sign that reads the fine print, catches the error before it costs something, and shows love by making sure things work.\n\nWhen Virgo is aligned, their competence becomes a form of service that uplifts everyone around them. They create order from chaos, not through control, but through genuine care for quality and functionality. The gift of Virgo is mastery through attention: the understanding that excellence is not about talent alone, but about showing up and doing the work others overlook.',
    shadowPattern: 'Virgo can become anxious, perfectionistic, or harshly self-critical when it feels out of control. The shadow Virgo turns the analytical lens inward with cruelty\u2014holding themselves to standards no human could meet, and sometimes projecting that criticism onto others.',
    loveDeep: 'Virgo needs reliability, respect, and a partner who values effort. Virgo shows love through acts of service\u2014fixing things, organizing, remembering details. They need a partner who notices and appreciates these quiet devotions rather than demanding grand romantic gestures.',
    careerDeep: 'Virgo thrives in analysis, health, operations, systems design, quality assurance, research, and anything that rewards competence, attention to detail, and steady improvement.',
    moneyPattern: 'Usually financially responsible and detail-oriented with budgets. The risk is over-worrying about "enough" or under-spending to the point of deprivation. Virgo benefits from permission to enjoy their earnings.',
    spiritualLesson: 'Excellence without self-punishment. Service without martyrdom.',
    tarotArchetype: { card: 'The Hermit', reason: 'Discernment, inner truth, and refinement\u2014the Hermit reflects Virgo\u2019s quiet wisdom and the power found in careful, solitary reflection.' },
  },
  libra: {
    element: 'air',
    modality: 'cardinal',
    rulingPlanet: 'Venus',
    strengths: ['cooperative', 'diplomatic', 'gracious', 'fair-minded', 'relational'],
    challenges: ['indecisive', 'avoids confrontation', 'self-pity', 'people-pleasing'],
    loveStyle: 'romantic and harmonious',
    careerStrengths: ['diplomacy', 'aesthetics', 'partnership', 'negotiation'],
    fullDescription: 'Libra is harmony, beauty, and relational intelligence: charming, diplomatic, and guided by fairness. Libra sees multiple sides and naturally wants balance\u2014emotionally, socially, aesthetically. At its best, Libra creates peace without losing integrity and makes people feel understood.\n\nRuled by Venus in its relational form, Libra has an innate understanding of how people connect, what creates beauty, and where justice lives. This is not indecision\u2014it is the genuine ability to hold complexity. Libra understands that most situations are not black and white, and that the best solutions honor multiple truths.\n\nWhen Libra is aligned, they become the bridge between opposing sides\u2014the mediator, the designer, the person who can walk into conflict and find the through-line of fairness. The gift of Libra is perspective: the ability to see what is just, what is beautiful, and what brings people together rather than apart.',
    shadowPattern: 'Libra can avoid conflict at any cost, people-please to the point of self-erasure, or delay decisions until stress forces action. The shadow Libra keeps the peace by abandoning their own truth, and may build resentment silently behind a gracious exterior.',
    loveDeep: 'Libra needs partnership, romance, and mutual consideration. They thrive in relationships that feel balanced\u2014where both people invest equally. Libra wants a partner who values harmony but who is also honest enough to engage in healthy conflict when needed.',
    careerDeep: 'Libra thrives in negotiation, design, law, consulting, client management, community building, and any role that requires understanding multiple perspectives and creating elegant solutions.',
    moneyPattern: 'Can be financially steady but spending may lean toward beauty, comfort, and experiences. Libra benefits from joint financial planning and having a partner or advisor who balances their aesthetic instincts with practical budgeting.',
    spiritualLesson: 'Peace without self-betrayal. Choice without fear.',
    tarotArchetype: { card: 'Justice', reason: 'Truth, balance, and clean decisions\u2014Justice reflects Libra\u2019s highest expression: fairness that does not compromise integrity.' },
  },
  scorpio: {
    element: 'water',
    modality: 'fixed',
    rulingPlanet: 'Pluto',
    strengths: ['resourceful', 'brave', 'passionate', 'strategic', 'perceptive'],
    challenges: ['distrusting', 'jealous', 'secretive', 'controlling'],
    loveStyle: 'intense and transformative',
    careerStrengths: ['investigation', 'strategy', 'transformation', 'depth'],
    fullDescription: 'Scorpio is transformation and truth: intense, private, loyal, and built for emotional depth. Scorpio does not want shallow connection\u2014it wants real. At its best, Scorpio is fearless in confronting darkness and turning pain into power.\n\nRuled by Pluto, the planet of death and rebirth, Scorpio understands cycles of destruction and renewal in a way no other sign does. This is the sign that walks into the room and immediately reads the subtext\u2014who is lying, what is unsaid, where the power really sits. Scorpio does not flinch from difficulty because it knows that the most valuable things are found in the depths.\n\nWhen Scorpio is aligned, their intensity becomes a gift: the friend who sees through your mask and loves you anyway, the strategist who finds the hidden path, the healer who is not afraid to sit with pain. The gift of Scorpio is transformation: the ability to face what others avoid and emerge stronger on the other side.',
    shadowPattern: 'When wounded, Scorpio can control, test loyalty, or struggle with trust to the point of sabotaging connection. The shadow Scorpio uses their perceptiveness as a weapon\u2014manipulating through emotional intelligence rather than communicating directly.',
    loveDeep: 'Scorpio needs honesty, devotion, and emotional intimacy above all else. Surface-level connection feels pointless. Scorpio tests love\u2014not out of cruelty, but because they have been burned before and need to know you are real before they give themselves fully.',
    careerDeep: 'Scorpio thrives in psychology, investigation, strategy, finance, medicine, research, crisis management, and leadership under pressure\u2014any field where depth, discretion, and transformative thinking are assets.',
    moneyPattern: 'Strong financial instincts and an intuitive sense for long-term investments. Scorpio tends toward strategic wealth building but may have an all-or-nothing relationship with money\u2014either controlling it rigidly or ignoring it during emotional upheaval.',
    spiritualLesson: 'Power without control. Vulnerability without fear.',
    tarotArchetype: { card: 'Death', reason: 'Rebirth, endings, and transformation\u2014the Death card reflects Scorpio\u2019s core truth: that letting go is the gateway to becoming.' },
  },
  sagittarius: {
    element: 'fire',
    modality: 'mutable',
    rulingPlanet: 'Jupiter',
    strengths: ['generous', 'idealistic', 'great sense of humor', 'adventurous', 'philosophical'],
    challenges: ['promises more than can deliver', 'impatient', 'tactless', 'overconfident'],
    loveStyle: 'adventurous and philosophical',
    careerStrengths: ['teaching', 'exploration', 'expansion', 'inspiration'],
    fullDescription: 'Sagittarius is expansion and meaning: optimistic, adventurous, and hungry for truth. Sagittarius grows through experience\u2014travel, learning, risk, new philosophies. At its best, Sagittarius is inspiring, honest, and capable of lifting people out of despair with perspective.\n\nRuled by Jupiter, the planet of abundance and wisdom, Sagittarius carries an innate belief that life is generous and that growth is always possible. This is the sign that books the flight, asks the uncomfortable question, and refuses to accept "this is just how things are" as a final answer.\n\nWhen Sagittarius is aligned, their optimism is not naive\u2014it is earned through experience. They become the teacher, the philosopher, the storyteller who can reframe pain as a chapter rather than an ending. The gift of Sagittarius is perspective: the ability to zoom out, see the bigger picture, and remind everyone that there is always more to explore.',
    shadowPattern: 'Sagittarius can avoid responsibility, overpromise, or use humor to dodge feelings. The shadow Sagittarius runs\u2014from commitment, from consequences, from the quiet moments where real self-knowledge lives. Restlessness can mask a fear of sitting still long enough to be truly known.',
    loveDeep: 'Sagittarius needs freedom, growth, and a partner who respects independence. They fall in love with possibility and need to feel that a relationship is expanding their world, not shrinking it. The fastest way to lose a Sagittarius is to clip their wings.',
    careerDeep: 'Sagittarius thrives in education, travel, media, sales, coaching, spirituality, entrepreneurship, publishing, and any role that involves inspiring others or exploring new frontiers.',
    moneyPattern: 'Can be financially inconsistent\u2014feast-or-famine cycles driven by enthusiasm followed by restlessness. Benefits from automation, long-term investment goals, and having a financial structure that accounts for their need for freedom.',
    spiritualLesson: 'Freedom with discipline. Truth with compassion.',
    tarotArchetype: { card: 'Temperance', reason: 'Alignment, integration, and higher purpose\u2014Temperance reflects Sagittarius\u2019s quest to blend experience into wisdom and find balance in expansion.' },
  },
  capricorn: {
    element: 'earth',
    modality: 'cardinal',
    rulingPlanet: 'Saturn',
    strengths: ['responsible', 'disciplined', 'self-control', 'good managers', 'strategic'],
    challenges: ['know-it-all', 'unforgiving', 'condescending', 'rigid'],
    loveStyle: 'traditional and committed',
    careerStrengths: ['management', 'planning', 'achievement', 'long-term strategy'],
    fullDescription: 'Capricorn is discipline and destiny: strategic, ambitious, and built to create legacy. Capricorn understands time\u2014how small actions become results, how patience compounds, how the long game always wins. At its best, Capricorn is reliable leadership: calm under pressure, strong boundaries, long-term success.\n\nRuled by Saturn, the planet of structure and mastery, Capricorn does not just dream\u2014it builds. This is the sign that drafts the 10-year plan, then actually follows it. Capricorn earns respect not through charm but through competence, consistency, and quiet authority.\n\nWhen Capricorn is aligned, their discipline becomes inspiring rather than rigid. They demonstrate that success is available to anyone willing to work methodically and delay gratification. The gift of Capricorn is legacy: the ability to build something that outlasts the moment, to create structures that serve generations, and to prove that discipline is its own form of freedom.',
    shadowPattern: 'Capricorn can become rigid, emotionally distant, or tie self-worth entirely to achievement. The shadow Capricorn works to avoid feeling\u2014using accomplishment as armor, confusing exhaustion with worthiness, and struggling to rest without guilt.',
    loveDeep: 'Capricorn needs respect, loyalty, and a partner who values consistency and ambition. They show love through providing, protecting, and building a stable future. Capricorn needs a partner who understands that their work ethic is not a rejection of intimacy\u2014it is their way of showing they care.',
    careerDeep: 'Capricorn thrives in business, management, finance, law, engineering, operations, government, and anything with clear progression, measurable outcomes, and opportunities for increasing authority.',
    moneyPattern: 'Strong long-term wealth potential through disciplined saving and strategic investing. The risk is a scarcity mindset that prevents enjoyment, or overworking to accumulate without ever feeling like it is "enough."',
    spiritualLesson: 'Success without self-neglect. Authority without hardness.',
    tarotArchetype: { card: 'The Devil', reason: 'Mastery over attachments and reclaiming power consciously\u2014the Devil card challenges Capricorn to examine what they are chained to and whether their ambition serves their soul.' },
  },
  aquarius: {
    element: 'air',
    modality: 'fixed',
    rulingPlanet: 'Uranus',
    strengths: ['progressive', 'original', 'independent', 'humanitarian', 'visionary'],
    challenges: ['runs from emotional expression', 'temperamental', 'uncompromising', 'detached'],
    loveStyle: 'unconventional and intellectual',
    careerStrengths: ['innovation', 'technology', 'humanitarian work', 'systems design'],
    fullDescription: 'Aquarius is originality and vision: independent, future-focused, and driven by ideals. Aquarius sees patterns in society and wants progress\u2014new systems, new ways, new truths. At its best, Aquarius is brilliant, humanitarian, and emotionally steady in crisis.\n\nRuled by Uranus, the planet of revolution and innovation, Aquarius operates on a frequency that is slightly ahead of its time. This is the sign that sees what could be while others are still arguing about what is. Aquarius values ideas, community, and the freedom to think differently\u2014and they will sacrifice convention for authenticity without hesitation.\n\nWhen Aquarius is aligned, their independence becomes a gift to the collective. They build the platforms, design the systems, and create the communities that change how people connect and think. The gift of Aquarius is vision: the ability to imagine a better future and to work toward it without needing everyone to agree first.',
    shadowPattern: 'Aquarius can detach, intellectualize feelings, or resist intimacy when it feels limiting. The shadow Aquarius confuses emotional distance with objectivity and may unconsciously use their idealism as a way to avoid the messy, personal work of close relationships.',
    loveDeep: 'Aquarius needs friendship, intellectual respect, and space in love. Control kills attraction instantly. They need a partner who has their own life, their own opinions, and who does not try to domesticate their unconventional nature. Love for Aquarius must feel like freedom, not a cage.',
    careerDeep: 'Aquarius thrives in technology, innovation, research, systems design, activism, community building, nonprofit leadership, and any role where original thinking and big-picture vision are valued over tradition.',
    moneyPattern: 'Can do well financially through unconventional paths\u2014startups, technology, freelancing, investments in emerging sectors. Needs grounding to avoid inconsistency and benefits from financial structures that support their non-linear career path.',
    spiritualLesson: 'Connection without losing self. Heart with intellect.',
    tarotArchetype: { card: 'The Star', reason: 'Hope, vision, and renewal\u2014the Star reflects Aquarius\u2019s role as the light that points toward possibility, even in darkness.' },
  },
  pisces: {
    element: 'water',
    modality: 'mutable',
    rulingPlanet: 'Neptune',
    strengths: ['compassionate', 'artistic', 'intuitive', 'gentle', 'wise'],
    challenges: ['fearful', 'overly trusting', 'desire to escape reality', 'boundary-less'],
    loveStyle: 'dreamy and devoted',
    careerStrengths: ['creativity', 'healing', 'spirituality', 'emotional attunement'],
    fullDescription: 'Pisces is intuition and mysticism: sensitive, imaginative, compassionate, and deeply connected to unseen currents. Pisces absorbs atmosphere and often knows things before they are said. At its best, Pisces is healing, artistic, spiritually wise, and capable of profound love.\n\nRuled by Neptune, the planet of dreams and transcendence, Pisces lives at the boundary between the material and the mystical. This is the sign that hears the music others miss, that feels the emotional temperature of a room instantly, and that understands\u2014on a cellular level\u2014that everything is connected.\n\nWhen Pisces is aligned, their sensitivity becomes a superpower. They create art that moves people, offer comfort that heals, and hold space with a depth that makes others feel truly seen. The gift of Pisces is empathy: the ability to dissolve the boundary between self and other, and to remind the world that tenderness is not weakness\u2014it is the bravest thing there is.',
    shadowPattern: 'Pisces can escape, idealize, or struggle with boundaries when overwhelmed. The shadow Pisces disappears\u2014into fantasy, into substances, into relationships where they lose themselves\u2014rather than facing painful realities directly. Their compassion can become a trap when it prevents them from protecting their own energy.',
    loveDeep: 'Pisces needs tenderness, emotional attunement, and a partner who respects their sensitivity without exploiting it. They love with their entire being and need a relationship that feels spiritually nourishing. Pisces can idealize partners and needs grounding to see love clearly.',
    careerDeep: 'Pisces thrives in art, healing, spirituality, caregiving, storytelling, design, music, therapy, and any field where emotional depth, imagination, and compassion are the primary currencies.',
    moneyPattern: 'Financial patterns can fluctuate with emotional states. Pisces benefits from clear structure, automated savings, and firm boundaries around giving\u2014they may give too freely and neglect their own financial needs.',
    spiritualLesson: 'Compassion with boundaries. Dreams grounded in reality.',
    tarotArchetype: { card: 'The Moon', reason: 'Intuition, illusion, and sacred mystery\u2014the Moon reflects Pisces\u2019s journey through the unseen, where truth is felt rather than seen.' },
  },
};

export const elementThemes = {
  fire: {
    energy: 'dynamic and action-oriented',
    advice: 'Channel your passion into meaningful pursuits',
    challenge: 'Practice patience and consider others\' perspectives',
  },
  earth: {
    energy: 'grounded and practical',
    advice: 'Build steadily toward your goals',
    challenge: 'Embrace change as an opportunity for growth',
  },
  air: {
    energy: 'intellectual and communicative',
    advice: 'Share your ideas and connect with others',
    challenge: 'Balance thinking with feeling and action',
  },
  water: {
    energy: 'emotional and intuitive',
    advice: 'Trust your inner wisdom and emotional intelligence',
    challenge: 'Set healthy boundaries while remaining compassionate',
  },
};

export const planetaryInfluences = {
  sun: {
    theme: 'vitality and self-expression',
    positive: 'Your authentic self shines brightly today',
    focus: 'identity, creativity, and leadership',
  },
  moon: {
    theme: 'emotions and intuition',
    positive: 'Your emotional wisdom guides you well',
    focus: 'feelings, home, and nurturing',
  },
  mercury: {
    theme: 'communication and thinking',
    positive: 'Clear communication opens doors',
    focus: 'ideas, learning, and connections',
  },
  venus: {
    theme: 'love and beauty',
    positive: 'Harmony and beauty surround you',
    focus: 'relationships, aesthetics, and values',
  },
  mars: {
    theme: 'action and energy',
    positive: 'Your drive and determination are strong',
    focus: 'initiative, courage, and ambition',
  },
  jupiter: {
    theme: 'expansion and luck',
    positive: 'Abundance and opportunity flow toward you',
    focus: 'growth, optimism, and wisdom',
  },
  saturn: {
    theme: 'structure and discipline',
    positive: 'Your efforts build lasting foundations',
    focus: 'responsibility, achievement, and mastery',
  },
  uranus: {
    theme: 'innovation and change',
    positive: 'Unexpected breakthroughs are possible',
    focus: 'originality, freedom, and revolution',
  },
  neptune: {
    theme: 'dreams and spirituality',
    positive: 'Your imagination and intuition are heightened',
    focus: 'creativity, compassion, and transcendence',
  },
  pluto: {
    theme: 'transformation and power',
    positive: 'Deep transformation brings renewal',
    focus: 'rebirth, intensity, and hidden truths',
  },
};

export const dailyThemesByDay: Record<number, { theme: string; focus: string; energy: string }> = {
  0: { theme: 'reflection', focus: 'rest and spiritual renewal', energy: 'contemplative' },
  1: { theme: 'new beginnings', focus: 'setting intentions and fresh starts', energy: 'initiating' },
  2: { theme: 'action', focus: 'courage and determination', energy: 'dynamic' },
  3: { theme: 'communication', focus: 'ideas and connections', energy: 'expressive' },
  4: { theme: 'expansion', focus: 'growth and abundance', energy: 'optimistic' },
  5: { theme: 'love', focus: 'relationships and pleasure', energy: 'harmonious' },
  6: { theme: 'discipline', focus: 'structure and achievement', energy: 'grounded' },
};

export const generalInsights = [
  'The cosmic energies align to support your {focus} today.',
  'Trust the universe as it guides you toward {theme}.',
  'Your {strength} serves you well in today\'s energies.',
  'The stars encourage you to embrace your {element} nature.',
  'Today\'s planetary influences highlight your natural {talent}.',
  'A moment of {dayTheme} energy creates space for growth.',
  'Your ruling planet {planet} strengthens your resolve today.',
  'The {modality} energy of your sign helps you {action}.',
  'Cosmic wisdom suggests focusing on {area} today.',
  'The universe supports your journey toward {goal}.',
  'Your {element} element brings {quality} to your endeavors.',
  'Today calls for embracing your {strength} nature.',
  'The stars illuminate your path toward {destination}.',
  'Planetary alignments favor {activity} and {pursuit}.',
  'Your natural {gift} is amplified by today\'s energies.',
  'The celestial tide carries you toward {area} with {quality} energy.',
  'Something stirs beneath the surface today\u2014your {element} instincts can guide you.',
  'Today rewards those who lean into their {strength} without hesitation.',
  'The alignment between {planet} and the day\'s {dayTheme} energy opens a rare window for {pursuit}.',
  'Your {modality} nature finds its rhythm today\u2014trust the pace that feels natural.',
  '{planet} whispers of {theme}\u2014listen closely and you will find your next step.',
  'The day invites you to bring your {gift} into spaces that need it most.',
  'A subtle shift in the cosmic atmosphere makes today ideal for {activity}.',
  'Your {element} element is especially potent today\u2014use it to fuel {goal}.',
  'Today\'s energy favors depth over speed\u2014let your {talent} unfold naturally.',
];

export const loveInsights = [
  'Your {loveStyle} approach to love attracts meaningful connections.',
  'Venus energy enhances your natural charm and magnetism.',
  'Emotional authenticity deepens your romantic bonds today.',
  'Your {element} nature brings {quality} to relationships.',
  'The stars support heartfelt communication with loved ones.',
  'Romance flourishes when you embrace your {strength}.',
  'Trust your intuition in matters of the heart.',
  'Today favors {loveAction} in your romantic life.',
  'Your {sign} energy creates magnetic attraction.',
  'Love deepens through patience and understanding.',
  'Venus encourages you to express affection openly.',
  'Romantic opportunities align with your authentic self.',
  'Your natural {charm} draws positive attention today.',
  'Emotional bonds strengthen through honest expression.',
  'The cosmos supports romantic {aspiration}.',
  'A quiet moment of connection today could shift something significant in your love life.',
  'Your {element} nature craves {loveAction}\u2014honor that need today.',
  'The way you love\u2014{loveStyle}\u2014is exactly what someone in your life needs to feel right now.',
  'Today\'s energy favors honesty over harmony in love\u2014say the real thing.',
  'Your heart is asking for {aspiration}\u2014don\'t talk yourself out of what you already know.',
  'Love today is less about grand gestures and more about {loveAction} in small, real ways.',
  'The stars suggest that vulnerability is your strongest romantic move today.',
  'Your {sign} magnetism is heightened\u2014but use it for depth, not just attraction.',
  'Someone close to you needs to hear something you have been holding back.',
  'Today\'s cosmic energy supports healing an old wound in how you give and receive love.',
];

export const careerInsights = [
  'Your {careerStrength} brings professional opportunities today.',
  'The stars favor {workActivity} in your career path.',
  'Your {element} nature supports steady professional growth.',
  'Saturn energy rewards your dedication and discipline.',
  'Jupiter brings expansion to your professional endeavors.',
  'Trust your {sign} instincts in business decisions.',
  'Your natural {talent} opens doors today.',
  'Career advancement comes through {approach}.',
  'Professional recognition awaits your {quality}.',
  'The cosmos supports ambitious pursuits and goals.',
  'Mercury favors important communications at work.',
  'Your {strength} positions you for success.',
  'Today\'s energy supports {careerAction}.',
  'Professional partnerships benefit from your {skill}.',
  'The stars align for meaningful career progress.',
  'Today rewards the kind of quiet competence you carry naturally\u2014let your {talent} speak.',
  'A professional opportunity may not look obvious at first\u2014your {sign} instincts will recognize it.',
  'The day\'s {dayTheme} energy supports {careerAction}\u2014align your work with that flow.',
  'Your {element} element gives you an edge in {workActivity} today.',
  'Someone in your professional sphere is paying closer attention to your {skill} than you realize.',
  'Today favors strategy over speed at work\u2014use your {careerStrength} deliberately.',
  'An old idea may resurface with new relevance\u2014trust your {sign} memory for patterns.',
  'Professional boundaries need reinforcement today\u2014protect your energy to protect your output.',
  'The cosmos suggests that your next career move involves {careerAction}\u2014begin the groundwork now.',
  'Your {strength} is an underrated professional asset\u2014today is the day to deploy it fully.',
];

export const wellnessInsights = [
  'Honor your {element} nature with {selfCareActivity}.',
  'Your energy benefits from {wellnessAction} today.',
  'Balance your {sign} tendencies with mindful rest.',
  'The moon phase supports {healingActivity}.',
  'Physical vitality increases through {activity}.',
  'Emotional wellness comes from honoring your needs.',
  'Your {element} element thrives with {nurturing}.',
  'Today favors {healthFocus} for optimal balance.',
  'Mind-body connection strengthens through awareness.',
  'Self-care rituals align with cosmic energies today.',
  'Your body is asking for {wellnessAction}\u2014listen before it shouts.',
  'The {element} in you needs {nurturing} today\u2014it is not a luxury, it is fuel.',
  'A short practice of {selfCareActivity} could shift your entire energy for the day.',
  'Your {sign} tendency to push through needs a counterbalance today\u2014choose {healingActivity}.',
  'The cosmos reminds you: rest is productive when your body is asking for it.',
];

export const reflectionPrompts = [
  'How can you honor your {sign} nature more fully today?',
  'What would embracing your {strength} look like right now?',
  'Where might your {challenge} be holding you back?',
  'How does your {element} element guide your decisions?',
  'What message does {planet} have for you today?',
  'In what ways can you lean into {dayTheme} energy?',
  'What would your highest self choose in this moment?',
  'How can you transform {challenge} into strength?',
  'What is your intuition telling you about {area}?',
  'Where in your life is {theme} most needed?',
  'If your {element} nature could speak freely, what would it ask for today?',
  'What is one thing you are avoiding that your {sign} instincts already know the answer to?',
  'How can you use today\'s {dayTheme} energy to address something you have been putting off?',
  'What would change if you trusted your {strength} fully, without second-guessing?',
  'Where are you letting {challenge} run the show instead of your {gift}?',
];

export const shadowInsights = [
  'Your {challenge} may surface today\u2014notice it without judgment.',
  'The shadow of your {sign} nature asks: where are you avoiding truth?',
  'Today\'s tension point is {challenge}\u2014awareness alone begins to dissolve it.',
  '{planet}\'s influence stirs something unresolved\u2014sit with it rather than running.',
  'Your {element} shadow might pull you toward {challenge}\u2014choose {strength} instead.',
  'Notice where you default to {challenge} today and ask what you really need underneath.',
  'The cosmos highlights a pattern you have been circling\u2014your {sign} shadow knows what it is.',
  'Something today may trigger your {challenge}\u2014the growth is in responding differently than usual.',
  'Your shadow is not your enemy\u2014it is {challenge} asking to be understood, not suppressed.',
  'Today asks: can you hold {strength} and {challenge} at the same time without choosing sides?',
];

export const cautionInsights = [
  'Avoid making permanent decisions from a temporary emotional state.',
  'Watch for {challenge} disguising itself as confidence today.',
  'Not every battle today needs your energy\u2014choose wisely.',
  'Be careful with promises today\u2014say less and deliver more.',
  'Your {element} nature may push too hard\u2014ease off where resistance feels wrong.',
  'Today is not the day to force resolution\u2014let some things breathe.',
  'Boundaries need reinforcement today, especially around your energy and time.',
  'Be mindful of projecting your {challenge} onto others\u2014check before you react.',
  'The cosmos advises against rushing\u2014what feels urgent may not be important.',
  'Protect your peace today\u2014not everything that demands a response deserves one.',
];

export const miniRitualTemplates = [
  'Close your eyes for 60 seconds and visualize your {element} element surrounding you\u2014breathe into its energy.',
  'Write the word "{strength}" on your palm or a piece of paper. Carry it as your anchor today.',
  'Place one hand over your heart and say quietly: "I trust my {sign} instincts."',
  'Step outside for 30 seconds. Feel the air. Let your {element} nature reset.',
  'Take three slow breaths and with each exhale, release one worry about {challenge}.',
  'Light a candle or hold something warm. Invite {planet}\'s energy into your awareness for one minute.',
  'Hold still for 60 seconds and ask: "What does my {element} self need right now?" Listen for the first word that arrives.',
  'Write one sentence about what {dayTheme} means to you today. Fold the paper and keep it close.',
  'Touch something grounding\u2014wood, stone, your own skin\u2014and breathe your {strength} into your body.',
  'Whisper your daily affirmation three times. Let the vibration settle in your chest before moving on.',
];

export function getZodiacProfile(sign: ZodiacSign): ZodiacProfile {
  return localizeZodiacProfile(sign, zodiacProfiles[sign]);
}

export function getElementTheme(element: 'fire' | 'earth' | 'air' | 'water') {
  return elementThemes[element];
}

export function getDayTheme(date: Date) {
  return dailyThemesByDay[date.getDay()];
}

export function getTarotArchetype(sign: ZodiacSign): TarotArchetype {
  return localizeZodiacProfile(sign, zodiacProfiles[sign]).tarotArchetype;
}
