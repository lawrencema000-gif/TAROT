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
  // ─── Second batch (2026-04-25): expanded from 30 → 80 symbols for
  // wider offline fallback coverage. Each entry same format. ────────
  { keywords: ['bridge'], meaning: 'A bridge is a passage between states — from one self to another, one chapter to the next. Crossing it is committing to the change. A collapsing bridge warns against moving before the foundation holds.', reflection: 'What crossing am I in the middle of — and is it ready to bear my weight?' },
  { keywords: ['stairs', 'staircase', 'climbing stairs'], meaning: 'Ascending stairs is development, insight, rising into higher awareness. Descending is returning to the unconscious, to the body, to something older. Endless or missing stairs suggest a transition without a map.', reflection: 'Am I climbing toward clarity or descending into what I\'ve been avoiding?' },
  { keywords: ['basement', 'cellar', 'underground'], meaning: 'The basement is the unconscious — what has been stored, buried, or forgotten. Finding rooms in the basement is meeting neglected parts of yourself. Flooded basements signal overwhelm from what was kept below.', reflection: 'What have I tucked away down there that is now asking to be seen?' },
  { keywords: ['attic', 'roof', 'upper room'], meaning: 'The attic is memory, spirit, ancestral inheritance, the higher self. What you find in the attic is what your lineage or your soul has been holding for you.', reflection: 'What stored-away thing is asking to come down into daily life?' },
  { keywords: ['elevator', 'lift'], meaning: 'Elevators are rapid shifts in consciousness or status — rising or falling without the step-by-step climb. Stuck elevators signal a transition that has stalled; runaway ones signal a change you aren\'t controlling.', reflection: 'What change is moving me faster than I\'m ready for — or slower than I can bear?' },
  { keywords: ['plane', 'airplane', 'airport', 'flight delayed'], meaning: 'Planes are ambitious journeys, leaving one reality for another. Missing a flight is often the dreaming mind commenting on a missed opportunity you already sense.', reflection: 'What flight have I been delaying — and what\'s the cost of not boarding?' },
  { keywords: ['train', 'railway', 'track'], meaning: 'Trains are collective life direction — the track is set, but you can get on, off, or stay. Missing a train is a fear of being left behind by a current you\'re part of.', reflection: 'What current am I watching move without me — and do I actually want to catch it?' },
  { keywords: ['boat', 'ship', 'sailing'], meaning: 'Boats carry you across emotional seas. How well you navigate reflects your current relationship to feeling. A sinking boat warns of being overwhelmed; a sturdy boat in rough water is resilience.', reflection: 'What emotional sea am I crossing — and am I seaworthy for it?' },
  { keywords: ['storm', 'thunder', 'lightning', 'hurricane'], meaning: 'Storms are emotional upheaval — often something that has been building up and now needs release. Lightning strikes are sudden insight or shock; thunder is the delayed resonance of what you\'ve already seen.', reflection: 'What has been building that is ready to break open?' },
  { keywords: ['snow', 'ice', 'frozen'], meaning: 'Snow and ice speak of emotional stillness — sometimes beautiful rest, sometimes frozen feeling. Melting ice is feeling beginning to flow again; being trapped in ice is a part of you suspended.', reflection: 'What feeling have I frozen to survive — and is it time to let it thaw?' },
  { keywords: ['wind', 'breeze', 'gale'], meaning: 'Wind is invisible movement — spirit, change, the push of life. Gentle wind guides; gale-force wind uproots. The direction it pushes you is the direction something wants you to go.', reflection: 'Where is life pushing me that I keep bracing against?' },
  { keywords: ['wave', 'tsunami', 'tidal'], meaning: 'A large wave is an emotion you cannot yet contain — grief, desire, rage, awe. Tsunamis in dreams are almost never literal; they signal that something emotional is cresting whether you\'re ready or not.', reflection: 'What is cresting in me that I\'ve been trying to stand in front of?' },
  { keywords: ['desert', 'sand', 'dune'], meaning: 'Deserts are periods of spiritual dryness, stripping away, or the soul\'s testing. Crossing a desert is a real phase, not a failure. Oases in the desert are the small sustaining joys.', reflection: 'Where am I in my crossing — and what oasis am I refusing to stop at?' },
  { keywords: ['island'], meaning: 'Islands in dreams are solitude — chosen or enforced. Being alone on an island can be sacred individuation or painful exile depending on your dream-feeling about it.', reflection: 'Is this solitude nourishing me or slowly stranding me?' },
  { keywords: ['cave'], meaning: 'Caves are deep interiors — of self, of psyche, of the Mother. Entering a cave is agreeing to go inward. What you find there is often exactly what you have been avoiding in daylight.', reflection: 'What is in the cave of me that I keep almost entering?' },
  { keywords: ['labyrinth', 'maze'], meaning: 'Labyrinths represent a path that is intentionally not direct — you are meant to wander. You cannot solve a labyrinth; you can only walk it until the centre meets you.', reflection: 'What part of my life is not meant to be figured out, just walked?' },
  { keywords: ['war', 'enemy', 'opponent'], meaning: 'The enemy in a dream is usually a disowned part of yourself. The moment you understand why they fight you — what they want — is the moment integration begins.', reflection: 'What does my enemy in this dream want — and what of me have I refused to give them?' },
  { keywords: ['weapon', 'sword', 'knife', 'gun'], meaning: 'Weapons speak of how you wield power — for protection, for harm, for assertion. Holding a weapon you cannot fire often signals unspoken anger or unexpressed boundary.', reflection: 'Where is the weapon I\'m afraid to lift — and what would using it actually look like?' },
  { keywords: ['wound', 'bleeding', 'injured', 'injury'], meaning: 'Dream wounds show you where you\'re hurting in a place you haven\'t named. The location of the wound matters: head (identity/thinking), heart (love/grief), hands (doing), legs (direction).', reflection: 'Where am I wounded that I keep walking on?' },
  { keywords: ['doctor', 'hospital', 'surgery'], meaning: 'Medical settings surface when something in you needs attention, repair, or release. Surgery dreams often accompany real psychic work — something is being excised.', reflection: 'What in me is being operated on right now, in waking or dreaming?' },
  { keywords: ['teacher', 'guide', 'mentor'], meaning: 'A teacher in a dream is almost always your inner wisdom taking a face. What they say to you is something you already know at the deepest level, wrapped in a voice you can hear.', reflection: 'What did the teacher in me say — and why did I need to hear it from outside first?' },
  { keywords: ['stranger', 'unknown person'], meaning: 'Strangers often represent the Shadow — parts of you unrecognized or unintegrated. Notice whether the stranger felt threatening, helpful, or neutral; that response is about you, not them.', reflection: 'Who is this stranger actually, within me?' },
  { keywords: ['crowd', 'many people', 'audience'], meaning: 'Crowds in dreams represent the collective pressure, the many voices, or the many parts of yourself jostling for attention. Being watched by a crowd is fear of judgment or a call to be seen.', reflection: 'Whose voice in the crowd is loudest — and is it mine?' },
  { keywords: ['parent', 'mother', 'father'], meaning: 'Dream parents are rarely literal. They are the archetypes of structure (Father) and holding (Mother) as they live in you. The dream is often showing you your relationship with these forces, not with your actual parents.', reflection: 'What does the Father in me, or the Mother in me, want to say to me?' },
  { keywords: ['sibling', 'brother', 'sister'], meaning: 'Siblings in dreams often stand in for peer parts of you — the self who grew up alongside the you that got all the attention. They ask to be known too.', reflection: 'What part of me has been the overlooked sibling?' },
  { keywords: ['wedding', 'marriage', 'altar'], meaning: 'Weddings are unions — of parts of yourself coming together, or commitment to a path, or the hieros gamos (sacred marriage) of inner masculine and feminine.', reflection: 'What two parts of me are being married — and what is being vowed?' },
  { keywords: ['pregnant', 'giving birth', 'labour'], meaning: 'Pregnancy dreams signal gestation — something is growing in you that isn\'t ready to be seen yet. Giving birth is the moment of bringing it into the world. The pain is real and it is survivable.', reflection: 'What am I gestating — and am I protecting it from premature exposure?' },
  { keywords: ['breast', 'milk', 'feeding'], meaning: 'Nursing, milk, and breasts speak to nourishment — what sustains you, what you\'re asked to nourish, and who you look to for care. Empty breast or dry milk can signal depletion.', reflection: 'Who or what am I currently feeding — and is someone feeding me back?' },
  { keywords: ['insect', 'bug', 'ants', 'flies', 'cockroach'], meaning: 'Insects often represent small nagging concerns that feel beneath your attention but won\'t leave you alone. Swarms are overwhelm from the cumulative weight of small things.', reflection: 'What small thing have I been dismissing that the dream is saying matters?' },
  { keywords: ['bee', 'beehive', 'honey'], meaning: 'Bees speak of community, productive work, and the collective making of sweetness. A beehive dream is often about your relationship to belonging + labour. Honey is the reward of patient craft.', reflection: 'Where in my life am I part of a hive — and where am I flying solo when the hive would hold me?' },
  { keywords: ['wolf', 'pack'], meaning: 'Wolves are wild kin — your instinctual pack-self. They represent loyalty, the untamed feminine (La Loba), and the part of you that hunts for what it needs without apology.', reflection: 'What does my wolf-self want to reclaim?' },
  { keywords: ['lion', 'tiger', 'jaguar'], meaning: 'Large cats are majestic, dangerous, sovereign power. They represent pride, sexuality, and the part of you that will not be caged. Encountering one is an invitation to reclaim a sovereignty you\'ve softened.', reflection: 'What sovereign part of me has been waiting for me to let it roar?' },
  { keywords: ['horse', 'mustang', 'stallion'], meaning: 'Horses symbolize the body, life-force, and instinctual drive. A wild horse is untamed vitality; a tame or ridden horse is energy you\'ve learned to direct. A dying horse is a serious message about depletion.', reflection: 'How is my horse — the living-animal of me — right now?' },
  { keywords: ['fish'], meaning: 'Fish are unconscious contents rising close enough to the surface to be caught. A fish leaping from water is an insight arriving; many fish are abundance of feeling; a dead fish is a truth rotting because it wasn\'t claimed.', reflection: 'What insight is swimming up from me right now?' },
  { keywords: ['owl'], meaning: 'Owls are wisdom that sees in the dark, but also death-messengers in many traditions. They signal transitions that require you to see what others cannot.', reflection: 'What is the owl of me seeing that daylight me isn\'t ready to acknowledge?' },
  { keywords: ['raven', 'crow'], meaning: 'Ravens and crows carry between worlds. They are shadow-messengers, tricksters, and sometimes omens of necessary endings. Their arrival often precedes a real transformation.', reflection: 'What ending is being announced that I keep flinching from?' },
  { keywords: ['butterfly', 'cocoon', 'chrysalis'], meaning: 'Butterflies are transformation completed; cocoons are the phase of dissolution that precedes it. If you dream of being in a cocoon, the dream is naming that you\'re in a dissolution phase — which is not failure.', reflection: 'Am I in a dissolution phase — and can I trust the wings without seeing them yet?' },
  { keywords: ['egg'], meaning: 'Eggs are potential, unborn self, creative projects still secret. A cracked egg is disclosure or loss; many eggs are multiple possibilities competing for life.', reflection: 'Which egg of me is ready, and which is still forming?' },
  { keywords: ['seed', 'sprout', 'planting'], meaning: 'Seeds are intentional new life — what you plant is what you\'re willing to tend. Dream seeds often reflect something you\'ve recently started or committed to.', reflection: 'What seed did I just plant — and am I watering it?' },
  { keywords: ['tree'], meaning: 'Trees are the whole self — rooted below, branching above, enduring across seasons. The species matters: oak is solidity, willow is flexibility, dead tree is a part of you that has completed.', reflection: 'What tree is me — and what season is it in?' },
  { keywords: ['flower', 'blossom', 'rose'], meaning: 'Flowers are moments of beauty, opening, or soul-expression. They mark what is blooming now — often something you\'ve been tending in secret. A wilting flower is grief or the end of a phase.', reflection: 'What in me is blooming right now that I haven\'t let myself celebrate?' },
  { keywords: ['garden'], meaning: 'A garden is cultivated soul-life — what you\'ve deliberately grown. A wild garden is abundance; a neglected one is a self you\'ve stopped tending. The state of the garden reflects your current relationship to your inner life.', reflection: 'How is my garden — and what row have I been ignoring?' },
  { keywords: ['well', 'spring'], meaning: 'Wells are access to the deep self — emotional depth, ancestral wisdom, the source. A full well is availability of feeling; a dry well is depletion or blockage to your own depth.', reflection: 'Is my well deep right now, and am I letting myself drink from it?' },
  { keywords: ['ruin', 'crumbling', 'abandoned building'], meaning: 'Ruins show you what has ended in you without fanfare — old identities, old relationships, old roles. Walking through ruins is mourning done at your own pace.', reflection: 'What old structure of me has quietly ended that I haven\'t grieved?' },
  { keywords: ['tunnel'], meaning: 'Tunnels are passages through dark phases — the only way out is through. The light at the end is a real promise of the dream, not a trick. Being stuck in a tunnel is the sensation of a transition that feels longer than it is.', reflection: 'How far into the tunnel am I — and what light do I actually believe in?' },
  { keywords: ['map', 'atlas'], meaning: 'Maps in dreams are your mental model of your life. An outdated map is one of the most common dreams during transition — you\'re trying to navigate a new territory with an old chart.', reflection: 'What map of my life needs to be redrawn from where I actually am now?' },
  { keywords: ['key'], meaning: 'Keys are unlock — access, permission, or a piece of understanding you\'ve been missing. Losing a key often reflects a feeling of being locked out of your own life.', reflection: 'What key have I been looking for — and what does it open?' },
  { keywords: ['book', 'library'], meaning: 'Books are wisdom, records, stories carried across time. The library is collective memory. An unread book is knowledge that is available to you but you haven\'t opened yet.', reflection: 'What book in me have I been walking past?' },
  { keywords: ['letter', 'message', 'email'], meaning: 'Written messages in dreams are usually from the unconscious to the conscious self. You are sending yourself a message. What it says, how it arrives, and whether you open it all matter.', reflection: 'What is the message my own depth is sending me right now?' },
  { keywords: ['phone', 'call', 'ringing'], meaning: 'Phone calls are communication from psyche or from someone real who is emotionally present in your field. A phone you can\'t answer or a call you can\'t hear is often a message you aren\'t ready to receive.', reflection: 'Whose call am I afraid to pick up?' },
  { keywords: ['train station', 'waiting room'], meaning: 'Waiting in dreams often means you are in a liminal phase — between two states of life, not yet arrived, not quite departed. The waiting is itself the work.', reflection: 'What am I waiting for — and what would it mean to let the waiting be enough?' },
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
