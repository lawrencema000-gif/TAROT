// Secondary dream-symbol systems — colors, numbers, directions,
// cultural overlays, lucid dream techniques, and nightmare-specific
// readings. Sit alongside the main 150+ symbol dictionary in
// `dreamSymbols.ts`.
//
// Detection: each export has a function that scans a dream text and
// surfaces the matched entries, so the DreamInterpreterPage can
// render them as side-cards next to the primary AI / dictionary
// reading.

// ─── Color symbolism ─────────────────────────────────────────────

export interface DreamColor {
  color: string;
  keywords: string[];
  meaning: string;
  shadow: string;
}

export const DREAM_COLORS: DreamColor[] = [
  {
    color: 'Red',
    keywords: ['red', 'crimson', 'scarlet', 'blood-red', 'rose red'],
    meaning: 'Vital force, passion, desire, courage, anger that burns rather than smoulders. Red in dreams arrives at moments of high emotional voltage — both the fire of love and the heat of fury.',
    shadow: 'When red feels overwhelming or oppressive, it signals unprocessed rage, exhausted vitality, or a sexuality that has nowhere safe to go.',
  },
  {
    color: 'Blue',
    keywords: ['blue', 'azure', 'sky-blue', 'navy', 'indigo', 'cobalt'],
    meaning: 'Communication, truth, the throat chakra, expansive consciousness, the spiritual sky. Blue in dreams arrives when expression is opening or when you are being asked to speak more honestly.',
    shadow: 'When blue is dark or murky, it can indicate sadness, withdrawal, or an over-rationalisation that has cooled the heart.',
  },
  {
    color: 'Gold',
    keywords: ['gold', 'golden', 'gilded'],
    meaning: 'The Self in Jungian terms — divine light, individuated wholeness, royal energy. Gold in dreams marks moments of meeting the highest version of yourself or recognising a sacred quality in another.',
    shadow: 'When gold feels false or fool\'s-gold, it signals vanity or chasing recognition that won\'t sustain you.',
  },
  {
    color: 'Black',
    keywords: ['black', 'pitch black', 'midnight'],
    meaning: 'The unconscious, the unknown, the mysterious feminine, formlessness from which everything is born. Black in dreams is rich with potential — not absence but pre-form.',
    shadow: 'When black is suffocating, it signals depression, dread, or material that has been buried too long without attention.',
  },
  {
    color: 'White',
    keywords: ['white', 'snow-white', 'ivory', 'pure white'],
    meaning: 'Clarity, innocence, the cleared slate, spiritual purity, beginnings. White in dreams arrives at thresholds — fresh chapters, returning to what is essential.',
    shadow: 'Sterile, lifeless white indicates over-purification — a refusal of complexity, a false innocence that won\'t hold up to real life.',
  },
  {
    color: 'Green',
    keywords: ['green', 'emerald', 'forest green', 'jade', 'lime'],
    meaning: 'Growth, healing, the heart, nature\'s vitality, abundance. Green in dreams reflects the parts of you that are alive and growing.',
    shadow: 'Sickly, mouldering green can indicate jealousy, decay, or a healing that has stalled.',
  },
  {
    color: 'Purple',
    keywords: ['purple', 'violet', 'lavender', 'magenta'],
    meaning: 'Spirituality, transformation, royalty, the crown chakra. Purple in dreams marks contact with mystery and elevated awareness.',
    shadow: 'Heavy, oppressive purple can signal spiritual bypassing — using mysticism to escape ordinary embodied life.',
  },
  {
    color: 'Yellow',
    keywords: ['yellow', 'sunny yellow', 'golden yellow', 'pale yellow'],
    meaning: 'Sunlight consciousness, intellect, joy, mental clarity, optimism. Yellow in dreams arrives when the mind clears or when joy is being reclaimed.',
    shadow: 'Sickly yellow signals jaundiced perception, anxiety, or a mind that has overheated.',
  },
  {
    color: 'Orange',
    keywords: ['orange', 'amber', 'tangerine', 'rust'],
    meaning: 'Sociality, warmth, sensual creativity, the sacral chakra. Orange in dreams reflects appetite for life and pleasure.',
    shadow: 'Overheated orange can signal hedonism without grounding, or an extroversion masking inner emptiness.',
  },
  {
    color: 'Pink',
    keywords: ['pink', 'rose pink', 'blush', 'salmon pink'],
    meaning: 'Tenderness, the receptive feminine, gentle love, vulnerability accepted. Pink in dreams is the colour of the heart unguarded.',
    shadow: 'Saccharine pink indicates infantilising sweetness, denial of real complexity in love.',
  },
  {
    color: 'Brown',
    keywords: ['brown', 'tan', 'beige', 'chocolate brown'],
    meaning: 'Earth, grounding, simplicity, return to body. Brown in dreams arrives when steadiness is what you need most.',
    shadow: 'Drab brown can indicate stagnation, a life over-pruned of beauty, or being too mired in the practical.',
  },
  {
    color: 'Silver',
    keywords: ['silver', 'silvery', 'metallic silver'],
    meaning: 'The reflective, the lunar, intuition, the receptive feminine in its lit form. Silver in dreams arrives when intuitive knowing is sharpening.',
    shadow: 'Cold silver signals emotional distance dressed as wisdom.',
  },
];

