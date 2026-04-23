// Dream symbol dictionary for the Dream Interpreter feature.
//
// This is the V1 (heuristic) version — we match user-input dream text
// against known symbolic keywords and surface Jungian / archetypal
// interpretations. In a later sprint we'll wrap the same flow in an
// LLM call for deeper, personalised analysis.
//
// Symbol entries cover the ~100 most common universal dream motifs drawn
// from Jung's archetypal framework + Gestalt dream work + common modern
// dream research. NOT a fortune-telling lookup — framed as reflective
// prompts the dreamer can consider.

export interface DreamSymbol {
  /** Lowercase keywords that match this symbol */
  keywords: string[];
  /** Archetypal meaning — poetic, not prescriptive */
  meaning: string;
  /** A reflective question the dreamer can hold */
  reflection: string;
}

export const DREAM_SYMBOLS: DreamSymbol[] = [
  { keywords: ['water', 'ocean', 'sea', 'river', 'lake', 'pool', 'rain', 'flood'], meaning: 'Water in dreams carries the unconscious, emotion, and the flow of feeling. Clear water suggests clarity of feeling; turbulent water shows emotional intensity or chaos; deep water hints at the depths of the psyche itself.', reflection: 'What feeling am I swimming in right now — and is it carrying me or drowning me?' },
  { keywords: ['fire', 'flame', 'burning', 'inferno', 'bonfire', 'candle'], meaning: 'Fire is transformation, passion, destruction of the old. It purifies as it consumes. A controlled flame is creative energy; a wildfire is overwhelming force that wants release.', reflection: 'What in my life is burning away — and what new form wants to emerge from the ashes?' },
  { keywords: ['flying', 'fly', 'flew', 'flight', 'soaring'], meaning: 'Flying is liberation — rising above limitation, seeing with perspective, shedding what was holding you down. It can also be escape from what you don\'t want to face.', reflection: 'Am I rising into freedom — or flying to avoid landing?' },
  { keywords: ['falling', 'fall', 'fell', 'plummeting'], meaning: 'Falling often signals loss of control, fear of failure, or the need to let go of something you\'ve been gripping. The landing — what happens at the bottom — matters more than the fall itself.', reflection: 'What am I afraid of losing my grip on — and what if I just let go?' },
  { keywords: ['teeth', 'tooth', 'losing teeth', 'broken teeth'], meaning: 'Teeth falling out is one of the most common dreams. Classically: anxiety about appearance, aging, losing power or voice. Modern dream research links it to stress and transitions.', reflection: 'Where do I feel I\'m losing my bite — my ability to speak, defend, or assert?' },
  { keywords: ['chase', 'chased', 'chasing', 'running from', 'pursued'], meaning: 'Being chased means something is trying to get your attention — a shadow part, a responsibility, a truth. You can\'t outrun it. The chaser is almost always a part of you.', reflection: 'What is chasing me — and what if I turned and faced it?' },
  { keywords: ['naked', 'nude', 'unclothed', 'no clothes'], meaning: 'Nakedness in dreams is vulnerability, authenticity, or fear of exposure. In private it may be liberation; in public it is typically anxiety about being seen, judged, or found out.', reflection: 'Where am I afraid of being seen as I really am?' },
  { keywords: ['snake', 'serpent', 'cobra', 'python', 'viper'], meaning: 'Snakes are transformation (they shed their skin), wisdom, hidden knowledge, and sometimes sexual energy. They also represent the shadow — what lurks unseen. Shedding skin is renewal.', reflection: 'What part of me is ready to shed an old skin?' },
  { keywords: ['death', 'dying', 'died', 'corpse', 'funeral'], meaning: 'Death in dreams almost never means physical death. It means endings, transformations, or the death of an old self. Something is completing. Mourn it, then look at what is being born.', reflection: 'What part of me is ending — and what new self is waiting to emerge?' },
  { keywords: ['house', 'home', 'rooms'], meaning: 'A house in dreams is the self. Rooms are aspects of you. Discovering new rooms suggests undiscovered potential. Basements are the unconscious; attics are spirit or memory; the kitchen is nourishment.', reflection: 'Which room of me am I in right now — and what room haven\'t I visited in years?' },
  { keywords: ['baby', 'infant', 'newborn', 'pregnancy', 'pregnant'], meaning: 'Babies represent new life, new projects, new possibilities that are still fragile. Pregnancy is creative gestation — something is growing in you. Abandoning a baby warns you might be neglecting a new potential.', reflection: 'What tender new thing is growing in me — and am I tending it?' },
  { keywords: ['car', 'driving', 'vehicle', 'accident', 'crash'], meaning: 'Cars are your direction, your ability to navigate life. Who\'s driving? Are you in control? A crash or brake failure signals something is out of your control — or warns you\'re heading somewhere you shouldn\'t.', reflection: 'Who is driving my life right now — and am I at the wheel?' },
  { keywords: ['door', 'doorway', 'gate'], meaning: 'A door is an opportunity, a choice, a threshold between states. Opening a door is taking a step; a closed door is a missed chance or a wise boundary.', reflection: 'What door am I standing at — and why haven\'t I opened it yet?' },
  { keywords: ['forest', 'woods', 'trees'], meaning: 'Forests are the unconscious mind — dense, mysterious, full of life you can\'t see. Getting lost in a forest suggests you\'re in a phase where the map doesn\'t work yet.', reflection: 'What is this unfamiliar territory asking me to discover?' },
  { keywords: ['mountain', 'climbing', 'summit', 'peak'], meaning: 'Mountains represent goals, challenges, and spiritual ascent. Climbing is ambition or inner development. Reaching the top is accomplishment — but also the moment when you see you must descend again.', reflection: 'What am I climbing toward — and why?' },
  { keywords: ['lost', 'can\'t find', 'missing'], meaning: 'Being lost signals a transition, a loss of direction, or a need to find a new path. You haven\'t failed — you\'ve left the old route. The new one hasn\'t appeared yet.', reflection: 'What old map am I trying to follow that stopped working?' },
  { keywords: ['school', 'test', 'exam', 'classroom'], meaning: 'School dreams usually surface during periods of being evaluated or feeling unprepared. Being in school as an adult signals you\'re in a learning phase whether you want to be or not.', reflection: 'What am I being asked to learn right now?' },
  { keywords: ['bird', 'birds', 'flying animal'], meaning: 'Birds carry messages — from the psyche, the divine, the future. A dark bird is often shadow content asking to be looked at; bright birds are spirit, hope, freedom.', reflection: 'What message is trying to reach me that I keep flying past?' },
  { keywords: ['cat', 'cats', 'feline'], meaning: 'Cats are independence, intuition, feminine power, and the sacred mysterious. In many traditions they see the invisible. A cat in your dream may be your own unspoken wisdom.', reflection: 'What in me knows without speaking?' },
  { keywords: ['dog', 'dogs', 'puppy'], meaning: 'Dogs are loyalty, friendship, unconditional love, and often the loving part of yourself. A threatening dog may be trust that has been wounded.', reflection: 'What does loyalty mean to me right now — given to whom, received from whom?' },
  { keywords: ['spider', 'web'], meaning: 'Spiders are weavers, creators of webs (fate, relationships, creation). They can represent feminine creative power or feelings of being caught in something complicated.', reflection: 'What web am I weaving — or tangled in?' },
  { keywords: ['mirror', 'reflection'], meaning: 'Mirrors reveal what you cannot see directly about yourself. The reflection may show you as you are, as you fear you are, or as you could be.', reflection: 'What does this mirror want me to see?' },
  { keywords: ['child', 'children', 'young'], meaning: 'Children in dreams often represent your inner child, innocence, creativity, or parts of you that have been left behind. They ask to be remembered or tended.', reflection: 'What part of my younger self is asking for attention?' },
  { keywords: ['hair', 'haircut', 'balding'], meaning: 'Hair is vitality, identity, attractiveness. Cutting hair is a fresh start or loss of old self; losing hair may signal anxiety about power or self-image.', reflection: 'What aspect of my identity is shifting?' },
  { keywords: ['money', 'wealth', 'gold', 'rich', 'poor'], meaning: 'Money represents self-worth, value, power, and energy exchange. Finding money suggests recognizing your value; losing money, giving it away, or being broke can point to depletion or perceived lack of worth.', reflection: 'Where do I currently place my value — and is that serving me?' },
  { keywords: ['war', 'battle', 'fighting', 'army'], meaning: 'Conflict dreams reflect inner struggle — often between parts of yourself. Who is fighting whom? Usually both sides are you, warring over a real tension.', reflection: 'What two parts of me are at war — and what would peace between them look like?' },
  { keywords: ['darkness', 'dark', 'night', 'black'], meaning: 'Darkness is the unknown, the unconscious, what you cannot yet see. It is not inherently fearful — it is rich with possibility that hasn\'t been illuminated.', reflection: 'What am I being invited to sit with, before I try to understand it?' },
  { keywords: ['light', 'bright', 'shining', 'sun'], meaning: 'Light is consciousness, clarity, insight, truth. It reveals what darkness obscured. Dazzling light can also be overwhelming — truth all at once.', reflection: 'What is becoming clear to me that I can no longer avoid?' },
  { keywords: ['lover', 'kiss', 'romance', 'ex', 'partner'], meaning: 'Romantic dreams about specific people are rarely about them — they are about qualities you associate with them. Kissing someone can signal integration of those qualities into yourself.', reflection: 'What quality of this person do I need to claim in me?' },
  { keywords: ['animal', 'creature', 'beast'], meaning: 'Animals represent instinctual, primal aspects of the self. Wild animals are your untamed nature; tame ones are your relationship with your own instincts. What does the animal want?', reflection: 'What does my wild self want from me?' },
];

