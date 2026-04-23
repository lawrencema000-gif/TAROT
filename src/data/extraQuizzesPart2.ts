// Sprint 7 — 10 additional quizzes extending extraQuizzes.ts.
//
// Same Likert 1-5 + dimensional-result pattern. Exported alongside
// EXTRA_QUIZZES to keep the runner logic unchanged.

import type { QuizDefinition } from '../types';
import type { DimensionalResultInfo } from './extraQuizzes';

const likert = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

// 1. Jungian Cognitive Functions ----------------------------------
export type JungianFunc = 'Ni' | 'Ne' | 'Si' | 'Se' | 'Ti' | 'Te' | 'Fi' | 'Fe';

export const jungianQuiz: QuizDefinition = {
  id: 'jungian-functions-v1',
  type: 'extra-dimensional',
  title: 'Jungian Cognitive Functions',
  description: 'MBTI letters tell you the preference. Jungian functions tell you the *stack* — which mental process you lead with. Twelve questions to find your dominant function.',
  questions: [
    { id: 'ni1', text: 'I often know what someone is going to say before they finish.', dimension: 'Ni', options: likert },
    { id: 'ni2', text: 'I get single, clear visions of how things will unfold long-term.', dimension: 'Ni', options: likert },
    { id: 'ne1', text: 'My mind jumps between unrelated ideas and finds connections others miss.', dimension: 'Ne', options: likert },
    { id: 'ne2', text: 'I thrive on brainstorming many possibilities — more than executing one.', dimension: 'Ne', options: likert },
    { id: 'si1', text: 'I remember sensory details (smells, textures, exact phrases) from long ago.', dimension: 'Si', options: likert },
    { id: 'si2', text: 'I rely on "this is how we do it" traditions and proven processes.', dimension: 'Si', options: likert },
    { id: 'se1', text: 'I\'m sharp and present in my body — fast reflexes, direct engagement with the physical world.', dimension: 'Se', options: likert },
    { id: 'ti1', text: 'I quietly build logical frameworks in my head and test every claim against them.', dimension: 'Ti', options: likert },
    { id: 'te1', text: 'I organise the external world — projects, people, systems — into efficient structures.', dimension: 'Te', options: likert },
    { id: 'fi1', text: 'My values are deeply felt and non-negotiable, even if I don\'t explain them.', dimension: 'Fi', options: likert },
    { id: 'fe1', text: 'I read a group\'s emotional weather fast and adjust to keep harmony.', dimension: 'Fe', options: likert },
    { id: 'fe2', text: 'I need others to be okay before I can be okay.', dimension: 'Fe', options: likert },
  ],
};

