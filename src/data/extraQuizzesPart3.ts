// Sprint 5 finisher — five final quizzes to push us past the "25+" mark.
//
// Same shape as extraQuizzesPart2: each export is
//   { quiz, dimensions (readonly tuple), info (result dictionary), emoji }.
// Aggregated into EXTRA_QUIZZES_PART3 and merged in extraQuizzes.ts.
//
// The Anxiety Profile quiz is explicitly non-diagnostic — language is
// self-reflective and routes higher-severity results to support copy
// rather than a pseudo-diagnosis. Similar treatment to PHQ-2.

import type { QuizDefinition } from '../types';
import type { DimensionalResultInfo } from './extraQuizzes';

const likert = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];
const likertRev = [
  { value: 5, label: 'Strongly Disagree' },
  { value: 4, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Agree' },
  { value: 1, label: 'Strongly Agree' },
];

// ---------------------------------------------------------------
// 1. Anxiety Profile (NON-DIAGNOSTIC)
// ---------------------------------------------------------------
export type AnxietyProfileType = 'somatic' | 'generalized' | 'social' | 'performance';

export const anxietyProfileQuiz: QuizDefinition = {
  id: 'anxiety-profile-v1',
  type: 'extra-dimensional',
  title: 'Anxiety Profile',
  description: 'A self-reflective look at where anxiety tends to show up in your life. This is not a diagnostic screener — it is a mirror for self-awareness. If your answers concern you, speak with a qualified professional.',
  questions: [
    { id: 'a1', text: 'My body carries my anxiety — tight chest, stomach, jaw.', dimension: 'somatic', options: likert },
    { id: 'a2', text: 'I notice physical tension before I notice the thought that triggered it.', dimension: 'somatic', options: likert },
    { id: 'a3', text: 'My mind keeps loops of worry going without a clear subject.', dimension: 'generalized', options: likert },
    { id: 'a4', text: 'I often feel on edge for reasons I cannot name.', dimension: 'generalized', options: likert },
    { id: 'a5', text: 'Being observed or judged by others makes me tense.', dimension: 'social', options: likert },
    { id: 'a6', text: 'I avoid social situations more than I would like to.', dimension: 'social', options: likert },
    { id: 'a7', text: 'The pressure of a deadline or performance spikes my anxiety.', dimension: 'performance', options: likert },
    { id: 'a8', text: 'I notice anxiety when I care about doing something well.', dimension: 'performance', options: likert },
  ],
};

export const ANXIETY_PROFILE_INFO: Record<AnxietyProfileType, DimensionalResultInfo> = {
  somatic: {
    name: 'Body-first anxiety',
    tagline: 'Your body holds it before your mind names it.',
    summary: 'Your anxiety lives in sensation — chest, stomach, throat, jaw. This means somatic tools (breath, walking, cold water, movement) tend to work faster for you than thinking-based tools. Naming the sensation out loud often moves it.',
    strengths: ['Attuned to physical signals', 'Quick to notice when something is off'],
    shadow: ['Overriding body signals until they escalate', 'Missing the emotional story underneath'],
    affirmation: 'My body is the first to know. I listen to it before I override it.',
  },
  generalized: {
    name: 'Diffuse, free-floating anxiety',
    tagline: 'It arrives without an address — just background static.',
    summary: 'Your anxiety does not always have a clear trigger. This can be the hardest kind to work with because there is no discrete problem to solve. Daily regulation practices (sleep, sunlight, structured mornings, limited news) often help more than any single conversation.',
    strengths: ['Sensitive to subtle environmental cues', 'Often a creative, perceptive mind'],
    shadow: ['Catastrophizing without evidence', 'Mistaking background anxiety for reality'],
    affirmation: 'Not every feeling is a fact. I care for the baseline.',
  },
  social: {
    name: 'Social anxiety',
    tagline: 'The gaze of others is where your system tightens.',
    summary: 'You feel safer in small, trusted circles than in big crowds or public scrutiny. This is not a flaw — many of the most thoughtful people share this wiring. Gentle, graded exposure plus a pre-planned exit strategy often helps more than forcing yourself through.',
    strengths: ['Sensitive to social nuance', 'Deep, loyal relationships'],
    shadow: ['Over-reading faces as judgment', 'Avoiding opportunity because of the social cost'],
    affirmation: 'I care how I land with others. That care does not have to become fear.',
  },
  performance: {
    name: 'Performance anxiety',
    tagline: 'Your anxiety rises with the stakes.',
    summary: 'You feel tension most when you care about the outcome — presenting, competing, delivering. This is a sign of investment, not weakness. The same adrenaline that fuels the anxiety fuels the performance — reframing it as aliveness rather than threat often shifts things.',
    strengths: ['High internal standards', 'Genuinely engaged with what you do'],
    shadow: ['Burning out from chronic pressure', 'Avoiding visibility because of the cost'],
    affirmation: 'The nerves are proof I care. I channel them — I do not let them drive.',
  },
};

// ---------------------------------------------------------------
// 2. Leadership Style
// ---------------------------------------------------------------
export type LeadershipStyle = 'visionary' | 'servant' | 'commander' | 'coach';

export const leadershipQuiz: QuizDefinition = {
  id: 'leadership-style-v1',
  type: 'extra-dimensional',
  title: 'Leadership Style',
  description: 'How do you lead when you are leading well? Four styles — each has a moment where it is the right one.',
  questions: [
    { id: 'l1', text: 'People follow me because I paint a vivid future they want to be part of.', dimension: 'visionary', options: likert },
    { id: 'l2', text: 'I would rather describe the mountain than hand out the map.', dimension: 'visionary', options: likert },
    { id: 'l3', text: 'My job as a leader is to remove obstacles so my team can do their best work.', dimension: 'servant', options: likert },
    { id: 'l4', text: 'I credit my team publicly and absorb blame privately.', dimension: 'servant', options: likert },
    { id: 'l5', text: 'In a crisis, I expect to make the call and have the team follow.', dimension: 'commander', options: likert },
    { id: 'l6', text: 'Clear authority and decisive action matter more than wide consultation.', dimension: 'commander', options: likert },
    { id: 'l7', text: 'I see my people before I see the task they are doing.', dimension: 'coach', options: likert },
    { id: 'l8', text: 'I get the most joy from watching someone I mentored grow into their next role.', dimension: 'coach', options: likert },
  ],
};

export const LEADERSHIP_INFO: Record<LeadershipStyle, DimensionalResultInfo> = {
  visionary: {
    name: 'Visionary',
    tagline: 'You lead by naming a future people want to join.',
    summary: 'You galvanize. People work harder for your vision than for any paycheck. Your edge sharpens when you pair with a deeply operational deputy; it dulls when you are expected to manage day-to-day without that partner.',
    strengths: ['Painting vivid futures', 'Inspiring disproportionate effort', 'Spotting pattern years before others'],
    shadow: ['Under-investing in execution details', 'Moving the vision so often the team loses trust'],
    affirmation: 'A vision without an operator is a hallucination. I lead in pairs.',
  },
  servant: {
    name: 'Servant',
    tagline: 'You lead by removing the obstacles in front of others.',
    summary: 'You see leadership as a support role. Your team becomes more capable under you — you multiply, not concentrate. You flourish in cultures that measure team outcomes, not individual heroics. You struggle when you are in a room that only rewards self-promotion.',
    strengths: ['Growing people beyond their hiring level', 'Building deep trust', 'Resilience under fire'],
    shadow: ['Taking blame that is not yours', 'Being invisible in rooms that reward visibility'],
    affirmation: 'Lifting others is leadership. I also claim what I built.',
  },
  commander: {
    name: 'Commander',
    tagline: 'You lead by deciding — quickly, clearly, accountably.',
    summary: 'You are the person others want in the room when the stakes are high and someone has to call it. Your edge is momentum; your risk is bulldozing. The best commanders mature by learning when to slow down and ask — not just order.',
    strengths: ['Decisiveness under pressure', 'Clarity of hierarchy and authority', 'Bias toward action'],
    shadow: ['Mistaking quiet for agreement', 'Cutting off input before it arrives'],
    affirmation: 'Fast is a muscle. Patience is also a muscle. I train both.',
  },
  coach: {
    name: 'Coach',
    tagline: 'You lead by developing the person in front of you.',
    summary: 'You care about the human before the output — and paradoxically, this produces better output over time. Coaches build the leaders of the next generation. Your risk is under-investing in the task itself; pair with a strong delivery partner who makes the short-term numbers hit.',
    strengths: ['Reading people accurately', 'Patient feedback over time', 'Legacy impact — your former reports run things'],
    shadow: ['Over-coaching the wrong person', 'Avoiding accountability conversations'],
    affirmation: 'I grow people. I also hold them to what we agreed.',
  },
};

// ---------------------------------------------------------------
// 3. Productivity Style
// ---------------------------------------------------------------
export type ProductivityStyle = 'deep-worker' | 'sprinter' | 'connector' | 'organizer';

export const productivityQuiz: QuizDefinition = {
  id: 'productivity-style-v1',
  type: 'extra-dimensional',
  title: 'Productivity Style',
  description: 'What kind of work-rhythm makes you most effective? Four styles with different optimal environments.',
  questions: [
    { id: 'p1', text: 'I do my best work in long, uninterrupted blocks — a full morning, not half an hour.', dimension: 'deep-worker', options: likert },
    { id: 'p2', text: 'Context-switching costs me more than the switch itself would suggest.', dimension: 'deep-worker', options: likert },
    { id: 'p3', text: 'I work in intense sprints followed by real recovery — not at steady pace.', dimension: 'sprinter', options: likert },
    { id: 'p4', text: 'Deadlines focus me; open-ended time makes me drift.', dimension: 'sprinter', options: likert },
    { id: 'p5', text: 'Most of my output happens through conversations with other people.', dimension: 'connector', options: likert },
    { id: 'p6', text: 'I think best when I am talking, not alone.', dimension: 'connector', options: likert },
    { id: 'p7', text: 'I feel calmest when my system is tidy — email, calendar, files, tasks.', dimension: 'organizer', options: likert },
    { id: 'p8', text: 'A good system that runs itself is worth more than a burst of effort.', dimension: 'organizer', options: likert },
  ],
};

export const PRODUCTIVITY_INFO: Record<ProductivityStyle, DimensionalResultInfo> = {
  'deep-worker': {
    name: 'Deep Worker',
    tagline: 'Long quiet mornings; nothing interrupted.',
    summary: 'Your output is the output of uninterrupted attention. Protect it — it is the scarce resource in your life. Most knowledge work you do in a 30-minute window would be better done in a 2-hour one.',
    strengths: ['Capacity for hard, unglamorous thinking', 'High-quality output in narrow domains'],
    shadow: ['Ignoring admin until it compounds', 'Underestimating the value of quick check-ins'],
    affirmation: 'My deep hours are not optional. I defend them.',
  },
  sprinter: {
    name: 'Sprinter',
    tagline: 'Intensity then recovery. Not steady pace.',
    summary: 'You move in bursts. 2-3 days flat out, then a day off. You do 60% of your output in 20% of your hours. The mistake is trying to make yourself "consistent" — you are not, and that is not a flaw. Build the cycles you actually need.',
    strengths: ['Breakthrough energy when the stakes are real', 'Resilience under deadline'],
    shadow: ['Burning out before the recovery arrives', 'Ignoring maintenance work that requires steadiness'],
    affirmation: 'My rhythm is a cycle, not a line. I honour both halves.',
  },
  connector: {
    name: 'Connector',
    tagline: 'Your work happens in the room, between people.',
    summary: 'You process through conversation. You close deals, align teams, produce ideas through dialogue. Isolated deep work is not your natural habitat — and roles that force it make you feel wrong. You belong in work that rewards the relational surface.',
    strengths: ['Building trust fast', 'Producing through conversation', 'Reading rooms'],
    shadow: ['Avoiding solo work that needs doing', 'Scheduling yourself into exhaustion'],
    affirmation: 'Talking is working — when it is the right conversation.',
  },
  organizer: {
    name: 'Organizer',
    tagline: 'Systems that outlast their author.',
    summary: 'You are calmest when the system is clean. You build the infrastructure others quietly depend on. Your risk is over-polishing the structure and under-shipping the work the structure exists to serve. Make the system; then use it hard.',
    strengths: ['Durable systems', 'Low-drama delivery', 'Institutional memory'],
    shadow: ['Polishing past the point of diminishing return', 'Mistaking organized for productive'],
    affirmation: 'Structure serves shipping. I ship.',
  },
};

// ---------------------------------------------------------------
// 4. Relationship Readiness
// ---------------------------------------------------------------
export type RelationshipReadiness = 'ready' | 'healing' | 'avoiding' | 'rushing';

export const relationshipReadinessQuiz: QuizDefinition = {
  id: 'relationship-readiness-v1',
  type: 'extra-dimensional',
  title: 'Relationship Readiness',
  description: 'A reflective look at where you are in your readiness for partnership. No wrong answer — just a mirror.',
  questions: [
    { id: 'r1', text: 'I know what I want in a partner and can name it without apology.', dimension: 'ready', options: likert },
    { id: 'r2', text: 'I know what I do not want, and I trust myself to walk away when I see it.', dimension: 'ready', options: likert },
    { id: 'r3', text: 'I am still carrying wounds from my last relationship that need tending first.', dimension: 'healing', options: likert },
    { id: 'r4', text: 'When I imagine dating right now, I notice a tired feeling, not an excited one.', dimension: 'healing', options: likert },
    { id: 'r5', text: 'I often feel relieved when a date does not go well — I am off the hook.', dimension: 'avoiding', options: likert },
    { id: 'r6', text: 'I find reasons to end promising connections before they deepen.', dimension: 'avoiding', options: likert },
    { id: 'r7', text: 'I move quickly in new relationships — intensity before knowing.', dimension: 'rushing', options: likert },
    { id: 'r8', text: 'I often commit before I have fully decided the person fits me.', dimension: 'rushing', options: likert },
  ],
};

export const RELATIONSHIP_READINESS_INFO: Record<RelationshipReadiness, DimensionalResultInfo> = {
  ready: {
    name: 'Open and grounded',
    tagline: 'You are ready — and that is rare.',
    summary: 'You know what you want, what you do not want, and you trust your own read. You are in the rare stance where a relationship could be an addition, not a rescue. Be patient — the match you are looking for does not need to be forced.',
    strengths: ['Clear self-knowledge', 'Trust in your own no', 'Low desperation'],
    shadow: ['Over-filtering from a standard of perfect', 'Missing warmth because you prioritize certainty'],
    affirmation: 'I am complete. I choose, rather than settle.',
  },
  healing: {
    name: 'Still healing',
    tagline: 'Not yet — and that is wisdom.',
    summary: 'Something in you still needs tending. That does not disqualify you from connection, but it does mean the work with yourself is the work right now. Rushing into someone else\'s life while you are still sorting your own usually costs both people.',
    strengths: ['Self-honesty', 'Willingness to feel what hurts'],
    shadow: ['Mistaking a new person for healing', 'Staying in the wound longer than serves you'],
    affirmation: 'My healing is not a detour. It is the path.',
  },
  avoiding: {
    name: 'Protective distance',
    tagline: 'You are keeping connection at arm\'s length, often for good reasons.',
    summary: 'You are not wrong to be careful. But notice: are you protecting from a real threat, or from an old story? The risk is building a life so safe it is also hollow. A trusted therapist or friend can often see the shape of it more clearly than you can.',
    strengths: ['Self-protective instincts that have kept you safe', 'Independence'],
    shadow: ['Pre-emptive withdrawal', 'Self-fulfilling stories about being unlovable'],
    affirmation: 'Protection was earned. It does not have to be permanent.',
  },
  rushing: {
    name: 'Moving too fast',
    tagline: 'You fuse before you know.',
    summary: 'You feel the intensity and move quickly — commit early, fall hard. This often reflects a nervous system that calms down when a new relationship is locked in. The work is learning to tolerate the early-stage uncertainty, which is where real knowing happens.',
    strengths: ['Openness to connection', 'Capacity for deep affection'],
    shadow: ['Mistaking intensity for fit', 'Committing before fully seeing the person'],
    affirmation: 'I slow down at the start. The real fit shows itself in months, not weeks.',
  },
};

// ---------------------------------------------------------------
// 5. Wellness Type
// ---------------------------------------------------------------
export type WellnessType = 'athlete' | 'healer' | 'contemplative' | 'balanced';

export const wellnessTypeQuiz: QuizDefinition = {
  id: 'wellness-type-v1',
  type: 'extra-dimensional',
  title: 'Wellness Type',
  description: 'What shape does caring for yourself take when it is working? Four patterns, each valid.',
  questions: [
    { id: 'w1', text: 'I feel best after a hard workout — sweat, muscle fatigue, heart rate.', dimension: 'athlete', options: likert },
    { id: 'w2', text: 'My body wants to be pushed; rest alone does not regulate me.', dimension: 'athlete', options: likert },
    { id: 'w3', text: 'I regulate through slow, restorative things — baths, tea, acupuncture, massage.', dimension: 'healer', options: likert },
    { id: 'w4', text: 'Someone else\'s hands on my body (within safe touch) calm me deeply.', dimension: 'healer', options: likert },
    { id: 'w5', text: 'Meditation, silence, or prayer is where I actually reset.', dimension: 'contemplative', options: likert },
    { id: 'w6', text: 'What I need most in a hard week is solitude, not stimulation.', dimension: 'contemplative', options: likert },
    { id: 'w7', text: 'I am at my best with a mix — movement plus stillness plus social.', dimension: 'balanced', options: likert },
    { id: 'w8', text: 'If I lean too far into one practice, another part of me suffers.', dimension: 'balanced', options: likert },
  ],
};

export const WELLNESS_TYPE_INFO: Record<WellnessType, DimensionalResultInfo> = {
  athlete: {
    name: 'The Athlete',
    tagline: 'You regulate through effort — sweat, strength, motion.',
    summary: 'Your nervous system comes online through physical output. Stillness alone does not calm you — you need the heart rate up first. Prioritize hard training as non-negotiable; without it, other tools work less well for you.',
    strengths: ['Resilience built through consistent effort', 'Body confidence', 'Mental clarity after movement'],
    shadow: ['Using intensity to bypass emotion', 'Over-training into injury'],
    affirmation: 'Movement is my medicine. I also rest deliberately.',
  },
  healer: {
    name: 'The Healer',
    tagline: 'You regulate through slow, restorative care.',
    summary: 'Your body responds to softness — warmth, slowness, skilled touch. You are often the person others come to when they need rest; make sure you also receive what you give. Book the massage, run the bath, do not feel guilty.',
    strengths: ['Capacity for deep restoration', 'Sensitivity to subtle body signals', 'Natural nurturer'],
    shadow: ['Collapsing into passivity', 'Over-giving care without receiving'],
    affirmation: 'Receiving care is not luxury. It is maintenance.',
  },
  contemplative: {
    name: 'The Contemplative',
    tagline: 'You regulate through silence and solitude.',
    summary: 'Your repair happens inwardly. Social stimulation, even good stimulation, costs you energy; time alone with a practice (meditation, prayer, long walks) is the deepest restoration. Build your life around enough solitude or pay the price in exhaustion.',
    strengths: ['Depth of inner life', 'Ability to hold complexity without overreacting', 'Clear moral compass'],
    shadow: ['Over-isolating in the name of solitude', 'Avoiding action by calling it reflection'],
    affirmation: 'Solitude is my nutrition. I also show up for the world.',
  },
  balanced: {
    name: 'The Balanced',
    tagline: 'A mix of movement, stillness, and social — all three.',
    summary: 'You are not optimized for any one thing; you need all three. When one is missing, the others cannot compensate. Design a week that includes all three — you will outperform anyone who over-indexes on one.',
    strengths: ['Flexibility', 'Durable long-term wellness', 'Recovery from most setbacks'],
    shadow: ['Spreading too thin across practices', 'Never mastering one deeply'],
    affirmation: 'My balance is my practice. I tend all three legs of the stool.',
  },
};

// ---------------------------------------------------------------
// Combined export — mirrors PART2 shape
// ---------------------------------------------------------------
export const EXTRA_QUIZZES_PART3 = {
  'anxiety-profile-v1':       { quiz: anxietyProfileQuiz,       dimensions: ['somatic','generalized','social','performance'] as const,            info: ANXIETY_PROFILE_INFO,       emoji: '🌫️' },
  'leadership-style-v1':      { quiz: leadershipQuiz,           dimensions: ['visionary','servant','commander','coach'] as const,                  info: LEADERSHIP_INFO,            emoji: '🧭' },
  'productivity-style-v1':    { quiz: productivityQuiz,         dimensions: ['deep-worker','sprinter','connector','organizer'] as const,            info: PRODUCTIVITY_INFO,          emoji: '⚙️' },
  'relationship-readiness-v1':{ quiz: relationshipReadinessQuiz,dimensions: ['ready','healing','avoiding','rushing'] as const,                     info: RELATIONSHIP_READINESS_INFO,emoji: '💞' },
  'wellness-type-v1':         { quiz: wellnessTypeQuiz,         dimensions: ['athlete','healer','contemplative','balanced'] as const,              info: WELLNESS_TYPE_INFO,         emoji: '🌿' },
};

// Silence lint for the two reversed-likert arrays — kept for future
// balanced-scale questions if we need them.
void likertRev;
