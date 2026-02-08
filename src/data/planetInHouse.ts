import type { Planet } from '../types/astrology';

interface PlanetInHouseInterp {
  expression: string;
  themes: string[];
}

const interpretations: Record<string, PlanetInHouseInterp> = {
  'Sun-1': {
    expression: 'Your identity and your outward presentation are closely fused; what people see is genuinely what they get. You radiate a strong sense of self that naturally draws attention and sets the tone in any room you enter.',
    themes: ['Self-expression and personal identity', 'Physical vitality and presence', 'Leadership through being rather than doing'],
  },
  'Sun-2': {
    expression: 'Your sense of self is intimately tied to what you build, earn, and value. You shine brightest when you are creating material or emotional security, and your self-worth grows as you learn to trust your own resources.',
    themes: ['Financial identity and earning power', 'Personal values as life compass', 'Building tangible self-worth'],
  },
  'Sun-3': {
    expression: 'You come alive through learning, communicating, and connecting the dots between ideas. Your identity is shaped by your immediate environment, siblings, and the daily exchanges that keep your mind buzzing.',
    themes: ['Communication as core identity', 'Sibling and neighborhood bonds', 'Lifelong learning and curiosity'],
  },
  'Sun-4': {
    expression: 'Home and family are the foundation upon which your entire identity rests. You carry your roots with you wherever you go, and creating a sense of belonging is one of the most important things you will ever do.',
    themes: ['Deep connection to family origins', 'Home as sanctuary and identity', 'Emotional foundations shaping adult self'],
  },
  'Sun-5': {
    expression: 'You are here to create, play, and express your heart without apology. Romance, children, art, and joy are not luxuries for you but essential parts of how you experience being alive.',
    themes: ['Creative self-expression and joy', 'Romance and playful love', 'Children and creative legacy'],
  },
  'Sun-6': {
    expression: 'You find your purpose through service, health, and the daily rituals that make life work. Your identity is shaped by how useful you feel, and you shine when your skills are genuinely helping someone.',
    themes: ['Service and meaningful work', 'Health as spiritual practice', 'Mastery of daily routines'],
  },
  'Sun-7': {
    expression: 'You discover who you are through the mirror of your closest relationships. Partnership is not optional for your growth; it is the crucible where your identity is refined and revealed.',
    themes: ['Identity through partnership', 'Balancing self and other', 'Committed relationships as life teachers'],
  },
  'Sun-8': {
    expression: 'You are drawn to the hidden, the taboo, and the transformative. Your identity is forged in crisis and rebirth, and you have a gift for navigating the dark terrain that others avoid.',
    themes: ['Transformation through crisis', 'Shared resources and intimacy', 'Power dynamics and trust'],
  },
  'Sun-9': {
    expression: 'You need your life to mean something, and you find identity through philosophy, travel, and the pursuit of truth. Your world expands every time you encounter a perspective different from your own.',
    themes: ['Search for meaning and truth', 'Travel and cross-cultural growth', 'Higher education and philosophy'],
  },
  'Sun-10': {
    expression: 'Your public role and career are not just what you do; they are who you are. You have a natural authority and a deep need to build something that the world recognizes and respects.',
    themes: ['Career as identity and calling', 'Public reputation and authority', 'Legacy and long-term ambition'],
  },
  'Sun-11': {
    expression: 'You find yourself through community, friendship, and shared visions of the future. Your identity thrives when it is connected to something larger than yourself, a cause, a group, a dream for what could be.',
    themes: ['Community and social purpose', 'Friendship as lifeblood', 'Hopes, wishes, and collective vision'],
  },
  'Sun-12': {
    expression: 'Much of who you are lives beneath the surface, in the realm of dreams, intuition, and the unconscious. You are learning to shine from the inside out, and your greatest power comes from solitude and spiritual connection.',
    themes: ['Inner life and spiritual identity', 'Hidden strengths and secret gifts', 'Healing through surrender and solitude'],
  },
  'Moon-1': {
    expression: 'Your emotions are written all over your face, and your mood sets the atmosphere wherever you go. You are deeply in touch with your feelings and you process life through an instinctive, emotional lens.',
    themes: ['Emotional transparency', 'Instinctive self-expression', 'Mood as personal weather system'],
  },
  'Moon-4': {
    expression: 'Home is your emotional anchor, and your inner world is shaped by your earliest memories and family dynamics. You carry your childhood with you in ways both beautiful and complicated, and creating a nurturing home is essential to your well-being.',
    themes: ['Deep family emotional bonds', 'Home as emotional sanctuary', 'Healing ancestral emotional patterns'],
  },
  'Moon-7': {
    expression: 'You need emotional partnership like you need air. Your feelings are deeply activated in close relationships, and you have an instinctive ability to attune to your partner emotional state.',
    themes: ['Emotional fulfillment through partnership', 'Intuitive connection with partners', 'Codependency versus healthy bonding'],
  },
  'Moon-10': {
    expression: 'Your emotional life and your public life are intertwined in complex ways. You bring genuine feeling to your career, and your professional reputation is built on the authentic care you show in your work.',
    themes: ['Emotional investment in career', 'Public nurturing role', 'Mother figures and professional identity'],
  },
  'Venus-5': {
    expression: 'Love and creativity are your lifeblood, and you experience both with a natural flair that makes life feel like art. Romance is not a sideshow for you but the main event, and you attract love through your joyful self-expression.',
    themes: ['Romantic creativity and passion', 'Artistic talent and aesthetic joy', 'Love affairs and playful connection'],
  },
  'Venus-7': {
    expression: 'Partnership comes naturally to you, and you have a gift for creating harmonious, beautiful relationships. You are at your most attractive when you are in love, and you bring grace and balance to every committed bond.',
    themes: ['Natural partnership harmony', 'Attracting loving relationships', 'Beauty and balance in commitment'],
  },
  'Mars-1': {
    expression: 'You approach life as a warrior, meeting every challenge head-on with physical energy and assertive confidence. Your body is your vehicle for action, and people sense your competitive, driven nature immediately.',
    themes: ['Physical assertiveness and courage', 'Competitive drive and initiative', 'Body as instrument of will'],
  },
  'Mars-10': {
    expression: 'Your ambition is fierce and your drive for professional success is one of the defining forces of your life. You need a career that lets you compete, lead, and pour your considerable energy into building something that matters.',
    themes: ['Ambitious career drive', 'Professional leadership and authority', 'Channeling aggression into achievement'],
  },
  'Jupiter-9': {
    expression: 'This is one of the most naturally fortunate placements, amplifying your love of learning, travel, and spiritual growth. Your faith in life is expansive, and you attract opportunities through your genuine openness to the world.',
    themes: ['Expansive philosophical vision', 'Luck through travel and education', 'Spiritual optimism and growth'],
  },
  'Saturn-10': {
    expression: 'You carry a heavy sense of responsibility about your place in the world and your professional legacy. Success comes to you through discipline, patience, and a willingness to do the hard work that others avoid, often later in life.',
    themes: ['Disciplined long-term ambition', 'Authority earned through perseverance', 'Late-blooming professional success'],
  },
};