export interface ColorMatch {
  color: DreamColor;
  matchedKeyword: string;
}

// Same apostrophe normalisation as dreamSymbols.ts — user input often
// contains contractions; subsystem keywords don't, so we normalise both.
function normalizeForKeywordMatch(s: string): string {
  return s.toLowerCase().replace(/[’‘'`´]/g, '');
}

export function detectDreamColors(dreamText: string): ColorMatch[] {
  const text = normalizeForKeywordMatch(dreamText);
  const matches: ColorMatch[] = [];
  const seen = new Set<string>();
  for (const c of DREAM_COLORS) {
    if (seen.has(c.color)) continue;
    for (const kw of c.keywords) {
      const normalized = normalizeForKeywordMatch(kw);
      const re = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        matches.push({ color: c, matchedKeyword: kw });
        seen.add(c.color);
        break;
      }
    }
  }
  return matches;
}

// ─── Number symbolism ────────────────────────────────────────────

export interface DreamNumber {
  number: number;
  meaning: string;
}

export const DREAM_NUMBERS: Record<number, string> = {
  1: 'Unity, beginning, the singular self. The number that initiates. Often appears at the start of new chapters when you are alone with your decision.',
  2: 'Duality, partnership, the mirror. The number of relationship — between two people, two qualities, two paths. Asks: what is being held in tension?',
  3: 'Creative completion, the family unit, the synthesis of opposites. Three is the number that resolves duality into new form. Strongly associated with creativity and birth.',
  4: 'Foundation, structure, the four elements / directions / seasons. Four in dreams signals stability, settlement, or — when fragmented — a foundation crumbling.',
  5: 'Change, the five senses, embodiment, restless motion. Five dreams arrive at moments of human-scale unsettlement — life moving through the body.',
  6: 'Harmony, beauty, the yin balance. Six is the number of grace and aesthetic completion. Often appears when life is coming into a delicate equilibrium.',
  7: 'Mystery, spiritual development, contemplation. Seven dreams arrive at thresholds of inner knowing. The number that turns toward the divine.',
  8: 'Power, infinity (the figure-8), regeneration, prosperity. Eight in dreams surfaces during cycles of accumulation — wealth, mastery, deep practice.',
  9: 'Completion, fulfillment, end-of-cycle wisdom. Nine arrives at endings — the closing of long chapters, the release before the new beginning.',
  10: 'Cycle complete, return to unity at a higher octave. Ten dreams mark major life-phase transitions — decade closures, full integrations.',
  11: 'A master number — illumination, intuition pierced through. Eleven dreams arrive at moments of sudden inner clarity that wasn\'t available the day before.',
  12: 'Cosmic order — the 12 months, 12 zodiac signs, 12 disciples. Twelve dreams surface in connection with cyclic patterns and large-scale orientation.',
  13: 'Transformation, the threshold (called unlucky because of the cost of transformation). Thirteen dreams arrive at psychological deaths — old self ending so new can begin.',
  21: 'The world card in tarot — fulfillment of a long arc. Twenty-one dreams celebrate substantial completion.',
  33: 'Master teacher number — service, compassion, wisdom transmitted to others. Often appears as a calling to teach what you have learned.',
  40: 'The biblical / mythic period of testing — 40 days, 40 years. A defined trial with a defined end. Forty dreams reframe ordeals as bounded.',
  100: 'Wholeness at scale, civilization, the multitude. One hundred dreams orient you toward the larger — beyond personal scope.',
};

export interface NumberMatch {
  number: number;
  meaning: string;
}

export function detectDreamNumbers(dreamText: string): NumberMatch[] {
  const text = dreamText.toLowerCase();
  const found = new Set<number>();
  // Match digit forms.
  const digitMatches = text.match(/\b(\d{1,3})\b/g) ?? [];
  for (const m of digitMatches) {
    const n = parseInt(m, 10);
    if (DREAM_NUMBERS[n]) found.add(n);
  }
  // Match word forms for the most common.
  const wordToNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, twenty: 20, hundred: 100, thousand: 1000,
  };
  for (const [word, n] of Object.entries(wordToNum)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text) && DREAM_NUMBERS[n]) found.add(n);
  }
  return [...found].sort((a, b) => a - b).map((n) => ({ number: n, meaning: DREAM_NUMBERS[n] }));
}