export const JUNGIAN_INFO: Record<JungianFunc, DimensionalResultInfo> = {
  Ni: { name: 'Introverted Intuition (Ni)', tagline: 'Inner vision — sees the single thread through the tangle.', summary: 'Ni-dominants live in a single internal vision of how things will unfold. You often "just know" where something is heading. INFJs and INTJs lead with Ni.', strengths: ['Long-range foresight', 'Single-focus vision', 'Pattern synthesis'], shadow: ['Stubborn attachment to one interpretation', 'Missing present-moment data', 'Lonely in the private vision'], affirmation: 'I see what I see — and I check it against what is actually here.' },
  Ne: { name: 'Extraverted Intuition (Ne)', tagline: 'Outer possibility — many threads, all tugging at once.', summary: 'Ne sees possibilities everywhere. You jump between ideas, synthesise broad patterns, and think in "what if." ENTPs and ENFPs lead with Ne.', strengths: ['Ideation', 'Connection-making', 'Adaptability'], shadow: ['Finishing nothing', 'Restlessness', 'Novelty addiction'], affirmation: 'My hundred ideas are real — I choose one and see what it becomes.' },
  Si: { name: 'Introverted Sensing (Si)', tagline: 'Memory palace — the body of past experience.', summary: 'Si stores exact sensory detail of what happened before. You learn from "last time I did this" and you trust proven methods. ISTJs and ISFJs lead with Si.', strengths: ['Reliability', 'Detailed memory', 'Tradition-keeping'], shadow: ['Resistance to new methods', 'Nostalgia as strategy', 'Bodily contraction under novelty'], affirmation: 'I honour what I have learned — and I stay open to what my body hasn\'t felt yet.' },
  Se: { name: 'Extraverted Sensing (Se)', tagline: 'Present moment — sharp, alive, right here.', summary: 'Se is fully present in the physical now. Sharp reflexes, aesthetic intelligence, performance under pressure. ESTPs and ESFPs lead with Se.', strengths: ['Presence', 'Physical skill', 'Improvisation'], shadow: ['Impulse chasing', 'Missing long-range consequences', 'Restless without stimulation'], affirmation: 'I am here now — and I can also plan for a future I won\'t feel until it arrives.' },
  Ti: { name: 'Introverted Thinking (Ti)', tagline: 'Internal logic — "does this actually make sense?"', summary: 'Ti builds private frameworks and tests every claim against them. Truth-seeking through precision. INTPs and ISTPs lead with Ti.', strengths: ['Precision', 'Analytical rigour', 'Sceptical independence'], shadow: ['Over-analysis', 'Coldness', 'Refusing to commit until the framework is perfect'], affirmation: 'My rigour serves truth — and truth does not require everything to be resolved first.' },
  Te: { name: 'Extraverted Thinking (Te)', tagline: 'Systems — "how do we actually execute this?"', summary: 'Te organises the external world into efficient structures. Projects ship, teams deliver, and the messy becomes tidy. ENTJs and ESTJs lead with Te.', strengths: ['Execution', 'Organisation', 'Decisiveness'], shadow: ['Running over softer inputs', 'Mistaking efficient for right', 'Impatience'], affirmation: 'I organise the world toward outcomes — and I slow down when outcomes need something I can\'t organise.' },
  Fi: { name: 'Introverted Feeling (Fi)', tagline: 'Inner values — quiet, deep, non-negotiable.', summary: 'Fi is your internal compass of values. You know what is right for you even if you can\'t explain it. INFPs and ISFPs lead with Fi.', strengths: ['Integrity', 'Authenticity', 'Deep personal values'], shadow: ['Feeling misunderstood', 'Inability to explain your compass to others', 'Rigidity when your values feel threatened'], affirmation: 'My values are mine — I walk them into the world without needing everyone to share them.' },
  Fe: { name: 'Extraverted Feeling (Fe)', tagline: 'Shared harmony — the emotional weather of the room.', summary: 'Fe reads group emotional dynamics fast and works for harmony. Your decisions include everyone\'s feelings. ENFJs and ESFJs lead with Fe.', strengths: ['Emotional attunement', 'Group cohesion', 'Warm social leadership'], shadow: ['Losing self in others\' emotions', 'Avoiding necessary conflict', 'Exhaustion from emotional labour'], affirmation: 'I tend the room — and I remember my own feelings count in the weather too.' },
};

// 2. Love Styles (Esther Perel-informed) --------------------------
export type LoveStyle = 'eros' | 'philia' | 'storge' | 'agape';

export const loveStylesQuiz: QuizDefinition = {
  id: 'love-styles-v1',
  type: 'extra-dimensional',
  title: 'Love Styles',
  description: 'Four ancient ways of loving, from the Greeks: Eros (passion), Philia (friendship), Storge (family/familiar), Agape (unconditional). Twelve questions to find your dominant style.',
  questions: [
    { id: 'er1', text: 'When I fall, I fall hard — physical, passionate, consuming.', dimension: 'eros', options: likert },
    { id: 'er2', text: 'Sensual connection is essential for me to feel loved.', dimension: 'eros', options: likert },
    { id: 'er3', text: 'I believe in "the one" and I\'m willing to wait.', dimension: 'eros', options: likert },
    { id: 'ph1', text: 'The best relationships are built on deep friendship first.', dimension: 'philia', options: likert },
    { id: 'ph2', text: 'I need to respect someone as a person before I can love them as a partner.', dimension: 'philia', options: likert },
    { id: 'ph3', text: 'Shared values and conversation feed me more than grand romance.', dimension: 'philia', options: likert },
    { id: 'st1', text: 'Love grows slowly, through familiarity, not lightning strikes.', dimension: 'storge', options: likert },
    { id: 'st2', text: 'My best relationships began as friendships that gradually deepened.', dimension: 'storge', options: likert },
    { id: 'st3', text: 'Comfortable, steady, familiar love is what I actually want.', dimension: 'storge', options: likert },
    { id: 'ag1', text: 'I love even when I don\'t get love back — it\'s a choice, not a transaction.', dimension: 'agape', options: likert },
    { id: 'ag2', text: 'My love is at its best when it expects nothing.', dimension: 'agape', options: likert },
    { id: 'ag3', text: 'I tend to see the divine or sacred in those I love.', dimension: 'agape', options: likert },
  ],
};

