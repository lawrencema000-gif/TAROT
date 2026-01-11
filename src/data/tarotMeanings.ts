export interface ContextualMeaning {
  love: string;
  career: string;
  reflection: string;
}

export const majorArcanaContextual: Record<number, ContextualMeaning> = {
  0: {
    love: 'The Fool heralds romantic awakening and fresh possibilities. If single, an unexpected encounter may change everything - love could arrive in unusual circumstances. For those partnered, rediscover the magic of your early days together through spontaneous adventures. This is a time to fall in love all over again, approaching your partner with fresh eyes and letting go of stale patterns.',
    career: 'The Fool brings powerful energy for new ventures, career changes, or creative risks. This is an auspicious time to start your own business, change industries, or pursue a passion project. Opportunities may come from unexpected directions - stay open to unconventional offers and chance meetings. Bring a beginner\'s mind to your work, questioning assumptions that may have become limiting.',
    reflection: 'What new chapter is calling to your soul, and what fears are silencing that call? Where have you traded wonder for worry? What are you carrying that no longer serves your journey? The Fool travels light, understanding that true freedom requires releasing what weighs us down. What adventure would your soul take if your mind would let it?',
  },
  1: {
    love: 'You have the power to manifest the relationship you desire. Focus your intentions and communicate clearly.',
    career: 'Your skills and resources are aligned for success. Take initiative and make things happen in your work.',
    reflection: 'What tools and talents do I already possess? How can I better channel my energy toward my goals?',
  },
  2: {
    love: 'Trust your intuition about a relationship. There may be hidden feelings or undisclosed information to uncover.',
    career: 'Hidden knowledge or opportunities are present. Look beyond the surface and trust your inner wisdom.',
    reflection: 'What is my intuition telling me that I might be ignoring? What secrets need to come to light?',
  },
  3: {
    love: 'Nurturing energy surrounds your relationships. Focus on creating beauty and comfort with your partner.',
    career: 'Creativity and abundance flow in your work. Projects will flourish with proper care and attention.',
    reflection: 'How can I better nurture the relationships and projects that matter most to me?',
  },
  4: {
    love: 'Stability and structure are needed in relationships. Set clear boundaries and expectations with partners.',
    career: 'Leadership and authority define your path. Take charge of situations and establish your expertise.',
    reflection: 'Where do I need more structure in my life? How can I exercise healthy authority?',
  },
  5: {
    love: 'Traditional values may guide relationship decisions. Consider what beliefs and structures serve your bonds.',
    career: 'Mentorship and established systems offer guidance. Learn from those who have walked this path before.',
    reflection: 'What traditions or beliefs guide my life? Which serve me and which need to be questioned?',
  },
  6: {
    love: 'A significant choice in love presents itself. Follow your heart but ensure your values are aligned.',
    career: 'Important partnerships or decisions at work require careful consideration of shared values.',
    reflection: 'What values are non-negotiable in my relationships? Am I being true to my heart?',
  },
  7: {
    love: 'Determination and willpower drive your romantic pursuits. Stay focused on your relationship goals.',
    career: 'Victory comes through persistence and focus. Keep your professional ambitions clearly in sight.',
    reflection: 'What am I striving toward with all my might? Am I in control of my direction?',
  },
  8: {
    love: 'Gentle patience and inner strength guide your heart. Use compassion rather than force in relationships.',
    career: 'Lead with empathy and quiet confidence. Your gentle approach will win more than aggression.',
    reflection: 'Where do I need to practice more patience? How can I find strength through softness?',
  },
  9: {
    love: 'Time alone for reflection benefits your romantic life. Understand yourself before seeking another.',
    career: 'Solitary work or research brings insights. Trust your own counsel and inner guidance.',
    reflection: 'What truth am I seeking? What wisdom emerges when I quiet the noise around me?',
  },
  10: {
    love: 'Fate plays a role in your love life. Embrace changes and trust the cycles of relationship evolution.',
    career: 'Fortune turns in your professional favor. Adapt to changes and ride the wave of opportunity.',
    reflection: 'What cycle is completing or beginning in my life? How can I align with change rather than resist it?',
  },
  11: {
    love: 'Fairness and balance are needed in relationships. Address any imbalances with honest communication.',
    career: 'Legal matters or contracts may require attention. Ensure all dealings are fair and transparent.',
    reflection: 'Where am I being unfair to myself or others? What needs to be balanced in my life?',
  },
  12: {
    love: 'Pause and see your relationship from a new angle. Sacrifice may be needed for greater understanding.',
    career: 'A period of suspension or waiting in work matters. Use this time to gain fresh perspective.',
    reflection: 'What do I need to let go of to move forward? What new perspective am I being shown?',
  },
  13: {
    love: 'A relationship transformation is occurring. Old patterns must end for new love to flourish.',
    career: 'A significant career ending leads to new beginnings. Embrace the closure and what follows.',
    reflection: 'What chapter is ending in my life? What am I being asked to release?',
  },
  14: {
    love: 'Balance and moderation create harmony in relationships. Blend differences with patience and understanding.',
    career: 'Collaboration and balanced approaches lead to success. Patience in projects yields best results.',
    reflection: 'Where do I need more balance? How can I blend opposing forces in my life?',
  },
  15: {
    love: 'Examine unhealthy attachments or patterns in relationships. Freedom comes from facing your shadows.',
    career: 'Material ambition may be creating bondage. Question what truly drives your professional choices.',
    reflection: 'What am I attached to that holds me back? What shadow aspect of myself needs acknowledgment?',
  },
  16: {
    love: 'Sudden changes shake up your love life. While disruptive, this revelation clears the way for truth.',
    career: 'Unexpected upheaval in work matters. Though challenging, this disruption removes false structures.',
    reflection: 'What false structure in my life is crumbling? What truth is being revealed through chaos?',
  },
  17: {
    love: 'Hope and healing enter your romantic life. A period of renewal and gentle optimism awaits.',
    career: 'Inspiration and renewed purpose guide your work. Follow your calling with faith.',
    reflection: 'What gives me hope? How can I better align with my higher purpose?',
  },
  18: {
    love: 'Illusions or confusion may cloud your romantic vision. Trust your instincts over appearances.',
    career: 'Hidden factors influence your work situation. Navigate with intuition through unclear waters.',
    reflection: 'What fears are distorting my perception? What am I not seeing clearly?',
  },
  19: {
    love: 'Joy, warmth, and vitality bless your relationships. Celebrate love openly and with full heart.',
    career: 'Success and recognition shine upon your work. Your talents are seen and appreciated.',
    reflection: 'What brings me pure joy? How can I share more warmth with those around me?',
  },
  20: {
    love: 'A significant moment of truth in relationships. Answer the call to a higher form of love.',
    career: 'Your true calling becomes clear. Rise to meet your professional destiny with conviction.',
    reflection: 'What is my higher calling? What awakening is asking for my attention?',
  },
  21: {
    love: 'Completion and fulfillment in love. A relationship reaches its full potential or cycle.',
    career: 'Career goals are achieved. Celebrate accomplishments and prepare for new cycles.',
    reflection: 'What has been completed in my journey? How do I integrate all I have learned?',
  },
};

