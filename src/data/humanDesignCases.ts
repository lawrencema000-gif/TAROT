// Human Design — strategy-in-practice and decision-making case studies
// per Type and per Authority.
//
// The dry version of HD says "Manifestor strategy is to inform". But
// what does "informing" actually look like in a real Tuesday-afternoon
// situation? This module provides 2-3 concrete scenarios per Type, plus
// per-Authority decision-making scripts.

import type { HDType } from './humanDesign';

export type Authority = 'Emotional' | 'Sacral' | 'Splenic' | 'Ego Manifested' | 'Ego Projected' | 'Self-Projected' | 'Mental' | 'Lunar';

// ────────────────────────────────────────────────────────────────────
// Per-type strategy in practice
// ────────────────────────────────────────────────────────────────────

export interface TypeStrategyCase {
  scenario: string;
  wrongMove: string;
  alignedMove: string;
  signature: string;
}

export const TYPE_CASES: Record<HDType, TypeStrategyCase[]> = {
  manifestor: [
    {
      scenario: 'You\'ve decided you want to leave your current job and start a freelance practice. The decision feels clear; your urge to act is strong.',
      wrongMove: 'Quit on Friday afternoon. Send a Slack to your team announcing your last day. Move into freelancing the following Monday without telling anyone in your life what you\'re doing.',
      alignedMove: 'Inform — at minimum — your manager, the colleagues whose work depends on yours, and your closest people in your personal life. Not asking for permission; not hosting a roundtable. A clear "I\'m moving toward X. This is what it means for what we share. Here\'s how I want to handle the transition." The information lands; the people around you can adjust without being knocked over.',
      signature: 'You feel peace, not relief. The action moved cleanly because the path was cleared.',
    },
    {
      scenario: 'You see a glaring inefficiency in your team\'s process. You can fix it in an hour.',
      wrongMove: 'Just fix it. Push the change. Wait for someone to notice it\'s better. Get frustrated when others are confused or feel stepped on.',
      alignedMove: 'Send a message: "I noticed X is causing Y. I have an idea for a fix that would take an hour. Going to do it Tuesday morning unless someone has a reason to slow it down." Then act. The information was given; the path is now yours.',
      signature: 'Peace. No defensive explaining afterward.',
    },
  ],
  generator: [
    {
      scenario: 'A friend asks if you want to go on a weekend trip together.',
      wrongMove: 'Say yes immediately because you don\'t want to disappoint them, then spend the next two weeks dreading it.',
      alignedMove: 'Pause. Wait for the gut response. Notice: when you imagine yourself there, does the body soften and lean in (yes / uh-huh) or contract and resist (no / uh-uh)? Trust the sound the body makes before the mind can dress it up.',
      signature: 'Satisfaction. The energy you put in returns to you in kind.',
    },
    {
      scenario: 'You\'ve been doing the same job for 4 years. You\'re competent, but not satisfied.',
      wrongMove: 'Initiate a job search. Send out applications to fix the dissatisfaction.',
      alignedMove: 'Generators don\'t initiate change well. Instead, wait for life to send something to RESPOND to — a recruiter\'s message, a friend\'s mention of an opening, a project that arrives unexpectedly. While waiting: become deeply curious about WHAT in your current work still gives you a "yes" and what consistently gives you a "no". The data refines what you respond to next.',
      signature: 'When the right thing arrives, the body says yes before the mind catches up.',
    },
    {
      scenario: 'A romantic partner asks you to move in together.',
      wrongMove: 'Use a logical pros-and-cons list. Decide based on what makes sense.',
      alignedMove: 'Sacral check. When you visualise the morning of move-in day, what does your body do? Sacral generators (most generators) get a clean yes/no in the gut within 2-3 seconds of imagining the scene. Trust that signal even if you can\'t justify it.',
      signature: 'Whichever way you went, no regret. Energy flows in either direction.',
    },
  ],
  'manifesting-generator': [
    {
      scenario: 'You have three projects you want to pursue: a creative side project, a business idea, and a fitness program.',
      wrongMove: 'Try to focus on one. Pick the "most important". Tell yourself you have to finish one before starting the next.',
      alignedMove: 'Run all three in parallel. MGs are designed for multi-passion lives. Respond to whichever one has energy in the moment. Inform the people in each project that your attention rotates. The wrong move is forcing yourself into the linearity of a Generator strategy.',
      signature: 'You skip steps faster than other types — and the right things still get done. Trust the speed.',
    },
    {
      scenario: 'You\'re in a job that requires steady, predictable hours. You feel restless after 18 months.',
      wrongMove: 'Stay because logic says you should. Or quit suddenly without telling anyone what\'s coming.',
      alignedMove: 'Same as Manifestor — inform. Then move. MGs are restless by design, and the work isn\'t to suppress it but to make sure the people around you know your trajectory before you bolt.',
      signature: 'Satisfaction + peace — the dual signature for MGs.',
    },
  ],
  projector: [
    {
      scenario: 'You have brilliant insight about a colleague\'s project. You want to share it.',
      wrongMove: 'Walk into their office and tell them what they\'re missing. Send them the unsolicited Loom. Push your wisdom on them.',
      alignedMove: 'Wait until they ask. Or until they explicitly invite you in. Until then, prepare your insight quietly. When the invitation comes, the energy is there for them to actually receive what you see. Without invitation, your wisdom bounces off and you exhaust yourself.',
      signature: 'Recognition + success. They thank you specifically. You didn\'t have to chase.',
    },
    {
      scenario: 'You want a particular role at work. A senior colleague is hiring.',
      wrongMove: 'Apply. Cold-pitch. Hustle for it.',
      alignedMove: 'Make yourself visible in the right rooms. Do excellent work where you currently are. Trust that the right invitation tends to come to Projectors who are seen and respected — chasing it actively burns the very energy that attracts the invitation.',
      signature: 'When the invitation arrives, it tends to be better than what you would have asked for.',
    },
    {
      scenario: 'A friend is going through a hard time. You want to help.',
      wrongMove: 'Show up unannounced. Give advice they didn\'t ask for. Burn yourself out trying to fix.',
      alignedMove: 'Make yourself available: "I see you. I\'m here if you want to talk." Then wait for them to invite you in. Projectors who help only when invited remain energetically rich; those who help uninvited deplete fast.',
      signature: 'Bitterness absent. You stayed in your own energy.',
    },
  ],
  reflector: [
    {
      scenario: 'You\'re considering a major life change — moving to a new city, ending a long relationship, starting a business.',
      wrongMove: 'Decide quickly because you\'re tired of being uncertain.',
      alignedMove: 'Wait one full lunar cycle (28 days) before committing. Reflectors are designed to sample the qi of the moon\'s 12 sign-positions before knowing what\'s actually theirs. The decision that survives all 28 days is the decision worth making.',
      signature: 'Surprise — at how clearly you know by day 28 what was murky on day 1.',
    },
    {
      scenario: 'You feel suddenly very different from how you felt yesterday — moods, opinions, energy.',
      wrongMove: 'Worry that you\'re inconsistent or unstable.',
      alignedMove: 'Reflectors mirror their environment. The shift in mood is information about the people / place / collective energy around you, not about a flaw in your selfhood. Where were you when the mood shifted? Who was there? The mood is data about that.',
      signature: 'Surprise — at the gift of being a barometer.',
    },
  ],
};