const planetKeywords: Record<string, string> = {
  Sun: 'identity and purpose',
  Moon: 'emotional needs and instincts',
  Mercury: 'thinking and communication',
  Venus: 'love and values',
  Mars: 'drive and assertion',
  Jupiter: 'expansion and growth',
  Saturn: 'discipline and responsibility',
  Uranus: 'innovation and disruption',
  Neptune: 'imagination and transcendence',
  Pluto: 'transformation and power',
};

const houseKeywords: Record<number, string> = {
  1: 'self-image and first impressions',
  2: 'finances, possessions, and self-worth',
  3: 'communication, learning, and local community',
  4: 'home, family, and emotional roots',
  5: 'creativity, romance, and self-expression',
  6: 'daily work, health, and service',
  7: 'partnerships and committed relationships',
  8: 'shared resources, intimacy, and transformation',
  9: 'philosophy, travel, and higher learning',
  10: 'career, reputation, and public life',
  11: 'friendships, community, and future vision',
  12: 'spirituality, solitude, and the unconscious',
};

export function getPlanetInHouse(planet: Planet, house: number): PlanetInHouseInterp | null {
  return interpretations[`${planet}-${house}`] || null;
}

export function getGenericHouseInterp(planet: Planet, house: number): PlanetInHouseInterp {
  const specific = interpretations[`${planet}-${house}`];
  if (specific) return specific;

  const pKey = planetKeywords[planet] || 'personal energy';
  const hKey = houseKeywords[house] || 'this area of life';

  return {
    expression: `Your ${pKey} finds its primary outlet through the realm of ${hKey}. This placement asks you to integrate these themes into a conscious part of your daily experience.`,
    themes: [
      `${planet} energy expressed through ${hKey}`,
      `Growth through engaging with house ${house} matters`,
      `Integrating ${pKey} into practical life`,
    ],
  };
}