export const LOVE_STYLES_INFO: Record<LoveStyle, DimensionalResultInfo> = {
  eros: { name: 'Eros', tagline: 'Passion, desire, the sacred fire.', summary: 'Your love is passionate, embodied, consuming. When you love, you love with your whole body and soul. This is the love of poets and lovers — electric, dangerous, life-giving.', strengths: ['Deep passion', 'Embodied presence', 'Willingness to feel fully'], shadow: ['Intensity that scares partners', 'Dependence on the "spark"', 'Shorter-lasting love if not balanced with other styles'], affirmation: 'My fire is a gift — and I tend it for the long road, not just the spark.' },
  philia: { name: 'Philia', tagline: 'Love between equals — deep friendship.', summary: 'Your love is built on respect, conversation, shared values, intellectual partnership. You want to be with someone you genuinely admire and who admires you. This is the love that ages best.', strengths: ['Durability', 'Mutual respect', 'Shared intellectual life'], shadow: ['Missing the erotic spark', 'Keeping relationships "safe" when they need heat', 'Treating a romantic partner like a friend alone'], affirmation: 'My friendship is the foundation — and I let the fire live alongside it.' },
  storge: { name: 'Storge', tagline: 'Familiar love — grows slowly, roots deep.', summary: 'Your love is the love of family, of gradual familiarity, of hearth and home. You tend to fall for people who become familiar to you over time — best friends who slowly become more, neighbours, colleagues.', strengths: ['Stability', 'Deep attachment', 'Trustworthy partnership'], shadow: ['Mistaking comfort for love', 'Staying too long in what\'s familiar', 'Risk-aversion around new connection'], affirmation: 'My love is the slow warmth — and I remember warmth can still surprise.' },
  agape: { name: 'Agape', tagline: 'Unconditional love — loving without demand.', summary: 'Your love does not depend on what you receive. You love as an act of giving, often finding the sacred in your partner. At best this is transcendent; at worst, one-sided.', strengths: ['Unconditional giving', 'Capacity for spiritual connection', 'Resilience through hard times'], shadow: ['One-sided relationships', 'Martyrdom', 'Not receiving what you need'], affirmation: 'I give love freely — and I also deserve to be loved back.' },
};

// 3. Parenting Style ----------------------------------------------
export type ParentingStyle = 'authoritative' | 'authoritarian' | 'permissive' | 'neglectful';

export const parentingQuiz: QuizDefinition = {
  id: 'parenting-style-v1',
  type: 'extra-dimensional',
  title: 'Parenting Style',
  description: 'Baumrind\'s four parenting styles crossed with modern research. Twelve questions to surface your default approach, whether you\'re parenting actual kids or metaphorically parenting people at work.',
  questions: [
    { id: 'av1', text: 'I set firm rules but explain the reasoning behind them.', dimension: 'authoritative', options: likert },
    { id: 'av2', text: 'I listen to disagreement and sometimes change my mind.', dimension: 'authoritative', options: likert },
    { id: 'av3', text: 'I hold high standards and offer warm support to reach them.', dimension: 'authoritative', options: likert },
    { id: 'ar1', text: 'Rules are rules — I shouldn\'t have to explain them.', dimension: 'authoritarian', options: likert },
    { id: 'ar2', text: 'Respect for authority is non-negotiable.', dimension: 'authoritarian', options: likert },
    { id: 'ar3', text: 'Discipline should be swift and consistent.', dimension: 'authoritarian', options: likert },
    { id: 'pm1', text: 'I avoid conflict by letting most things slide.', dimension: 'permissive', options: likert },
    { id: 'pm2', text: 'I want to be liked more than I want to be obeyed.', dimension: 'permissive', options: likert },
    { id: 'pm3', text: 'Rules feel like barriers to a good relationship.', dimension: 'permissive', options: likert },
    { id: 'ng1', text: 'I let people figure things out on their own.', dimension: 'neglectful', options: likert },
    { id: 'ng2', text: 'I don\'t have much energy to follow up on things consistently.', dimension: 'neglectful', options: likert },
    { id: 'ng3', text: 'I trust people to manage themselves without my involvement.', dimension: 'neglectful', options: likert },
  ],
};