// ─── Direction / spatial symbolism ───────────────────────────────

export interface DreamDirection {
  direction: string;
  keywords: string[];
  meaning: string;
}

export const DREAM_DIRECTIONS: DreamDirection[] = [
  { direction: 'Up', keywords: ['upward', 'above', 'rising', 'ascending', 'climbed up'], meaning: 'Aspiration, transcendence, rising into awareness. Upward movement in dreams reflects expansion of consciousness or escape from a difficult ground.' },
  { direction: 'Down', keywords: ['downward', 'below', 'descending', 'falling down', 'underneath'], meaning: 'Descent into the unconscious, the shadow, the body. Often a necessary movement, not punishment — what you find below is what was hidden from view.' },
  { direction: 'Left', keywords: ['to the left', 'on the left', 'turned left'], meaning: 'In Western symbolism: the receptive, intuitive, feminine, unconscious. Going left reflects movement into reflective rather than active mode.' },
  { direction: 'Right', keywords: ['to the right', 'on the right', 'turned right'], meaning: 'The active, rational, conscious, masculine. Going right reflects engagement with the world of doing and naming.' },
  { direction: 'Forward', keywords: ['ahead', 'forward', 'in front', 'onward'], meaning: 'Future, progress, what is becoming. Forward movement in dreams reflects momentum toward something forming.' },
  { direction: 'Backward', keywords: ['backward', 'behind', 'going back', 'in reverse'], meaning: 'The past, what is unprocessed, looking at where you came from. Sometimes integration; sometimes regression.' },
  { direction: 'North', keywords: ['north', 'northern', 'northward'], meaning: 'In many traditions: wisdom, the elder, the cold clarity of distance. Often associated with stillness and council.' },
  { direction: 'South', keywords: ['south', 'southern'], meaning: 'Warmth, vitality, the present moment, embodiment. South in dreams reflects the felt-sense of being alive.' },
  { direction: 'East', keywords: ['east', 'eastern', 'sunrise direction'], meaning: 'New beginnings, intellectual clarity, the rising sun. East in dreams marks fresh awareness.' },
  { direction: 'West', keywords: ['west', 'western', 'sunset direction'], meaning: 'Closure, gathering, the setting of things, ancestors. West in dreams brings completion and remembered wisdom.' },
];

export interface DirectionMatch {
  entry: DreamDirection;
  matchedKeyword: string;
}

export function detectDreamDirections(dreamText: string): DirectionMatch[] {
  const text = normalizeForKeywordMatch(dreamText);
  const matches: DirectionMatch[] = [];
  const seen = new Set<string>();
  for (const d of DREAM_DIRECTIONS) {
    if (seen.has(d.direction)) continue;
    for (const kw of d.keywords) {
      const normalized = normalizeForKeywordMatch(kw);
      const re = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        matches.push({ entry: d, matchedKeyword: kw });
        seen.add(d.direction);
        break;
      }
    }
  }
  return matches;
}

