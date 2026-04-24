// Human Design — approximate calculation from birth date, time, and (optional) location.
//
// Full Human Design uses a bodygraph of 9 centres, 64 gates (mapped to
// I-Ching hexagrams), and 36 channels. A proper calculation requires an
// ephemeris lookup for the Sun and planets at the birth moment AND at a
// point 88 degrees of solar motion before birth (the "Design crystal",
// typically ~3 months prior).
//
// For a mobile-sized ship we implement a pragmatic tier-1 derivation:
//   - Type (Manifestor / Generator / Manifesting Generator / Projector / Reflector)
//   - Strategy (the action verb for that type)
//   - Not-self theme (the emotional signal when out of alignment)
//   - Inner Authority (Emotional / Sacral / Splenic / Ego / Self-projected / Mental / Lunar)
//   - Profile (1/3, 2/4, etc — the 12 possible personality profiles)
//
// The "correct" type, authority, and profile require the full bodygraph
// which needs an ephemeris. What we do here: a lightweight heuristic that
// uses the birth date/time to give a defensible, self-consistent read.
// Users who want the full chart can export to e.g. mybodygraph.com.
// We will LATER add real ephemeris support via an edge function — for now
// this gives users something useful immediately.

export type HDType = 'manifestor' | 'generator' | 'manifesting-generator' | 'projector' | 'reflector';
export type HDAuthority = 'emotional' | 'sacral' | 'splenic' | 'ego' | 'self-projected' | 'mental' | 'lunar';
export type HDProfile =
  | '1/3' | '1/4' | '2/4' | '2/5' | '3/5' | '3/6'
  | '4/6' | '4/1' | '5/1' | '5/2' | '6/2' | '6/3';

export interface HumanDesignResult {
  type: HDType;
  strategy: string;
  notSelfTheme: string;
  authority: HDAuthority;
  profile: HDProfile;
}

export interface HumanDesignTypeInfo {
  name: string;
  percentOfPopulation: string;
  signature: string;
  strategy: string;
  notSelfTheme: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  affirmation: string;
  tarotPairing: string;
}

export interface HumanDesignAuthorityInfo {
  name: string;
  description: string;
  guidance: string;
}

export interface HumanDesignProfileInfo {
  code: HDProfile;
  name: string;
  description: string;
}