export const PARENTING_INFO: Record<ParentingStyle, DimensionalResultInfo> = {
  authoritative: { name: 'Authoritative', tagline: 'High warmth + high structure — research gold standard.', summary: 'You set firm boundaries AND explain them. You listen AND decide. Research consistently names this as the style that produces the most resilient children and high-functioning teams. It\'s also the hardest — it requires both warmth and spine.', strengths: ['Balance of support and standards', 'Builds secure attachment', 'Raises resilience'], shadow: ['Exhausting to sustain', 'Can slip into authoritarian under stress', 'High self-awareness required daily'], affirmation: 'I hold the line and I hold the hand. Both at once, because both matter.' },
  authoritarian: { name: 'Authoritarian', tagline: 'High structure + low warmth — demands obedience.', summary: 'You set rules and expect compliance. Obedience matters more than understanding. Short-term this produces compliance; long-term it produces kids/teams who either rebel or become anxious pleasers. Works in genuine crisis. Less in daily life.', strengths: ['Clear expectations', 'Fast compliance under crisis', 'Reliability'], shadow: ['Rebellion or fragility in those you raise', 'Relationships become transactional', 'Loneliness in the role'], affirmation: 'My firmness is a gift — and I soften it without losing it, because warmth doesn\'t weaken the rule.' },
  permissive: { name: 'Permissive', tagline: 'High warmth + low structure — avoids conflict.', summary: 'You prioritize closeness over rules. You want to be liked. Kids raised this way often struggle with boundaries and self-regulation because no one taught them the boundary from outside.', strengths: ['Warm presence', 'Easy rapport', 'Non-authoritarian'], shadow: ['Missing structure those you love actually need', 'Resentment building when you finally have to enforce', 'Their self-regulation underdeveloped'], affirmation: 'My love includes holding the line — saying no is also love.' },
  neglectful: { name: 'Neglectful', tagline: 'Low warmth + low structure — absent.', summary: 'You are not really present. You have your own stuff. You let them figure it out. This is usually not intentional cruelty — it\'s overwhelm, depression, workload, or one\'s own unresolved trauma. It has the worst developmental outcomes of the four styles.', strengths: ['Independence they develop early', 'Low conflict (nothing to conflict about)'], shadow: ['Deep loneliness in those you raise', 'Attachment wounds that echo for life', 'Pattern may be inherited'], affirmation: 'Being present is the first gift — I show up for myself so I can show up for them.' },
};

// 4. Learning Style (VARK) ----------------------------------------
export type VarkStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';

export const learningQuiz: QuizDefinition = {
  id: 'learning-style-v1',
  type: 'extra-dimensional',
  title: 'Learning Style (VARK)',
  description: 'Four ways we learn: Visual, Auditory, Reading/Writing, Kinesthetic. Twelve questions to reveal your preferred input channel so you can study, work, and grow more effectively.',
  questions: [
    { id: 'vs1', text: 'Diagrams, charts, and mind maps help me understand better than text.', dimension: 'visual', options: likert },
    { id: 'vs2', text: 'I visualise what I read — I have to "see" it to get it.', dimension: 'visual', options: likert },
    { id: 'vs3', text: 'I remember where I saw something on a page long after.', dimension: 'visual', options: likert },
    { id: 'au1', text: 'I learn best when I can hear someone explain it.', dimension: 'auditory', options: likert },
    { id: 'au2', text: 'Podcasts and audiobooks stick with me more than reading.', dimension: 'auditory', options: likert },
    { id: 'au3', text: 'I think out loud — talking helps me figure things out.', dimension: 'auditory', options: likert },
    { id: 're1', text: 'I prefer to read about something rather than be shown.', dimension: 'reading', options: likert },
    { id: 're2', text: 'I take detailed written notes to really learn.', dimension: 'reading', options: likert },
    { id: 're3', text: 'Well-written documents teach me best.', dimension: 'reading', options: likert },
    { id: 'ki1', text: 'I learn best by doing it myself, hands-on.', dimension: 'kinesthetic', options: likert },
    { id: 'ki2', text: 'I fidget, pace, or use my body while thinking.', dimension: 'kinesthetic', options: likert },
    { id: 'ki3', text: 'Trial and error is my preferred way to figure things out.', dimension: 'kinesthetic', options: likert },
  ],
};