// ─── Cultural overlays ───────────────────────────────────────────

export interface CulturalLore {
  culture: string;
  flavour: string;
}

export const CULTURAL_DREAM_LORE: CulturalLore[] = [
  { culture: 'Western (Jung)', flavour: 'Dreams are messages from the unconscious — symbolic, archetypal, individual. The work is integration: meeting the parts of yourself that the dream is asking to be acknowledged. No fixed dictionary; symbols mean what they mean to YOU within your specific life.' },
  { culture: 'Western (Freud)', flavour: 'Dreams disguise wishes the conscious mind cannot accept. The manifest content (what happened) is a translation of the latent content (what you wanted). Look for displacement and condensation — the dream rarely shows you the real subject directly.' },
  { culture: 'Chinese (周公解梦)', flavour: 'Duke of Zhou\'s ancient dream dictionary catalogues thousands of specific images and their omens — water means wealth, snakes mean transformation, teeth falling means losing power. A predictive tradition with extensive specific lookups.' },
  { culture: 'Indigenous / Shamanic', flavour: 'Dreams are visits — ancestors, animal allies, the spirits of place. The dreamer often has guides who appear repeatedly. The work is reciprocity: thanking them, listening, sometimes acting on what they showed you.' },
  { culture: 'Egyptian', flavour: 'Dreams carry the gods\' communication. Specific images had specific meanings codified in priest manuals. Particularly attentive to dreams of the dead, who came to ask the living to complete unfinished business.' },
  { culture: 'Tibetan Buddhist', flavour: 'Dreams reveal the nature of mind. Lucid dream practice (milam) trains the practitioner to recognise the dream is a dream — and by extension, to recognise that waking life carries the same dream-quality.' },
];

// ─── Lucid dreaming ──────────────────────────────────────────────

export interface LucidTechnique {
  name: string;
  acronym: string;
  description: string;
  steps: string[];
}

export const LUCID_TECHNIQUES: LucidTechnique[] = [
  {
    name: 'Mnemonic Induction of Lucid Dreams',
    acronym: 'MILD',
    description: 'The most reliable beginner technique. Uses memory-reinforcement to set an intention to recognize you\'re dreaming.',
    steps: [
      'Wake up after 5-6 hours of sleep (set an alarm or wake naturally).',
      'Stay awake for 10-15 minutes — read about dreams, recall the dream you just had.',
      'As you fall back asleep, repeatedly tell yourself: "Next time I\'m dreaming, I\'ll remember I\'m dreaming."',
      'Visualize yourself in the dream you just had, but this time recognizing it.',
      'Drift off while holding the intention. The early-morning sleep that follows tends to be REM-rich.',
    ],
  },
  {
    name: 'Wake-Back-To-Bed',
    acronym: 'WBTB',
    description: 'The single highest-success-rate method. Wakes you in the middle of REM cycles, when you can re-enter sleep with conscious awareness.',
    steps: [
      'Set an alarm for 4.5-6 hours after sleep onset.',
      'Get out of bed when the alarm goes off; stay up 20-60 minutes.',
      'Read about dreams, journal, do something gently engaging — but no screens.',
      'Return to bed with the intention to recognize the next dream as a dream.',
      'Combine with MILD or visualization for highest yield.',
    ],
  },
  {
    name: 'Reality Checks',
    acronym: 'RC',
    description: 'Daily-life habit that trains your brain to question reality automatically. Eventually the habit carries into dreams, and the question wakes you up within them.',
    steps: [
      'Several times a day, ask yourself: "Am I dreaming?"',
      'Test it physically — try pushing a finger through your other palm. In dreams, fingers go through. In waking life, they don\'t.',
      'Look at your hands, look away, look back. In dreams, hands often have wrong number of fingers or shift on look-back.',
      'Read a sentence twice. In dreams, text changes between readings.',
      'Make this a genuine inquiry, not a rote check. Belief that you might be dreaming is the active ingredient.',
    ],
  },
  {
    name: 'Wake-Initiated Lucid Dream',
    acronym: 'WILD',
    description: 'Advanced technique — go from waking directly into a lucid dream without losing consciousness. High effort, requires comfort with sleep paralysis.',
    steps: [
      'Lie still on your back. Relax fully without falling asleep.',
      'Allow hypnagogic imagery (the patterns / scenes that arise as you drift) to develop.',
      'Stay aware as the body sleeps — you\'ll experience sleep paralysis, possibly with vivid sensory hallucinations.',
      'When the dream-scene fully forms around you, you\'re in. Stand up gently within the dream.',
      'Practiced safely; if sleep paralysis is uncomfortable, switch to MILD/WBTB instead.',
    ],
  },
];