export const suitsContextual: Record<string, { loveTheme: string; careerTheme: string; reflectionTheme: string }> = {
  wands: {
    loveTheme: 'passion, adventure, and creative expression in relationships',
    careerTheme: 'ambition, creative projects, and entrepreneurial ventures',
    reflectionTheme: 'What ignites your passion? Where does your creative fire want to lead you?',
  },
  cups: {
    loveTheme: 'emotional depth, intuition, and heart connections',
    careerTheme: 'creative fulfillment, emotional intelligence, and meaningful work',
    reflectionTheme: 'What does your heart truly desire? How are you honoring your emotional needs?',
  },
  swords: {
    loveTheme: 'communication, truth, and mental clarity in relationships',
    careerTheme: 'intellectual challenges, decisions, and strategic thinking',
    reflectionTheme: 'What truth needs to be spoken? Where is clear thinking most needed?',
  },
  pentacles: {
    loveTheme: 'stability, commitment, and building lasting foundations',
    careerTheme: 'financial matters, practical skills, and material success',
    reflectionTheme: 'What are you building for the long term? How do you define true security?',
  },
};

export const courtCardThemes: Record<string, { love: string; career: string }> = {
  page: {
    love: 'New messages about love arrive. Stay curious and open to learning in relationships.',
    career: 'Fresh opportunities for growth present themselves. Embrace the beginner mindset.',
  },
  knight: {
    love: 'Action and movement in romantic matters. Pursue what you want with dedication.',
    career: 'Time to charge forward with your goals. Bold moves advance your career.',
  },
  queen: {
    love: 'Nurturing wisdom guides your relationships. Lead with emotional intelligence.',
    career: 'Mastery and leadership in your field. Your expertise is recognized and valued.',
  },
  king: {
    love: 'Mature authority in relationships. Provide stable leadership in partnership.',
    career: 'Full command of your professional domain. Others look to you for direction.',
  },
};

export function getContextualMeaning(cardId: number, suit?: string, number?: number): ContextualMeaning {
  if (cardId < 22) {
    return majorArcanaContextual[cardId] || {
      love: 'Trust your intuition in matters of the heart.',
      career: 'Professional insights await your discovery.',
      reflection: 'What is this card revealing about your current path?',
    };
  }

  const suitThemes = suit ? suitsContextual[suit] : null;
  let courtTheme = null;

  if (number && number >= 11 && number <= 14) {
    const courtType = number === 11 ? 'page' : number === 12 ? 'knight' : number === 13 ? 'queen' : 'king';
    courtTheme = courtCardThemes[courtType];
  }

  return {
    love: courtTheme?.love || suitThemes?.loveTheme || 'Emotions flow through your connections.',
    career: courtTheme?.career || suitThemes?.careerTheme || 'Professional growth is highlighted.',
    reflection: suitThemes?.reflectionTheme || 'What message does this card hold for your journey?',
  };
}