export const VARK_INFO: Record<VarkStyle, DimensionalResultInfo> = {
  visual: { name: 'Visual', tagline: 'You learn through pictures, diagrams, spatial layouts.', summary: 'You think in pictures. Charts, mind maps, infographics, and spatial arrangements are how you process information. Good notes for you are colour-coded, visual, hierarchical.', strengths: ['Pattern recognition', 'Spatial intelligence', 'Mental imagery'], shadow: ['Lose interest in dense plain text', 'Disoriented when information is purely verbal'], affirmation: 'I think in pictures — I build diagrams of what others explain in sentences.' },
  auditory: { name: 'Auditory', tagline: 'You learn through sound, conversation, listening.', summary: 'You learn by hearing. Lectures, podcasts, conversation, and thinking-out-loud are your best tools. Reading aloud helps you. Silent rooms slow you down.', strengths: ['Memory for dialogue', 'Rhythmic thinking', 'Listening comprehension'], shadow: ['Hard to focus in silence', 'Written-only material feels inert', 'Zoning out in visual-heavy environments'], affirmation: 'I learn through the voice — I read aloud, talk it through, listen carefully.' },
  reading: { name: 'Reading/Writing', tagline: 'You learn through written words.', summary: 'Text is your medium. Books, articles, written notes, and essays are how you build understanding. You prefer reading the manual to being shown.', strengths: ['Strong writing skills', 'Precision with language', 'Systematic study'], shadow: ['Can miss tactile/physical nuance', 'Intellectualise rather than embody', 'Slow to trust what is not written down'], affirmation: 'Text is my home — and I also step into the body and the room when the room has something to teach me.' },
  kinesthetic: { name: 'Kinesthetic', tagline: 'You learn by doing — body-first.', summary: 'You learn through doing. Experiments, simulations, lab work, building things. You think with your hands. Instructions help; doing it once helps more.', strengths: ['Deep muscle memory', 'Rapid iteration', 'Hands-on mastery'], shadow: ['Impatient with theory', 'Struggle in abstract-only environments', 'Sometimes skip necessary foundations to just start'], affirmation: 'My hands know — I learn by moving, making, failing, and moving again.' },
};

// 5. Empath vs HSP ------------------------------------------------
export type EmpathType = 'empath' | 'hsp' | 'both' | 'neither';

export const empathQuiz: QuizDefinition = {
  id: 'empath-hsp-v1',
  type: 'extra-dimensional',
  title: 'Empath vs. Highly Sensitive Person',
  description: 'The words "empath" and "HSP" are often used interchangeably but describe different phenomena. Twelve questions to help you see which one fits (you might be neither, one, or both).',
  questions: [
    { id: 'em1', text: 'I feel other people\'s emotions in my body as if they were my own.', dimension: 'empath', options: likert },
    { id: 'em2', text: 'I can walk into a room and feel the emotional charge before anyone speaks.', dimension: 'empath', options: likert },
    { id: 'em3', text: 'Being around people in pain exhausts me even if I don\'t interact much.', dimension: 'empath', options: likert },
    { id: 'hs1', text: 'Loud sounds, bright lights, strong smells overwhelm me more than most.', dimension: 'hsp', options: likert },
    { id: 'hs2', text: 'I notice subtleties (shifts in tone, small changes in environment) that others miss.', dimension: 'hsp', options: likert },
    { id: 'hs3', text: 'I need more alone time than average to regulate.', dimension: 'hsp', options: likert },
    { id: 'bt1', text: 'Crowded places are both emotionally heavy AND sensory overwhelming for me.', dimension: 'both', options: likert },
    { id: 'bt2', text: 'I need downtime after social events to recover fully.', dimension: 'both', options: likert },
    { id: 'bt3', text: 'Stories of others\' suffering can ruin my whole day.', dimension: 'both', options: likert },
    { id: 'nn1', text: 'Loud, crowded, emotionally intense situations energise me.', dimension: 'neither', options: likert },
    { id: 'nn2', text: 'I don\'t pick up on other people\'s moods until they tell me.', dimension: 'neither', options: likert },
    { id: 'nn3', text: 'I handle a lot of sensory input without needing recovery time.', dimension: 'neither', options: likert },
  ],
};