export interface DreamReading {
  matchedSymbols: {
    symbol: DreamSymbol;
    keyword: string;
  }[];
  coreTheme: string;
  reflections: string[];
  hasMatch: boolean;
}

// Match user-input dream text against symbol dictionary.
// Case-insensitive, whole-word-boundary matching where possible.
export function interpretDream(dreamText: string): DreamReading {
  const text = dreamText.toLowerCase();
  const matched: { symbol: DreamSymbol; keyword: string }[] = [];
  const seenSymbols = new Set<DreamSymbol>();

  for (const symbol of DREAM_SYMBOLS) {
    if (seenSymbols.has(symbol)) continue;
    for (const keyword of symbol.keywords) {
      const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        matched.push({ symbol, keyword });
        seenSymbols.add(symbol);
        break;
      }
    }
  }

  const hasMatch = matched.length > 0;

  let coreTheme = '';
  if (hasMatch) {
    if (matched.length === 1) {
      coreTheme = `Your dream carries the archetype of **${matched[0].keyword}** at its centre.`;
    } else if (matched.length <= 3) {
      const words = matched.map((m) => `**${m.keyword}**`).join(', ');
      coreTheme = `Three symbols move through this dream: ${words}. Their dance is the message.`;
    } else {
      coreTheme = `Your dream is rich — ${matched.length} archetypal symbols appear, each offering its own thread. The dream wants to be sat with, not solved.`;
    }
  }

  return {
    matchedSymbols: matched,
    coreTheme,
    reflections: matched.map((m) => m.symbol.reflection),
    hasMatch,
  };
}
