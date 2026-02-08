import type { Planet, AspectType } from '../types/astrology';

interface AspectInterp {
  meaning: string;
  howItFeels: string;
}

const interpretations: Record<string, AspectInterp> = {
  'Sun-Moon-conjunction': {
    meaning: 'Your conscious identity and emotional needs are fused into one powerful force. You know what you want and what you feel with unusual clarity.',
    howItFeels: 'A sense of inner unity and emotional directness, though sometimes you struggle to see yourself objectively because your ego and emotions speak in the same voice.',
  },
  'Sun-Moon-opposition': {
    meaning: 'There is a fundamental tension between who you are and what you need. Your head and heart often pull in different directions, creating a rich inner dialogue.',
    howItFeels: 'A constant balancing act between your public self and your private emotional world, like living with two equally valid but competing inner voices.',
  },
  'Sun-Moon-trine': {
    meaning: 'Your identity and emotional life flow together with ease. What you want and what you feel are naturally aligned, giving you an effortless inner harmony.',
    howItFeels: 'A quiet confidence that comes from not being at war with yourself, a natural alignment between your mind and heart that others can sense.',
  },
  'Sun-Moon-square': {
    meaning: 'Your will and your emotions are in creative friction, constantly pushing each other to grow. This inner tension is uncomfortable but incredibly productive.',
    howItFeels: 'An ongoing push-pull between what you think you should want and what you actually feel, creating a restless energy that drives personal growth.',
  },
  'Sun-Venus-conjunction': {
    meaning: 'Love, beauty, and charm are woven directly into your identity. You naturally attract others and you express yourself with warmth and grace.',
    howItFeels: 'An effortless likability and a deep need to be appreciated, as if your very sense of self is enhanced by beauty and connection.',
  },
  'Sun-Venus-trine': {
    meaning: 'There is a natural ease between your identity and your capacity for love and pleasure. You attract good things into your life without forcing them.',
    howItFeels: 'A gentle magnetism and appreciation for life pleasures that makes relationships and creative pursuits feel naturally rewarding.',
  },
  'Sun-Venus-square': {
    meaning: 'Your desire for love and approval sometimes conflicts with your authentic self-expression. You are learning that being liked and being yourself can coexist.',
    howItFeels: 'A tension between wanting to please others and needing to honor your own truth, often showing up most clearly in relationships and creative choices.',
  },
  'Sun-Mars-conjunction': {
    meaning: 'Your identity and your drive are fused into a powerful, action-oriented force. You are assertive, competitive, and you define yourself through what you do.',
    howItFeels: 'An almost physical need to act, compete, and assert yourself, as if sitting still feels like a betrayal of who you are.',
  },
  'Sun-Mars-opposition': {
    meaning: 'You project your assertive energy outward, often attracting conflict or competition from others. Learning to own your own aggression is a major life theme.',
    howItFeels: 'Encounters with strong-willed people who mirror the assertive energy you may not fully claim in yourself, creating dynamic but challenging relationships.',
  },
  'Sun-Mars-trine': {
    meaning: 'Your willpower and your drive work together effortlessly, giving you a natural athleticism and competitive edge. You act with confidence and purpose.',
    howItFeels: 'A clean, direct energy that allows you to go after what you want without second-guessing, a feeling of alignment between intention and action.',
  },
  'Sun-Mars-square': {
    meaning: 'There is friction between your identity and your aggressive instincts, creating a restless, sometimes volatile energy that demands a healthy outlet.',
    howItFeels: 'An inner irritation that needs channeling through physical activity, competition, or courageous action, otherwise it turns inward as frustration.',
  },
  'Sun-Jupiter-conjunction': {
    meaning: 'Optimism, faith, and expansion are central to who you are. You have a natural bigness of spirit that draws opportunities and good fortune toward you.',
    howItFeels: 'A buoyant confidence and a sense that life is fundamentally generous, as if the universe has a soft spot for your particular journey.',
  },
  'Sun-Jupiter-trine': {
    meaning: 'Growth and opportunity flow easily into your life. Your natural optimism and generosity create a positive feedback loop that attracts abundance.',
    howItFeels: 'A sense of being supported by life, as if doors open just when you need them and your faith in good outcomes is regularly rewarded.',
  },
  'Sun-Jupiter-square': {
    meaning: 'Your desire for growth and expansion sometimes exceeds practical limits. You dream big, sometimes too big, and learning moderation is a lifelong theme.',
    howItFeels: 'A restless urge to overextend, overcommit, or overindulge, combined with a genuine optimism that makes it hard to say no to possibilities.',
  },
  'Sun-Saturn-conjunction': {
    meaning: 'Responsibility, discipline, and maturity are fused into your core identity. You carry a seriousness that others respect, and you earn everything you have.',
    howItFeels: 'A weight of responsibility that has been with you since childhood, paired with a quiet determination that grows stronger with age.',
  },
  'Sun-Saturn-opposition': {
    meaning: 'Authority figures and external structures challenge your sense of self. You are learning to build your own authority rather than deferring to or rebelling against others.',
    howItFeels: 'A feeling of being tested by life, as if you must constantly prove your worth against external standards and expectations.',
  },
  'Sun-Saturn-trine': {
    meaning: 'Discipline and ambition support your identity naturally. You have a mature, grounded quality that inspires trust and you build things that last.',
    howItFeels: 'A steady confidence rooted in competence and hard work, a feeling that time is your ally and your efforts will pay off.',
  },
  'Sun-Saturn-square': {
    meaning: 'There is deep friction between your desire to shine and an inner voice that says you are not good enough. Overcoming self-doubt is your heroic journey.',
    howItFeels: 'A persistent inner critic that demands you earn every ounce of self-worth, creating a driven, sometimes anxious relationship with success.',
  },
  'Moon-Venus-conjunction': {
    meaning: 'Your emotional needs and your desire for love and beauty are one and the same. You crave tenderness, harmony, and aesthetic pleasure at the deepest level.',
    howItFeels: 'A soft, loving emotional nature that seeks beauty and connection as essential nourishment, making you both deeply romantic and easily wounded.',
  },
  'Moon-Venus-trine': {
    meaning: 'Love and emotional comfort flow together naturally. Your relationships are nourished by genuine warmth, and you create beauty in your home and emotional life effortlessly.',
    howItFeels: 'An easy warmth in your emotional world that makes others feel comfortable and loved in your presence, a natural gift for emotional grace.',
  },
  'Moon-Venus-square': {
    meaning: 'Your emotional needs and your desires in love sometimes pull in different directions. What comforts you and what attracts you may not always be the same thing.',
    howItFeels: 'A tension between emotional security and romantic desire, as if what feels safe and what feels exciting are located in different places.',
  },
  'Moon-Mars-conjunction': {
    meaning: 'Your emotions are fiery, immediate, and action-oriented. You feel things with a physical intensity that demands expression, and your emotional reactions are swift and powerful.',
    howItFeels: 'A volatile emotional energy that moves quickly from feeling to acting, giving you passionate intensity but also a hair-trigger emotional response.',
  },
  'Moon-Mars-square': {
    meaning: 'There is friction between your need for safety and your instinct for action. Your emotions can feel like an internal battleground between vulnerability and aggression.',
    howItFeels: 'Emotional restlessness and irritability that erupts when you feel your security is threatened, a need to channel strong feelings into physical outlets.',
  },
  'Moon-Saturn-conjunction': {
    meaning: 'Your emotional world is structured by responsibility and restraint. You learned early to contain your feelings, and emotional maturity comes naturally but at a cost.',
    howItFeels: 'A seriousness in your emotional life, as if you were born old and must learn to give yourself permission to feel freely and be vulnerable.',
  },
  'Moon-Saturn-opposition': {
    meaning: 'External duties and expectations press against your emotional needs, creating a tension between what you feel and what you believe is responsible.',
    howItFeels: 'A pull between your private emotional world and public obligations, as if allowing yourself to feel openly is somehow irresponsible.',
  },
  'Moon-Saturn-square': {
    meaning: 'Your emotional expression is blocked or delayed by fear, duty, or early conditioning. Learning to let yourself feel without judgment is transformative work.',
    howItFeels: 'A deep emotional caution, as if a part of you is always bracing for disappointment, making vulnerability feel dangerous rather than connecting.',
  },
  'Venus-Mars-conjunction': {
    meaning: 'Your desire nature is powerful and unified. What you love and what you pursue are fused together, giving you a magnetic, passionate presence in relationships.',
    howItFeels: 'An intense, charismatic energy that draws others in, combining receptive charm with active pursuit in a way that is both attractive and commanding.',
  },
  'Venus-Mars-opposition': {
    meaning: 'There is a dynamic tension between your feminine and masculine energies, between receiving and pursuing. Relationships are the arena where this polarity plays out most dramatically.',
    howItFeels: 'A push-pull in relationships between wanting to be chased and wanting to chase, creating passionate dynamics that can be thrilling or exhausting.',
  },
  'Venus-Mars-square': {
    meaning: 'Your desires and your values are in friction, creating a charged, sometimes frustrated relationship with love and intimacy. The tension is uncomfortable but creatively potent.',
    howItFeels: 'A restless dissatisfaction in love, as if what you want physically and what you want emotionally do not always align, driving you toward growth in relationships.',
  },
  'Venus-Saturn-conjunction': {
    meaning: 'Love is serious business for you. You approach relationships with maturity and commitment, and you are willing to do the work that real love requires.',
    howItFeels: 'A cautious approach to love that deepens with time, as if you need to build trust brick by brick before you can truly let someone in.',
  },
  'Venus-Saturn-square': {
    meaning: 'Fear of rejection or unworthiness creates obstacles in your love life. You are learning that you deserve love not because you have earned it but simply because you exist.',
    howItFeels: 'A feeling of not being enough in relationships, a tendency to withhold affection or choose partners who confirm your fear of not being lovable.',
  },
  'Mars-Saturn-conjunction': {
    meaning: 'Your drive is disciplined, controlled, and capable of extraordinary endurance. You channel your aggression into structured achievement, and your willpower is formidable.',
    howItFeels: 'A controlled intensity, as if your energy runs through a narrow, powerful channel that produces focused results but can feel restrictive.',
  },
  'Mars-Saturn-square': {
    meaning: 'There is a deep frustration between your desire to act and forces that restrain you. Learning to work within limitations without losing your fire is your challenge.',
    howItFeels: 'A stop-start quality to your energy, as if you are driving with one foot on the gas and one on the brake, creating tension that demands a release valve.',
  },
  'Jupiter-Saturn-conjunction': {
    meaning: 'The forces of expansion and contraction are merged in your psyche, creating a unique capacity to dream big and build practically at the same time.',
    howItFeels: 'An oscillation between optimism and caution that ultimately produces balanced, sustainable growth when you learn to trust both voices.',
  },
  'Jupiter-Saturn-opposition': {
    meaning: 'Faith and doubt are in constant dialogue within you. You are pulled between the desire to expand and the need for structure, between risk and responsibility.',
    howItFeels: 'A seesaw between feeling like anything is possible and fearing that nothing will work out, teaching you to find wisdom in the middle ground.',
  },
  'Sun-Uranus-conjunction': {
    meaning: 'Your identity is inseparable from your need to be different. Conformity feels like death to you, and you express your individuality with electric intensity.',
    howItFeels: 'A restless, exciting energy that makes you feel most alive when you are breaking new ground or challenging expectations.',
  },
  'Sun-Uranus-square': {
    meaning: 'There is tension between your need for stability and your urge for radical freedom. Sudden disruptions to your identity force evolution and awakening.',
    howItFeels: 'An unpredictable quality to your life, as if just when things settle, something within you rebels and demands a shakeup.',
  },
  'Sun-Neptune-conjunction': {
    meaning: 'Your identity is deeply intertwined with imagination, spirituality, and the desire to transcend ordinary life. You are sensitive to beauty and suffering in equal measure.',
    howItFeels: 'A dreamy, permeable sense of self that can feel magical or confusing depending on the day, as if the boundaries between you and the world are thin.',
  },
  'Sun-Neptune-square': {
    meaning: 'There is friction between who you are and who you wish you could be. Idealism and reality clash, and you are learning to be inspired without being deluded.',
    howItFeels: 'A persistent fog around your identity, as if you are not quite sure who you really are versus who you have been imagining yourself to be.',
  },
  'Sun-Pluto-conjunction': {
    meaning: 'Power, intensity, and transformation are at the core of who you are. You live life at full depth, and you have an almost compulsive need to uncover hidden truths.',
    howItFeels: 'A profound intensity that colors everything you do, a sense that you are always in the process of destroying and rebuilding yourself.',
  },
  'Sun-Pluto-square': {
    meaning: 'Power struggles and control issues are woven into your identity. You are learning that real power comes from transformation, not domination.',
    howItFeels: 'An intense inner pressure, as if something deep within you is constantly pushing for control while life demands that you surrender it.',
  },
  'Moon-Pluto-conjunction': {
    meaning: 'Your emotional world is volcanic, operating at depths that most people never reach. You experience feelings as transformative forces that change you from the inside out.',
    howItFeels: 'An emotional intensity that can feel overwhelming, as if every feeling carries the weight of life and death and demands total honesty.',
  },
  'Moon-Pluto-square': {
    meaning: 'Deep emotional power struggles, often rooted in family dynamics, shape your inner world. You are learning to feel powerful without needing to control your emotional environment.',
    howItFeels: 'A turbulent emotional undercurrent that surfaces in moments of intimacy, bringing up primal feelings of trust, betrayal, and the need for emotional truth.',
  },
  'Moon-Neptune-conjunction': {
    meaning: 'Your emotional world is boundless, dreamy, and deeply empathetic. You absorb the feelings of others like water, and your intuition borders on psychic.',
    howItFeels: 'A soft, permeable emotional state that makes you incredibly compassionate but also vulnerable to emotional confusion and overwhelm.',
  },
  'Moon-Neptune-square': {
    meaning: 'Your emotional needs and your ideals are in tension, creating confusion about what you actually feel versus what you wish you felt.',
    howItFeels: 'A foggy emotional landscape where it is hard to tell your feelings from others or reality from wishful thinking, requiring deliberate grounding.',
  },
};