export const EMPATH_INFO: Record<EmpathType, DimensionalResultInfo> = {
  empath: { name: 'Empath', tagline: 'You absorb emotional fields, not just sensory input.', summary: 'Your core sensitivity is EMOTIONAL. You pick up other people\'s feelings and often carry them as your own. This is a gift and a burden. Learning to distinguish "mine" from "theirs" is the practice.', strengths: ['Deep attunement to others', 'Natural healer presence', 'Strong intuition about people'], shadow: ['Carrying other people\'s emotions home', 'Boundary confusion', 'Exhaustion from unprocessed emotional absorption'], affirmation: 'I feel what others feel — and I can return what isn\'t mine.' },
  hsp: { name: 'Highly Sensitive Person (HSP)', tagline: 'You process sensory input deeply.', summary: 'Your core sensitivity is SENSORY + INFORMATIONAL. You notice subtleties, process deeply, and get overwhelmed by high-stimulation environments. ~20% of people are HSPs. It\'s a neurological trait, not a flaw.', strengths: ['Depth of processing', 'Aesthetic sensitivity', 'Thoughtful decision-making'], shadow: ['Overwhelm in loud/bright environments', 'Need for recovery time', 'Easy to mislabel as "shy" or "anxious"'], affirmation: 'My nervous system needs what it needs — I design my life around what actually works for me.' },
  both: { name: 'Both Empath + HSP', tagline: 'Emotional absorption plus deep sensory processing.', summary: 'You have both traits. Emotional fields AND sensory environments hit you hard. This is a rich and demanding combination. Most "I\'m so exhausted after parties" people sit here.', strengths: ['Profound attunement', 'Artistic depth', 'Healing presence'], shadow: ['Deep exhaustion', 'Chronic overwhelm if you don\'t actively manage it', 'Life design must be careful'], affirmation: 'I am built for depth — I protect my rhythm so the depth keeps giving.' },
  neither: { name: 'Neither — Resilient Sensitivity', tagline: 'You\'re relatively resilient to emotional and sensory input.', summary: 'You\'re not highly sensitive in the empath or HSP sense. You handle emotional and sensory intensity well. This doesn\'t mean you don\'t care — it means you\'re not flooded by what floods others.', strengths: ['Resilience in high-stimulation environments', 'Less prone to overwhelm', 'Can be a stabiliser for more sensitive people'], shadow: ['Might underestimate what others are handling', 'Can be dismissive of sensitivity in others'], affirmation: 'My resilience is real — and I respect that others experience more than I feel.' },
};

// 6. Self-Compassion ----------------------------------------------
export type SelfCompassionType = 'self-kind' | 'self-judging' | 'mindful' | 'over-identified';

export const selfCompassionQuiz: QuizDefinition = {
  id: 'self-compassion-v1',
  type: 'extra-dimensional',
  title: 'Self-Compassion',
  description: 'Based on Kristin Neff\'s research. Twelve questions to measure how you actually treat yourself when you\'re struggling — and which direction you default to.',
  questions: [
    { id: 'sk1', text: 'When I fail, I\'m kind to myself about it.', dimension: 'self-kind', options: likert },
    { id: 'sk2', text: 'I give myself the care I\'d give a close friend in the same situation.', dimension: 'self-kind', options: likert },
    { id: 'sk3', text: 'During difficult times, I try to be gentle with myself.', dimension: 'self-kind', options: likert },
    { id: 'sj1', text: 'I\'m critical of my own flaws and inadequacies.', dimension: 'self-judging', options: likert },
    { id: 'sj2', text: 'When I notice negative things about myself, I tend to feel disappointed in who I am.', dimension: 'self-judging', options: likert },
    { id: 'sj3', text: 'I have a hard time tolerating what I dislike about myself.', dimension: 'self-judging', options: likert },
    { id: 'mn1', text: 'When difficult emotions arise, I try to stay balanced with them.', dimension: 'mindful', options: likert },
    { id: 'mn2', text: 'I try to see my situations with perspective when I\'m upset.', dimension: 'mindful', options: likert },
    { id: 'mn3', text: 'I observe my negative emotions without being swept by them.', dimension: 'mindful', options: likert },
    { id: 'oi1', text: 'When something painful happens, I tend to dramatise the situation.', dimension: 'over-identified', options: likert },
    { id: 'oi2', text: 'When I feel bad, I fixate on everything that\'s wrong.', dimension: 'over-identified', options: likert },
    { id: 'oi3', text: 'I get carried away by my feelings when I\'m struggling.', dimension: 'over-identified', options: likert },
  ],
};