// English canonical content. i18n overrides live under
// `humanDesign.types.*`, `humanDesign.authorities.*`, `humanDesign.profiles.*`.
export const HD_TYPES: Record<HDType, HumanDesignTypeInfo> = {
  manifestor: {
    name: 'Manifestor',
    percentOfPopulation: '~9%',
    signature: 'Peace',
    strategy: 'Inform before you act',
    notSelfTheme: 'Anger',
    summary: 'Manifestors are initiators — the rare type who can just *start* without waiting for a cue from the world. Your impact is disproportionate. When you move, things move. The catch: people around you get knocked over by your trajectory if you do not inform them first.',
    strengths: ['Initiation', 'Independence', 'Clear vision', 'Ability to begin without permission'],
    challenges: ['Being misunderstood as aggressive', 'Isolation', 'Forgetting to inform others about what you are doing', 'Anger when you feel controlled'],
    affirmation: 'I initiate with clarity and inform those around me — my peace comes from being understood, not controlled.',
    tarotPairing: 'The Chariot / The Magician',
  },
  generator: {
    name: 'Generator',
    percentOfPopulation: '~37%',
    signature: 'Satisfaction',
    strategy: 'Wait to respond',
    notSelfTheme: 'Frustration',
    summary: 'Generators are the life-force workers of the planet. Your body knows what it wants to do through a gut response — the sacral. When you wait for something real to show up (an opportunity, a request, a pull in your body) and then respond yes or no with your gut, your life builds with sustainable energy.',
    strengths: ['Deep energy for work that lights you up', 'Mastery through repetition', 'Gut wisdom', 'Joy-as-a-signal'],
    challenges: ['Initiating out of mental should rather than gut yes', 'Saying yes to everything and burning out', 'Frustration when you force rather than respond'],
    affirmation: 'My gut knows. When I wait and respond, my life builds with energy I can sustain.',
    tarotPairing: 'The Empress / Wheel of Fortune',
  },
  'manifesting-generator': {
    name: 'Manifesting Generator',
    percentOfPopulation: '~33%',
    signature: 'Satisfaction + Peace',
    strategy: 'Wait to respond, then inform',
    notSelfTheme: 'Frustration + Anger',
    summary: 'Manifesting Generators are multi-passionate hybrids. You respond with your gut like a Generator, then move quickly like a Manifestor. Your strategy is both — respond first, then inform those affected by your speed. You often skip steps others take linearly; that is by design.',
    strengths: ['Multi-passionate', 'Quick-moving', 'Efficient shortcuts', 'High energy when aligned'],
    challenges: ['Skipping crucial steps without realising', 'Frustrating others with your speed', 'Burnout from juggling', 'Frustration + anger when you override your response'],
    affirmation: 'I respond first, move fast, and inform those around me — my speed is a gift when I honour the gut yes.',
    tarotPairing: 'Wheel of Fortune / The Chariot',
  },
  projector: {
    name: 'Projector',
    percentOfPopulation: '~20%',
    signature: 'Success',
    strategy: 'Wait for the invitation',
    notSelfTheme: 'Bitterness',
    summary: 'Projectors are the guides of the world. You see other people deeply, read systems, and offer wisdom that reshapes outcomes. Your strategy is controversial in a hustle-culture context: wait for the invitation. When you are seen and invited, your wisdom lands and transforms. When you push uninvited, people resist and you burn out.',
    strengths: ['Deep insight into others', 'Wisdom', 'Efficient energy use', 'System thinking'],
    challenges: ['Waiting in a world that says "just act"', 'Being unrecognised', 'Bitterness when your gifts are not seen', 'Burnout from pushing'],
    affirmation: 'I am the guide. I wait to be recognised, and when the invitation comes my wisdom transforms.',
    tarotPairing: 'The High Priestess / The Hermit',
  },
  reflector: {
    name: 'Reflector',
    percentOfPopulation: '~1%',
    signature: 'Surprise',
    strategy: 'Wait a lunar cycle before major decisions',
    notSelfTheme: 'Disappointment',
    summary: 'Reflectors are the rarest type — the mirrors of humanity. You are designed to reflect the health of the environments you are in. Your whole chart is defined by the moon cycle rather than the sun, so for big decisions you are wise to let a full lunar month pass, sampling the feeling of the decision under different moon phases.',
    strengths: ['Seeing the health of groups', 'Wisdom about environments', 'Deep sensitivity', 'Unique perspective'],
    challenges: ['Being overwhelmed in wrong environments', 'Rushing decisions', 'Disappointment when environment is unhealthy', 'Feeling unseen'],
    affirmation: 'I am the mirror. The right environment brings me alive — I wait a moon cycle before I commit.',
    tarotPairing: 'The Moon / The Star',
  },
};

export const HD_AUTHORITIES: Record<HDAuthority, HumanDesignAuthorityInfo> = {
  emotional: {
    name: 'Emotional (Solar Plexus)',
    description: 'Your truth reveals itself over time, across an emotional wave. In any given moment, you are not at your clear truth — clarity emerges by riding the wave of hope and pessimism.',
    guidance: 'Do not decide in the moment. Sleep on it. Wait through the highs and lows. When the wave quiets, your real truth shows up.',
  },
  sacral: {
    name: 'Sacral',
    description: 'Your truth lives in your gut, in a felt yes or no, often an audible "uh-huh" or "uhn-uh" in response to things happening around you.',
    guidance: 'Respond in the moment. Trust the gut. If it does not light up, it is a no.',
  },
  splenic: {
    name: 'Splenic',
    description: 'Your truth speaks once, in a subtle intuitive flash, in the present moment. The splenic voice is quiet and does not repeat.',
    guidance: 'Act on the first intuitive hit. Do not wait for louder confirmation — there is none.',
  },
  ego: {
    name: 'Ego (Heart)',
    description: 'Your truth is about willpower and what you want. Can you commit the energy? Can you speak your promise cleanly?',
    guidance: 'Listen for what you promise when you speak. Your authority speaks through the commitments you are actually willing to make.',
  },
  'self-projected': {
    name: 'Self-Projected (G-Centre)',
    description: 'Your truth reveals itself through speaking. When you talk out loud to someone who hears you well, you discover what is true for you.',
    guidance: 'Find a sounding board. Talk through decisions. Your clarity appears in your own voice.',
  },
  mental: {
    name: 'Mental (Outer Authority)',
    description: 'Only for Projectors with no defined authority. Your clarity comes from being in the right environments and talking with trusted others over time.',
    guidance: 'Environment matters most. Talk it out in the right company before committing.',
  },
  lunar: {
    name: 'Lunar',
    description: 'Only for Reflectors. Your authority is the moon cycle — your consistent answer emerges over a full 28-29 day lunar month.',
    guidance: 'For big choices, wait through at least one full lunar cycle. Notice how the decision sits in different moon phases.',
  },
};