// ─── Nightmares ──────────────────────────────────────────────────

export interface NightmareCategory {
  category: string;
  description: string;
  approach: string;
}

export const NIGHTMARE_CATEGORIES: NightmareCategory[] = [
  {
    category: 'Recurring nightmare',
    description: 'The same nightmare returning repeatedly is the unconscious knocking with the same letter until you read it. The repetition itself is the message: this matters, and the conscious mind has not addressed it.',
    approach: 'Imagery Rehearsal Therapy (IRT) — well-evidenced for PTSD and chronic nightmares. While awake: deliberately re-imagine the nightmare with a different ending of your choice. Rehearse the new ending nightly for 1-2 weeks. The repetition trains the dreaming brain to use the new script. Effective for 70%+ of recurring nightmares within a few weeks.',
  },
  {
    category: 'Sleep paralysis',
    description: 'Waking with the body still in sleep-paralysis (the natural REM atonia hasn\'t lifted) — often accompanied by hallucinations of presence in the room, pressure on the chest, inability to move or speak. Terrifying but completely safe.',
    approach: 'Stay calm. The paralysis lifts within 1-3 minutes always. Try to wiggle a single finger or toe — the smallest movement breaks the spell. If hallucinations are present, remember they are dream-content arriving early: not real, not dangerous. Long-term: improve sleep hygiene, avoid back-sleeping if it triggers, address underlying sleep deprivation.',
  },
  {
    category: 'Night terrors',
    description: 'Different from nightmares — the sleeper appears awake, screams or thrashes, but is in deep sleep and remembers nothing the next morning. Mostly affects children but can occur in adults under high stress or sleep debt.',
    approach: 'Don\'t try to wake the person; gently keep them safe until it passes (usually under 5 minutes). For self-affecting adults: address the root causes — stress, alcohol, sleep schedule. Consult a sleep specialist if persistent.',
  },
  {
    category: 'Trauma nightmares',
    description: 'Direct or symbolic replays of traumatic events. The brain attempting to process what overwhelmed its real-time capacity. Particularly common in PTSD.',
    approach: 'Trauma nightmares respond to professional trauma therapy (EMDR, somatic experiencing, IFS). The nightmare is doing protective work — you don\'t want to suppress it, but you do want a trained guide for the integration. If accompanied by daytime intrusions or hyperarousal, please reach out to a therapist.',
  },
  {
    category: 'Anxiety nightmares',
    description: 'Generic chase / falling / unprepared / lost / late nightmares that surface during periods of high stress. The dream content is usually metaphorical for the waking pressure.',
    approach: 'These are typically transient — they resolve when the underlying stress resolves. In the meantime: nighttime grounding (warm shower, no screens 30min pre-sleep), gentle journaling about the day before bed, and reminding yourself the dream is processing-work, not prophecy.',
  },
];

// ─── Convenience: detect everything in one pass ──────────────────

export interface DreamSubsystemMatches {
  colors: ColorMatch[];
  numbers: NumberMatch[];
  directions: DirectionMatch[];
}

export function detectAll(dreamText: string): DreamSubsystemMatches {
  return {
    colors: detectDreamColors(dreamText),
    numbers: detectDreamNumbers(dreamText),
    directions: detectDreamDirections(dreamText),
  };
}