export const SELF_COMPASSION_INFO: Record<SelfCompassionType, DimensionalResultInfo> = {
  'self-kind':    { name: 'Self-Kindness (dominant)', tagline: 'You default to treating yourself with care.', summary: 'You lead with gentleness toward yourself when things are hard. This is a developed skill — most people don\'t have it. Watch out for complacency: self-kindness isn\'t "no standards," it\'s care PLUS honesty.', strengths: ['Resilience', 'Emotional recovery', 'Modelling good self-care for others'], shadow: ['Occasional complacency', 'Can under-push yourself when pushing is right'], affirmation: 'I am on my own side — and I also hold high standards for who I am becoming.' },
  'self-judging': { name: 'Self-Judgment (dominant)', tagline: 'You default to harshness with yourself.', summary: 'You\'re quick to criticise yourself. This is the most common default. It\'s also the most effortful to change. Self-judgment feels like high standards but is actually self-abuse. The practice is learning to address the failure without attacking the self.', strengths: ['High standards', 'Self-awareness', 'Drive toward improvement'], shadow: ['Shame spiral', 'Burnout', 'Unable to recover from failure as fast as self-kind people'], affirmation: 'I can hold high standards without treating myself as a failure. Both are possible at once.' },
  mindful:        { name: 'Mindful (dominant)', tagline: 'You observe your feelings without drowning in them.', summary: 'You have developed the capacity to notice your suffering without being swept by it. This is the contemplative skill. Most people either drown in their emotions or suppress them — you\'re doing the third thing: staying with.', strengths: ['Emotional regulation', 'Wise perspective', 'Not reactive'], shadow: ['Can become over-detached', 'Sometimes observing becomes avoiding the feeling'], affirmation: 'I can be present with what hurts — and I still engage my life from where I am.' },
  'over-identified': { name: 'Over-Identified (dominant)', tagline: 'You get swept by difficult emotions.', summary: 'When hard feelings come, you drown in them. You can\'t separate "I am feeling bad" from "everything is bad." This is workable. The skill is called defusion or decentering — learning to observe the feeling instead of being the feeling.', strengths: ['Emotional intensity (when channelled right)', 'Rich inner life', 'Empathy for intense emotions in others'], shadow: ['Rumination', 'Crisis spiral', 'Hard to recover from setbacks'], affirmation: 'I am not the feeling. I am the one feeling the feeling — and I can watch it pass.' },
};

// 7. PHQ-2-style Depression Screener (clearly marked non-diagnostic)
export type PHQ2Result = 'low' | 'mild' | 'moderate' | 'seek-support';

export const phq2Quiz: QuizDefinition = {
  id: 'mood-screener-v1',
  type: 'extra-dimensional',
  title: 'Mood Check — 2-week screener',
  description: 'A short self-reflection based on the PHQ-2 questionnaire, commonly used in wellness screenings. Twelve questions reflecting on the last two weeks. NOT a diagnosis — if your score is high, please reach out to a professional. In crisis: text HOME to 741741 or call 988 (US).',
  questions: [
    { id: 'lw1', text: 'Over the last 2 weeks, I have felt down or depressed most days.', dimension: 'seek-support', options: likert },
    { id: 'lw2', text: 'Over the last 2 weeks, I have had little interest or pleasure in doing things.', dimension: 'seek-support', options: likert },
    { id: 'lw3', text: 'I have trouble sleeping, or I sleep too much, most nights.', dimension: 'moderate', options: likert },
    { id: 'lw4', text: 'I feel tired or low-energy much of the day.', dimension: 'moderate', options: likert },
    { id: 'lw5', text: 'I\'ve been eating much more or much less than usual.', dimension: 'moderate', options: likert },
    { id: 'mi1', text: 'I sometimes feel flat or numb, even about things I usually enjoy.', dimension: 'mild', options: likert },
    { id: 'mi2', text: 'My concentration is noticeably off lately.', dimension: 'mild', options: likert },
    { id: 'mi3', text: 'I feel more irritable than usual.', dimension: 'mild', options: likert },
    { id: 'mi4', text: 'I have stretches of being very self-critical.', dimension: 'mild', options: likert },
    { id: 'lo1', text: 'I\'ve had more good days than difficult days this week.', dimension: 'low', options: likert },
    { id: 'lo2', text: 'I\'ve been able to find pleasure in small things this week.', dimension: 'low', options: likert },
    { id: 'lo3', text: 'I\'ve felt connected to the people around me this week.', dimension: 'low', options: likert },
  ],
};