export const HD_PROFILES: Record<HDProfile, HumanDesignProfileInfo> = {
  '1/3': { code: '1/3', name: 'Investigator / Martyr', description: 'Researcher who learns through trial, error, and breakthrough. You study deeply, then break things to find what actually works.' },
  '1/4': { code: '1/4', name: 'Investigator / Opportunist', description: 'Deep researcher whose influence spreads through their personal network. Your knowledge passes to people you already know.' },
  '2/4': { code: '2/4', name: 'Hermit / Opportunist', description: 'Natural talent that hides until called out. You have gifts you do not know you have — friends see them first.' },
  '2/5': { code: '2/5', name: 'Hermit / Heretic', description: 'Natural talent who must be called out by strangers, often for a radical solution. People project heavily on you.' },
  '3/5': { code: '3/5', name: 'Martyr / Heretic', description: 'Learns by trial and error in front of a wide audience, then delivers practical solutions. Your failures teach others.' },
  '3/6': { code: '3/6', name: 'Martyr / Role Model', description: 'Three phases of life: first 30 years of experimentation, then pulling back, then stepping out as a wise guide.' },
  '4/6': { code: '4/6', name: 'Opportunist / Role Model', description: 'Influences through their intimate network, designed to become an exemplar in later life.' },
  '4/1': { code: '4/1', name: 'Opportunist / Investigator', description: 'Rare profile. Fixed foundation (1st line) shared through intimate network (4th line). Stable core, warm reach.' },
  '5/1': { code: '5/1', name: 'Heretic / Investigator', description: 'Called to deliver universal solutions built on deep study. The projection field is strong — people expect you to save them.' },
  '5/2': { code: '5/2', name: 'Heretic / Hermit', description: 'Called to save the world but wants to be alone. Learns to step forward when genuinely needed, then step back to recharge.' },
  '6/2': { code: '6/2', name: 'Role Model / Hermit', description: 'Three life phases: trial (0-30), contemplation (30-50), role model (50+). Natural gifts sometimes surprise even you.' },
  '6/3': { code: '6/3', name: 'Role Model / Martyr', description: 'Three life phases with trial-and-error built in. Your wisdom is hard-earned and authentic.' },
};

// ---- Heuristic derivation (non-ephemeris) ---------------------------
//
// We derive type/authority/profile from the birth date/time using a
// deterministic hash. This is NOT astrologically accurate — a real chart
// needs an ephemeris. It IS stable: the same birth data always yields the
// same result. Users get a defensible initial reading; we can upgrade to
// a real computation later via an edge function.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function deriveHumanDesign(birthDate: string, birthTime?: string): HumanDesignResult | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const seed = hashString(birthDate + (birthTime ?? ''));

  // Type distribution approximately matches real population stats
  // 37% Generator, 33% Mani-Gen, 20% Projector, 9% Manifestor, 1% Reflector
  const typeRand = seed % 100;
  const type: HDType =
    typeRand < 37 ? 'generator' :
    typeRand < 70 ? 'manifesting-generator' :
    typeRand < 90 ? 'projector' :
    typeRand < 99 ? 'manifestor' :
    'reflector';

  // Authority tied loosely to type
  let authority: HDAuthority;
  if (type === 'reflector') {
    authority = 'lunar';
  } else if (type === 'projector') {
    // Projectors use most authorities except sacral
    const authRand = (seed >> 7) % 6;
    authority = (['emotional', 'splenic', 'ego', 'self-projected', 'mental', 'emotional'] as HDAuthority[])[authRand];
  } else {
    // Generators + Manifestors + MGs typically use sacral or emotional or splenic
    const authRand = (seed >> 7) % 3;
    authority = (['sacral', 'emotional', 'splenic'] as HDAuthority[])[authRand];
    // Manifestors cannot have sacral
    if (type === 'manifestor' && authority === 'sacral') authority = 'emotional';
  }

  const profiles: HDProfile[] = ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3'];
  const profile = profiles[(seed >> 13) % 12];

  return {
    type,
    strategy: HD_TYPES[type].strategy,
    notSelfTheme: HD_TYPES[type].notSelfTheme,
    authority,
    profile,
  };
}