const aspectTypeDescriptions: Record<string, string> = {
  conjunction: 'merges and intensifies',
  opposition: 'creates tension and awareness between',
  trine: 'harmonizes and eases the flow between',
  square: 'creates friction and growth between',
  sextile: 'gently supports and connects',
};

export function getAspectInterp(p1: Planet, p2: Planet, type: AspectType): AspectInterp | null {
  return interpretations[`${p1}-${p2}-${type}`] || interpretations[`${p2}-${p1}-${type}`] || null;
}

export function getGenericAspectInterp(p1: Planet, p2: Planet, type: AspectType): AspectInterp {
  const specific = interpretations[`${p1}-${p2}-${type}`] || interpretations[`${p2}-${p1}-${type}`];
  if (specific) return specific;

  const typeDesc = aspectTypeDescriptions[type] || 'connects';

  return {
    meaning: `This aspect ${typeDesc} the energy of ${p1} and ${p2} in your chart. These two planetary forces are in active dialogue, shaping how you experience both energies in daily life.`,
    howItFeels: `You may notice the themes of ${p1} and ${p2} interacting in ways that feel ${type === 'trine' || type === 'sextile' ? 'supportive and natural' : 'challenging but growth-oriented'}, asking you to integrate both energies consciously.`,
  };
}