export const PHQ2_INFO: Record<PHQ2Result, DimensionalResultInfo> = {
  low: { name: 'Low signal — baseline', tagline: 'Most signals suggest you\'re doing okay.', summary: 'Your answers suggest you\'re largely doing okay lately. The quiz can\'t see everything, and "okay" is not the same as "great" — but you\'re in a relatively regulated place. Keep tending what\'s working.', strengths: ['Regulation', 'Baseline steadiness', 'Connection to daily pleasures'], shadow: ['Can miss slow drift — check in periodically', 'Don\'t wait until things are bad to tend your wellbeing'], affirmation: 'I am mostly okay — and I tend my wellbeing like a garden, not an emergency.' },
  mild: { name: 'Mild signal', tagline: 'Some low mood is present — worth attending.', summary: 'Your answers suggest mild symptoms of low mood or low-grade depression. This is very common and is very workable. It does not mean you have a diagnosis. Simple interventions — movement, sunlight, connection, sleep hygiene — often shift this. If it persists past a few weeks, reach out.', strengths: ['Self-awareness that you\'re in a dip', 'Capacity to still engage'], shadow: ['Trying to power through without addressing', 'Self-criticism masking genuine tiredness', 'Writing off what good help could do'], affirmation: 'I\'m in a dip. I address it gently, with basic care, and I reach out if it doesn\'t lift.' },
  moderate: { name: 'Moderate signal', tagline: 'Multiple symptoms present — professional support worth considering.', summary: 'Several symptoms of sustained low mood show up in your answers. This deserves more attention than self-help alone can give. Consider talking to a therapist, GP, or mental-health service. You are not broken. This is workable and you deserve support.', strengths: ['Willingness to check in with yourself — that\'s real'], shadow: ['Isolation makes this worse', 'Waiting too long to reach out', 'Self-blame for being in this state'], affirmation: 'This is a load I don\'t have to carry alone. I reach out — today.' },
  'seek-support': { name: 'Higher signal — reach out', tagline: 'Strong signals of sustained low mood — please talk to someone.', summary: 'Your answers show strong signals of persistent low mood. This is NOT a diagnosis, but it is a clear invitation to reach out to professional support. Crisis resources: Text HOME to 741741 (Crisis Text Line, US/UK/CA/Ireland), call 988 (US Suicide & Crisis Lifeline), or contact your local mental health services. You are not alone.', strengths: ['Being honest in this screener — that\'s strength'], shadow: ['The voice saying "I\'m fine, I don\'t need help" is often the voice that needs it most'], affirmation: 'I reach for real support. I call. I text. I ask. I am worth the reach.' },
};

// Combined export table — extraQuizzes.ts's EXTRA_QUIZ_SCORING will be
// extended at the registration site to include these.
export const EXTRA_QUIZZES_PART2 = {
  'jungian-functions-v1':   { quiz: jungianQuiz,         dimensions: ['Ni','Ne','Si','Se','Ti','Te','Fi','Fe'] as const, info: JUNGIAN_INFO,          emoji: '🧠' },
  'love-styles-v1':         { quiz: loveStylesQuiz,      dimensions: ['eros','philia','storge','agape'] as const,        info: LOVE_STYLES_INFO,      emoji: '💛' },
  'parenting-style-v1':     { quiz: parentingQuiz,       dimensions: ['authoritative','authoritarian','permissive','neglectful'] as const, info: PARENTING_INFO, emoji: '🏡' },
  'learning-style-v1':      { quiz: learningQuiz,        dimensions: ['visual','auditory','reading','kinesthetic'] as const, info: VARK_INFO,          emoji: '📚' },
  'empath-hsp-v1':          { quiz: empathQuiz,          dimensions: ['empath','hsp','both','neither'] as const,         info: EMPATH_INFO,           emoji: '🌀' },
  'self-compassion-v1':     { quiz: selfCompassionQuiz,  dimensions: ['self-kind','self-judging','mindful','over-identified'] as const, info: SELF_COMPASSION_INFO, emoji: '🕊️' },
  'mood-screener-v1':       { quiz: phq2Quiz,            dimensions: ['low','mild','moderate','seek-support'] as const, info: PHQ2_INFO,             emoji: '🌱' },
};
