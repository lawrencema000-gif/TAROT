import { HouseMeanings } from './types';

/**
 * The twelve houses — the stage on which your chart's planets act.
 * Signs describe *how* an energy expresses; houses describe *where* in life
 * it shows up. Keys "1".."12" match the natal-chart house numbering exactly.
 */
export const HOUSE_MEANINGS: HouseMeanings = {
  '1': {
    title: 'The House of Self',
    keywords: ['identity', 'appearance', 'first impressions', 'vitality'],
    description:
      'This is the mask you wear before you speak — the way you arrive in a room and the instinctive style with which you meet the world. It governs your physical presence, your temperament, and the fresh start you make in every new setting. Planets here colour your whole personality, lending their tone to how others read you and how boldly you step forward. A crowded first house often marks someone whose identity is vivid, unmistakable, and worn on the surface.',
  },
  '2': {
    title: 'The House of Value',
    keywords: ['money', 'possessions', 'self-worth', 'resources', 'security'],
    description:
      'Beyond your bank balance, this house holds the deeper question of what you treasure and what makes you feel secure. It shapes your relationship with money, belongings, and the earning of a living, but also your quieter sense of your own worth. When planets gather here, they turn your attention toward building, keeping, and enjoying what is tangibly yours. You are being invited to notice where you find stability — and whether it rests inside you or only in what you can hold.',
  },
  '3': {
    title: 'The House of Communication',
    keywords: ['thinking', 'learning', 'siblings', 'local travel', 'curiosity'],
    description:
      'Your everyday mind lives here — the way you think, talk, text, learn, and connect the dots between things. It rules siblings, neighbours, short journeys, and the restless curiosity that keeps you asking questions. Planets in this house sharpen your voice and your appetite for information, often making words a central tool of your life. Consider it the workshop where your ideas are shaped before they ever leave your lips.',
  },
  '4': {
    title: 'The House of Home and Roots',
    keywords: ['family', 'home', 'ancestry', 'belonging', 'inner foundation'],
    description:
      'At the very base of the chart sits your private foundation: your home, your family line, and the emotional bedrock you return to when the day is done. This house speaks to where you came from, the parent who shaped your inner world, and the sense of belonging you carry beneath everything else. Planets here run deep and quiet, tying their energy to your roots, your memories, and your need for a place that is truly yours. Much of what happens here is felt long before it is ever spoken aloud.',
  },
  '5': {
    title: 'The House of Pleasure and Creativity',
    keywords: ['romance', 'play', 'creativity', 'children', 'self-expression'],
    description:
      'Joy for its own sake belongs to the fifth house — romance, play, art, and the delight of making something simply because it is yours. It governs flirtation and love affairs, creative work, children, and the spontaneous urge to express who you are. Planets landing here want to be seen and celebrated, pouring their energy into whatever lights you up. This is the part of your chart that remembers how to be delighted, dramatic, and gloriously unguarded.',
  },
  '6': {
    title: 'The House of Health and Service',
    keywords: ['work', 'routine', 'health', 'habits', 'service'],
    description:
      'The unglamorous magic of daily life lives here: your routines, your work, your health, and the small habits that quietly build a life. This house governs how you serve others, tend your body, and refine the systems that keep your days running. Planets in the sixth ground their energy in the practical, finding meaning in craft, care, and steady improvement rather than grand gestures. It reminds you that devotion is often spelled out in ordinary, repeated acts.',
  },
  '7': {
    title: 'The House of Partnership',
    keywords: ['relationships', 'marriage', 'contracts', 'balance', 'the other'],
    description:
      'Directly opposite the self sits the mirror of the other — your one-to-one relationships, from marriage and business partners to close rivals. This house reveals what you seek in a companion and the qualities you meet, and sometimes wrestle with, in the people you draw close. Planets here throw your focus onto connection, negotiation, and the delicate art of balancing your needs with someone else\'s. Whoever stands across from you often shows you something you have yet to fully claim in yourself.',
  },
  '8': {
    title: 'The House of Transformation and Intimacy',
    keywords: ['intimacy', 'shared resources', 'transformation', 'depth', 'power'],
    description:
      'Here lies the terrain of deep bonds, shared money, and the profound changes that remake you from the inside. The eighth house governs intimacy that goes beyond the surface, inheritance and joint resources, and the cycles of ending and rebirth that shape a life. Planets in this house dive beneath the visible, drawn toward what is hidden, powerful, and psychologically raw. You are asked to trust the process of letting go — knowing that some things must dissolve so that something truer can emerge.',
  },
  '9': {
    title: 'The House of Philosophy and Travel',
    keywords: ['beliefs', 'travel', 'higher learning', 'meaning', 'expansion'],
    description:
      'The ninth house is your horizon — the search for meaning through travel, study, faith, and encounters with worlds unlike your own. It governs your philosophy of life, your hunger for the big picture, and the beliefs by which you steer. Planets here reach outward and upward, restless for experience that stretches your understanding of what is possible. Whatever helps you grow beyond the familiar tends to find its way into this part of your chart.',
  },
  '10': {
    title: 'The House of Career and Public Life',
    keywords: ['career', 'reputation', 'ambition', 'legacy', 'authority'],
    description:
      'At the top of the chart stands your public face: your career, your reputation, and the mark you hope to leave on the wider world. This house speaks to ambition, achievement, and the role you play once you step onto a larger stage. Planets in the tenth push their energy toward mastery and recognition, shaping how you are seen by those who do not know you personally. It asks a searching question — what do you want to be known for, and who are you when the world is watching?',
  },
  '11': {
    title: 'The House of Community and Hopes',
    keywords: ['friendship', 'community', 'hopes', 'networks', 'vision'],
    description:
      'Belonging to something larger than yourself is the promise of the eleventh house — friendships, groups, and the causes that gather people around a shared vision. It governs your hopes for the future, your networks, and the ways your individual gifts serve a collective good. Planets here find their energy amplified by others, thriving in collaboration, movements, and the loose web of people who share your ideals. This is where your private dreams meet the company of those who dream alongside you.',
  },
  '12': {
    title: 'The House of the Unconscious',
    keywords: ['solitude', 'dreams', 'the hidden', 'surrender', 'the unseen'],
    description:
      'The final house is the quiet room behind the chart, holding your dreams, your solitude, and the parts of you that operate beneath conscious sight. It governs retreat, imagination, compassion, and the invisible patterns you carry without quite naming them. Planets in the twelfth work subtly, drawn toward the spiritual, the artistic, and the healing that happens far from the spotlight. Making peace with your inner world, rather than fleeing it, is the gentle work this house invites.',
  },
};