// ────────────────────────────────────────────────────────────────────
// Per-authority decision-making scripts
// ────────────────────────────────────────────────────────────────────

export interface AuthorityScript {
  authorityName: string;
  decisionMakingScript: string[];
  commonMistake: string;
  realityCheck: string;
}

export const AUTHORITY_SCRIPTS: Record<Authority, AuthorityScript> = {
  Emotional: {
    authorityName: 'Emotional Authority',
    decisionMakingScript: [
      'When a decision arrives, do nothing for 24-72 hours. Do not say yes. Do not say no.',
      'Notice: the question is going to feel different at different points in your emotional wave. You will be excited about it at the peak, suspicious of it in the trough.',
      'Wait until you can feel the situation from BOTH the high and the low without changing your view.',
      'The clarity that survives the wave is the clarity to act on. Anything else is a wave-state speaking.',
      'If pushed for an immediate answer, your answer is "I need to sit with this." Anyone who can\'t accept that is not someone you should be deciding with.',
    ],
    commonMistake: 'Deciding from a peak (manic yes) or a trough (defensive no). Both are emotional states masquerading as clarity.',
    realityCheck: 'When you\'re right, your decision feels CALM, not exciting. The clarity is unspectacular.',
  },
  Sacral: {
    authorityName: 'Sacral Authority',
    decisionMakingScript: [
      'When a question is put to you, listen to the gut sound BEFORE the mind speaks.',
      'The yes is "uh-huh" — a low affirming sound from below the belly.',
      'The no is "uh-uh" — a downward refusing sound from the same place.',
      'If neither comes, the question wasn\'t a real yes-or-no question yet. Either the question needs to be reframed, or you don\'t have enough information.',
      'The body doesn\'t reason. It responds. Trust the response — even when you can\'t justify it logically.',
    ],
    commonMistake: 'Letting the mind override the gut response because the gut\'s answer doesn\'t make logical sense.',
    realityCheck: 'When you trust the gut, energy flows for the work. When you override it, you find yourself drained doing the very thing you said yes to.',
  },
  Splenic: {
    authorityName: 'Splenic Authority',
    decisionMakingScript: [
      'The splenic voice speaks ONCE. Soft, in-the-now, alongside the moment.',
      'It does not repeat. If you missed it, it\'s gone — until the next moment offers a new chance.',
      'It feels like an instinctive knowing rather than a thought. "Don\'t go." "This person." "Now." "Wait."',
      'Trust the first whisper — even when it contradicts what you planned, what you scheduled, what makes sense.',
      'The work is to slow down enough to hear it, and to act on it before the rationalising mind argues back.',
    ],
    commonMistake: 'Waiting for confirmation. The spleen doesn\'t confirm; it reports once. Asking it to repeat is asking the wrong organ.',
    realityCheck: 'When you trust the spleen, your decisions look uncannily well-timed in retrospect. When you override, you find yourself thinking "I knew."',
  },
  'Ego Manifested': {
    authorityName: 'Ego Manifested Authority',
    decisionMakingScript: [
      'Ask: do I genuinely want this? Is my heart and will behind it?',
      'Ego authority decides from desire — not as ego in the negative sense, but as the actual wanting that originates with you.',
      'If you can\'t say "yes, I WANT this" with full chest, the answer is no.',
      'The ego is not infinite — periods of rest are required to refill the wanting reserves.',
      'When you do say yes, your willpower will carry it through.',
    ],
    commonMistake: 'Saying yes to obligations rather than desires. The ego will not power through what it didn\'t want.',
    realityCheck: 'When the ego says yes and means it, you have the willpower to do the impossible. When it says yes from obligation, you collapse partway through.',
  },
  'Ego Projected': {
    authorityName: 'Ego Projected Authority',
    decisionMakingScript: [
      'Talk through the decision out loud — to a trusted person, or to a recording of yourself.',
      'Listen to what YOUR voice says — not the other person\'s response. Their face is just a mirror for your own truth to surface against.',
      'Notice the shift in your tone when you arrive at the actual decision. The body sounds different when the voice says the truth.',
      'The decision you can speak with conviction, that doesn\'t crumble when you say it out loud, is the one to act on.',
    ],
    commonMistake: 'Listening to what the other person SAID rather than to what you said. They are the mirror, not the oracle.',
    realityCheck: 'When you trust your own voice in conversation, you walk away with clarity that came from speaking, not from being told.',
  },
  'Self-Projected': {
    authorityName: 'Self-Projected Authority',
    decisionMakingScript: [
      'Talk through the decision with someone safe — anyone where you can hear yourself think.',
      'What you SAY out loud about the choice reveals what is true for you. The body of your speech is the data.',
      'Notice when your voice tightens vs when it relaxes. When you cringe at your own words vs when you mean them.',
      'You\'re looking for the version of the decision that makes your voice sound like itself.',
    ],
    commonMistake: 'Asking the listener what they think. They\'re the room your voice echoes in — they\'re not the answer.',
    realityCheck: 'When self-projected authority is on, you walk out of the conversation knowing — even if you didn\'t know walking in.',
  },
  Mental: {
    authorityName: 'Mental Authority (also known as Sounding-Board / Outer Authority)',
    decisionMakingScript: [
      'You are designed to decide WITH others, not alone.',
      'Identify a small council — 2-4 trusted people whose discernment you respect.',
      'Bring decisions to them. Let them ask you questions. Let yourself be informed by their reflections without abdicating.',
      'The right decision emerges in the dialogue, not in private contemplation.',
      'Solitary decision-making for Mental authority types tends to produce inferior decisions — not because you lack judgment, but because your wisdom is COLLECTIVE by design.',
    ],
    commonMistake: 'Trying to decide alone, then defending the decision, then realising months later it was wrong because you skipped the council.',
    realityCheck: 'Decisions made through real dialogue with your sounding board have a different quality. They feel collaborative even after the moment of choice.',
  },
  Lunar: {
    authorityName: 'Lunar Authority (Reflector only)',
    decisionMakingScript: [
      'For any major decision, wait one full 28-day lunar cycle.',
      'During that month, the moon will pass through all 12 sign positions. Each position activates different gates in your transient bodygraph.',
      'On day 1 your decision feels one way. On day 14 it feels another. On day 21 a third.',
      'The decision you arrive at on day 28 — having sat with it through every phase of the moon — is the one to act on.',
      'For Reflectors, anything decided faster than this is decided in someone else\'s energy.',
    ],
    commonMistake: 'Trying to decide on the timeline a Generator or Manifestor would. Reflectors are not designed for that speed; rushing produces decisions that don\'t hold.',
    realityCheck: 'When Reflectors honour the cycle, they find their decisions are genuinely theirs — and the surprise is how clearly they know by the end of the month.',
  },
};

// ────────────────────────────────────────────────────────────────────
// Composite chart helpers — used by PartnerCompat
// ────────────────────────────────────────────────────────────────────

export interface CompositeNote {
  pairing: string;
  reading: string;
}

/**
 * Composite chart in synastry — rather than how YOUR planet relates to
 * THEIRS, the composite chart treats the relationship itself as a
 * third entity with its own chart, computed from midpoints. Below are
 * the 12 most-impactful midpoint observations to surface to a couple.
 */
export const COMPOSITE_PAIRING_READINGS: Record<string, string> = {
  'Sun-Sun': 'Your composite Sun shows the core identity of the relationship — what the two of you become together that neither of you is alone. The midpoint sign tells you the relationship\'s essential character: relating in Aries makes the partnership a fierce co-adventure; in Pisces, a shared dream-space; in Capricorn, a building project.',
  'Moon-Moon': 'The composite Moon is the emotional climate the two of you create together. It tells you what the relationship FEELS like to be inside. A relationship\'s composite Moon position is often more telling than either partner\'s individual Moon for predicting day-to-day emotional rapport.',
  'Venus-Venus': 'Your shared aesthetics, pleasures, values. What you naturally enjoy together. The composite Venus tells you what kinds of dates light up the partnership and what kinds of beauty you co-create in your shared life.',
  'Mars-Mars': 'Your collective drive, sexual chemistry, and conflict style. Strong composite Mars: you accomplish things together. Difficult: you clash on pace and assertion.',
  'Sun-Moon': 'Identity meeting emotional safety. When this conjunction is in the composite, the relationship offers each partner the felt-sense of being held by the very identity they bring.',
  'Venus-Mars': 'The classic chemistry pairing. Composite Venus-Mars contact says the attraction is a structural feature of the relationship, not a phase that fades.',
  'Saturn-conjunct': 'Composite Saturn aspects (especially conjunctions) tell you this is a relationship with WORK in it — duty, commitment, the kind of partnership that builds something over decades. Often heavy in early years, deeply rewarding in late ones.',
  'Pluto-strong': 'Composite Pluto contacts mean this relationship is transformational by design. Both people will be fundamentally changed by the partnership. Cannot be a "casual" relationship even if you wanted it to be.',
};
