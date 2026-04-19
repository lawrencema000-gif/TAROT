import { useState, useEffect } from 'react';
import { useT } from '../../i18n/useT';
import {
  Bookmark,
  Sparkles,
  Star,
  Layers,
  Book,
  ChevronRight,
  Calendar,
  Trash2,
  Brain,
} from 'lucide-react';
import { Card, Button, Chip, Sheet, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type LibraryTab = 'saved' | 'guides' | 'ai-readings';
type SavedFilter = 'all' | 'tarot' | 'horoscope' | 'spreads';

const PAGE_SIZE = 20;

interface SavedItem {
  id: string;
  date: string;
  highlight_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

interface TarotReading {
  id: string;
  date: string;
  spread_type: string;
  focus_area: string;
  cards: Array<{ cardName: string; reversed: boolean; position: string }>;
  created_at: string;
}

interface PremiumReading {
  id: string;
  reading_type: string;
  content: string;
  context: {
    question?: string;
    focusArea?: string;
    usedLlm?: boolean;
  };
  cards: Array<{ id: number; name: string; reversed: boolean }>;
  created_at: string;
}

const guides = [
  {
    id: 'tarot-basics',
    title: 'Tarot Basics',
    description: 'Learn the fundamentals of tarot reading',
    sections: ['Major vs Minor Arcana', 'The Four Suits', 'Reading Spreads', 'Reversed Cards'],
    content: {
      'Major vs Minor Arcana': 'The Major Arcana consists of 22 cards representing life\'s major themes and spiritual lessons. The Minor Arcana has 56 cards divided into four suits, representing day-to-day experiences.',
      'The Four Suits': 'Wands (Fire - Passion), Cups (Water - Emotions), Swords (Air - Thoughts), Pentacles (Earth - Material)',
      'Reading Spreads': 'Different card layouts like the Three-Card Spread (Past-Present-Future) and Celtic Cross provide various perspectives on questions.',
      'Reversed Cards': 'When cards appear upside down, they can indicate blocked energy, internalized energy, or the opposite meaning.',
    },
  },
  {
    id: 'mbti-guide',
    title: 'MBTI Explained',
    description: 'Understanding the 16 personality types',
    sections: ['The Four Dichotomies', 'Cognitive Functions', 'Your Type\'s Strengths', 'Growth Areas'],
    content: {
      'The Four Dichotomies': 'E/I (Energy direction), S/N (Information processing), T/F (Decision making), J/P (Lifestyle approach)',
      'Cognitive Functions': 'Each type uses eight cognitive functions in a specific order, determining how they perceive and judge the world.',
      'Your Type\'s Strengths': 'Every type has unique gifts - INTJs excel at strategic thinking, ENFPs at inspiring others, ISTJs at reliability.',
      'Growth Areas': 'Understanding your inferior function helps identify areas for personal development and stress management.',
    },
  },
  {
    id: 'love-languages',
    title: 'Love Languages',
    description: 'The 5 ways we give and receive love',
    sections: ['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'],
    content: {
      'Words of Affirmation': 'Verbal compliments, encouragement, and expressions of appreciation make you feel most loved.',
      'Acts of Service': 'Actions speak louder than words - doing helpful things shows care and consideration.',
      'Receiving Gifts': 'Thoughtful presents, big or small, represent love and show you were thought of.',
      'Quality Time': 'Undivided attention and meaningful shared experiences are how you feel valued.',
      'Physical Touch': 'Appropriate physical connection - hugs, hand-holding, closeness - communicates love.',
    },
  },
  {
    id: 'zodiac-elements',
    title: 'Zodiac Elements',
    description: 'Fire, Earth, Air, and Water signs',
    sections: ['Fire Signs', 'Earth Signs', 'Air Signs', 'Water Signs', 'Element Compatibility'],
    content: {
      'Fire Signs': 'Aries, Leo, Sagittarius - Passionate, enthusiastic, bold, and inspirational. They lead with action.',
      'Earth Signs': 'Taurus, Virgo, Capricorn - Grounded, practical, reliable, and focused on tangible results.',
      'Air Signs': 'Gemini, Libra, Aquarius - Intellectual, communicative, social, and idea-oriented.',
      'Water Signs': 'Cancer, Scorpio, Pisces - Emotional, intuitive, empathetic, and deeply feeling.',
      'Element Compatibility': 'Fire and Air energize each other. Earth and Water nurture each other. Similar elements understand each other.',
    },
  },
  {
    id: 'moon-phases',
    title: 'Moon Phases & Rituals',
    description: 'Harness lunar energy for manifestation',
    sections: ['New Moon', 'Waxing Moon', 'Full Moon', 'Waning Moon', 'Moon Rituals'],
    content: {
      'New Moon': 'Time for new beginnings, setting intentions, and planting seeds for the future.',
      'Waxing Moon': 'Building energy phase - take action on your goals, make progress, attract what you want.',
      'Full Moon': 'Peak energy for manifestation, celebration, and releasing what no longer serves you.',
      'Waning Moon': 'Time for reflection, rest, letting go, and clearing space for new opportunities.',
      'Moon Rituals': 'Write intentions on new moons, charge crystals during full moons, and practice gratitude journaling.',
    },
  },
  {
    id: 'crystals-guide',
    title: 'Crystals & Stones',
    description: 'Energy healing with gemstones',
    sections: ['Clear Quartz', 'Amethyst', 'Rose Quartz', 'Black Tourmaline', 'Citrine'],
    content: {
      'Clear Quartz': 'The master healer - amplifies energy, clarifies thoughts, enhances spiritual awareness.',
      'Amethyst': 'Calming and protective - promotes peaceful sleep, intuition, and spiritual connection.',
      'Rose Quartz': 'The love stone - attracts love, promotes self-love, heals emotional wounds.',
      'Black Tourmaline': 'Protective shield - grounds energy, repels negativity, provides emotional stability.',
      'Citrine': 'Abundance and joy - attracts prosperity, enhances creativity, radiates positive energy.',
    },
  },
  {
    id: 'chakras',
    title: 'Chakra System',
    description: 'Balance your energy centers',
    sections: ['Root Chakra', 'Sacral Chakra', 'Solar Plexus', 'Heart Chakra', 'Throat Chakra', 'Third Eye', 'Crown Chakra'],
    content: {
      'Root Chakra': 'Red - Grounding, security, survival. Located at the base of spine. Balanced = stable and secure.',
      'Sacral Chakra': 'Orange - Creativity, sexuality, emotions. Below navel. Balanced = passionate and creative.',
      'Solar Plexus': 'Yellow - Personal power, confidence, will. Upper abdomen. Balanced = confident and purposeful.',
      'Heart Chakra': 'Green - Love, compassion, connection. Center of chest. Balanced = loving and accepting.',
      'Throat Chakra': 'Blue - Communication, truth, expression. Throat. Balanced = authentic and expressive.',
      'Third Eye': 'Indigo - Intuition, wisdom, insight. Between eyebrows. Balanced = intuitive and wise.',
      'Crown Chakra': 'Violet - Spiritual connection, enlightenment. Top of head. Balanced = spiritually connected.',
    },
  },
  {
    id: 'numerology',
    title: 'Numerology Basics',
    description: 'The mystical significance of numbers',
    sections: ['Life Path Number', 'Expression Number', 'Soul Urge', 'Personality Number', 'Master Numbers'],
    content: {
      'Life Path Number': 'Calculated from birthdate - reveals your life\'s purpose and the path you\'re meant to walk.',
      'Expression Number': 'From your full name - shows your natural talents, abilities, and how you express yourself.',
      'Soul Urge': 'From vowels in your name - reveals your innermost desires, motivations, and what drives you.',
      'Personality Number': 'From consonants - how others perceive you, the mask you show to the world.',
      'Master Numbers': '11, 22, 33 carry powerful spiritual significance and heightened potential for growth.',
    },
  },
];

export function LibrarySection() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTab>('saved');
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all');
  const [savedHighlights, setSavedHighlights] = useState<SavedItem[]>([]);
  const [tarotReadings, setTarotReadings] = useState<TarotReading[]>([]);
  const [premiumReadings, setPremiumReadings] = useState<PremiumReading[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<typeof guides[0] | null>(null);
  const [selectedReading, setSelectedReading] = useState<PremiumReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreHighlights, setHasMoreHighlights] = useState(false);
  const [hasMoreReadings, setHasMoreReadings] = useState(false);
  const [hasMorePremium, setHasMorePremium] = useState(false);

  useEffect(() => {
    if (user) {
      loadSavedItems();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSavedItems = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [highlightsRes, readingsRes, premiumRes] = await Promise.all([
        supabase
          .from('saved_highlights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1),
        supabase
          .from('tarot_readings')
          .select('*')
          .eq('user_id', user.id)
          .eq('saved', true)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1),
        supabase
          .from('premium_readings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1),
      ]);

      if (highlightsRes.data) {
        setSavedHighlights(highlightsRes.data as SavedItem[]);
        setHasMoreHighlights(highlightsRes.data.length === PAGE_SIZE);
      }

      if (readingsRes.data) {
        setTarotReadings(readingsRes.data as TarotReading[]);
        setHasMoreReadings(readingsRes.data.length === PAGE_SIZE);
      }

      if (premiumRes.data) {
        setPremiumReadings(premiumRes.data as PremiumReading[]);
        setHasMorePremium(premiumRes.data.length === PAGE_SIZE);
      }
    } catch {
      toast('Could not load saved items — you may be offline', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (type: 'highlights' | 'readings' | 'premium') => {
    if (!user) return;
    setLoadingMore(true);

    try {
      if (type === 'highlights') {
        const offset = savedHighlights.length;
        const { data } = await supabase
          .from('saved_highlights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (data) {
          setSavedHighlights(prev => [...prev, ...(data as SavedItem[])]);
          setHasMoreHighlights(data.length === PAGE_SIZE);
        }
      } else if (type === 'readings') {
        const offset = tarotReadings.length;
        const { data } = await supabase
          .from('tarot_readings')
          .select('*')
          .eq('user_id', user.id)
          .eq('saved', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (data) {
          setTarotReadings(prev => [...prev, ...(data as TarotReading[])]);
          setHasMoreReadings(data.length === PAGE_SIZE);
        }
      } else {
        const offset = premiumReadings.length;
        const { data } = await supabase
          .from('premium_readings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (data) {
          setPremiumReadings(prev => [...prev, ...(data as PremiumReading[])]);
          setHasMorePremium(data.length === PAGE_SIZE);
        }
      }
    } catch {
      toast('Failed to load more items', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (type: 'highlight' | 'reading' | 'premium', id: string) => {
    const table = type === 'highlight' ? 'saved_highlights' : type === 'premium' ? 'premium_readings' : 'tarot_readings';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      toast('Failed to delete', 'error');
    } else {
      if (type === 'highlight') {
        setSavedHighlights(prev => prev.filter(h => h.id !== id));
      } else if (type === 'premium') {
        setPremiumReadings(prev => prev.filter(r => r.id !== id));
      } else {
        setTarotReadings(prev => prev.filter(r => r.id !== id));
      }
      toast('Deleted', 'success');
    }
  };

  const filteredHighlights = savedFilter === 'all'
    ? savedHighlights
    : savedHighlights.filter(h => h.highlight_type === savedFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 px-4">
        <div
          className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <Chip selected={activeTab === 'saved'} onClick={() => setActiveTab('saved')}>
            <Bookmark className="w-3.5 h-3.5" />
            Saved
          </Chip>
          {profile?.isPremium && (
            <Chip selected={activeTab === 'ai-readings'} onClick={() => setActiveTab('ai-readings')}>
              <Brain className="w-3.5 h-3.5" />
              AI Readings
            </Chip>
          )}
          <Chip selected={activeTab === 'guides'} onClick={() => setActiveTab('guides')}>
            <Book className="w-3.5 h-3.5" />
            Guides
          </Chip>
        </div>
      </div>

      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="relative -mx-4 px-4">
            <div
              className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {(['all', 'tarot', 'horoscope', 'spreads'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSavedFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 snap-start ${
                    savedFilter === filter
                      ? 'bg-mystic-700 text-mystic-100'
                      : 'text-mystic-400 hover:text-mystic-300'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="loading-constellation mx-auto mb-4" />
              <p className="text-mystic-400">Loading...</p>
            </div>
          ) : (
            <>
              {(savedFilter === 'all' || savedFilter === 'spreads') && tarotReadings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Saved Spreads
                  </h3>
                  {tarotReadings.map(reading => (
                    <Card key={reading.id} padding="md" className="relative group">
                      <button
                        onClick={() => handleDelete('reading', reading.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-mystic-700/30 overflow-hidden flex-shrink-0">
                          {profile?.card_back_url ? (
                            <img
                              src={profile.card_back_url}
                              alt="Card back"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gold/10 flex items-center justify-center">
                              <Layers className="w-5 h-5 text-gold" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-mystic-100 text-sm">
                              {reading.spread_type === 'single' ? 'Single Card' :
                               reading.spread_type === 'three-card' ? '3-Card Spread' :
                               reading.spread_type === 'celtic-cross' ? 'Celtic Cross' :
                               reading.spread_type}
                            </h4>
                            {reading.focus_area && (
                              <span className="px-2 py-0.5 bg-mystic-800 rounded text-xs text-mystic-400">
                                {reading.focus_area}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {reading.cards.slice(0, 3).map((card, i) => (
                              <span key={i} className="text-xs text-mystic-400">
                                {card.cardName}{card.reversed ? ' (R)' : ''}{i < Math.min(reading.cards.length - 1, 2) ? ',' : ''}
                              </span>
                            ))}
                            {reading.cards.length > 3 && (
                              <span className="text-xs text-mystic-500">+{reading.cards.length - 3} more</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-mystic-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(reading.date)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {hasMoreReadings && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadMore('readings')}
                      disabled={loadingMore}
                      className="w-full"
                    >
                      {loadingMore ? 'Loading...' : 'Load more spreads'}
                    </Button>
                  )}
                </div>
              )}

              {(savedFilter === 'all' || savedFilter === 'tarot') &&
               filteredHighlights.filter(h => h.highlight_type === 'tarot').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Saved Cards
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'tarot')
                    .map(item => {
                      const content = item.content as { card?: { name: string }; reversed?: boolean };
                      return (
                        <Card key={item.id} padding="md" className="relative group">
                          <button
                            onClick={() => handleDelete('highlight', item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-mystic-700/30 overflow-hidden flex-shrink-0">
                              {profile?.card_back_url ? (
                                <img
                                  src={profile.card_back_url}
                                  alt="Card back"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gold/10 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-gold" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-mystic-100 text-sm">
                                {content.card?.name}
                                {content.reversed && <span className="text-mystic-400 ml-1">(Reversed)</span>}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-mystic-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.date)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}

              {(savedFilter === 'all' || savedFilter === 'horoscope') &&
               filteredHighlights.filter(h => h.highlight_type === 'horoscope').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-mystic-400 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Saved Horoscopes
                  </h3>
                  {filteredHighlights
                    .filter(h => h.highlight_type === 'horoscope')
                    .map(item => {
                      const content = item.content as { zodiacSign?: string; period?: string };
                      return (
                        <Card key={item.id} padding="md" className="relative group">
                          <button
                            onClick={() => handleDelete('highlight', item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                              <Star className="w-5 h-5 text-gold" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-mystic-100 text-sm capitalize">
                                {content.zodiacSign} - {content.period || 'Daily'}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-mystic-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.date)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}

              {hasMoreHighlights && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore('highlights')}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? 'Loading...' : 'Load more saved items'}
                </Button>
              )}

              {filteredHighlights.length === 0 && tarotReadings.length === 0 && (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-mystic-700 mx-auto mb-3" />
                  <h3 className="font-medium text-mystic-300 mb-1">{t('saved.empty')}</h3>
                  <p className="text-sm text-mystic-500">{t('saved.emptySubAlt')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'ai-readings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="loading-constellation mx-auto mb-4" />
              <p className="text-mystic-400">Loading...</p>
            </div>
          ) : premiumReadings.length > 0 ? (
            <div className="space-y-3">
              {premiumReadings.map(reading => (
                <Card key={reading.id} padding="md" className="relative group">
                  <button
                    onClick={() => handleDelete('premium', reading.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-mystic-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50 z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-mystic-400" />
                  </button>
                  <button
                    onClick={() => setSelectedReading(reading)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-mystic-800/50 border border-gold/20 overflow-hidden flex-shrink-0">
                        {profile?.card_back_url ? (
                          <img
                            src={profile.card_back_url}
                            alt="Card back"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gold/20 to-cosmic-blue/20 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-gold" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-mystic-100 text-sm">
                            {reading.reading_type === 'single' ? 'Single Card' :
                             reading.reading_type === 'three-card' ? '3-Card Spread' :
                             reading.reading_type === 'celtic-cross' ? 'Celtic Cross' :
                             reading.reading_type === 'relationship' ? 'Relationship' :
                             reading.reading_type === 'career' ? 'Career' :
                             reading.reading_type === 'shadow' ? 'Shadow Work' :
                             reading.reading_type}
                          </h4>
                          {reading.context.usedLlm && (
                            <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-xs text-gold">
                              AI
                            </span>
                          )}
                          {reading.context.focusArea && (
                            <span className="px-2 py-0.5 bg-mystic-800 rounded text-xs text-mystic-400 capitalize">
                              {reading.context.focusArea}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {reading.cards.slice(0, 3).map((card, i) => (
                            <span key={i} className="text-xs text-mystic-400">
                              {card.name}{card.reversed ? ' (R)' : ''}{i < Math.min(reading.cards.length - 1, 2) ? ',' : ''}
                            </span>
                          ))}
                          {reading.cards.length > 3 && (
                            <span className="text-xs text-mystic-500">+{reading.cards.length - 3} more</span>
                          )}
                        </div>
                        <p className="text-xs text-mystic-500 mb-2">
                          {reading.content.slice(0, 150)}...
                        </p>
                        <div className="flex items-center gap-1 text-xs text-mystic-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(reading.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
              {hasMorePremium && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore('premium')}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? 'Loading...' : 'Load more readings'}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-mystic-700 mx-auto mb-3" />
              <h3 className="font-medium text-mystic-300 mb-1">No AI readings yet</h3>
              <p className="text-sm text-mystic-500">Get AI interpretations from the Tarot section</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="space-y-3">
          {guides.map(guide => (
            <Card
              key={guide.id}
              interactive
              padding="md"
              onClick={() => setSelectedGuide(guide)}
              className="flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mystic-800 flex items-center justify-center">
                  <Book className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-medium text-mystic-100 text-sm">{guide.title}</h4>
                  <p className="text-xs text-mystic-400">{guide.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-mystic-500" />
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
        title={selectedGuide?.title}
      >
        {selectedGuide && (
          <div className="space-y-6">
            <p className="text-mystic-400">{selectedGuide.description}</p>

            <div className="space-y-4">
              {selectedGuide.sections.map((section, i) => (
                <div
                  key={i}
                  className="p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-sm text-gold font-medium">
                      {i + 1}
                    </span>
                    <h4 className="font-medium text-mystic-100">{section}</h4>
                  </div>
                  <p className="text-sm text-mystic-300 leading-relaxed pl-10">
                    {(selectedGuide.content as Record<string, string>)?.[section] || 'Content coming soon...'}
                  </p>
                </div>
              ))}
            </div>

            <Card padding="md" className="bg-gradient-to-r from-gold/5 to-cosmic-blue/5 border-gold/20">
              <p className="text-xs text-mystic-400 text-center">
                Continue exploring the guides to deepen your spiritual practice
              </p>
            </Card>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!selectedReading}
        onClose={() => setSelectedReading(null)}
        title="AI Reading"
      >
        {selectedReading && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gold/10 to-cosmic-blue/10 border border-gold/20 rounded-xl">
              <Brain className="w-6 h-6 text-gold flex-shrink-0" />
              <div>
                <h3 className="font-medium text-mystic-100">
                  {selectedReading.reading_type === 'single' ? 'Single Card Reading' :
                   selectedReading.reading_type === 'three-card' ? '3-Card Spread' :
                   selectedReading.reading_type === 'celtic-cross' ? 'Celtic Cross' :
                   selectedReading.reading_type === 'relationship' ? 'Relationship Reading' :
                   selectedReading.reading_type === 'career' ? 'Career Reading' :
                   selectedReading.reading_type === 'shadow' ? 'Shadow Work Reading' :
                   selectedReading.reading_type}
                </h3>
                <p className="text-xs text-mystic-400">
                  {new Date(selectedReading.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {selectedReading.context.question && (
              <Card padding="md" className="bg-mystic-800/50">
                <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-2">Your Question</h4>
                <p className="text-sm text-mystic-200">{selectedReading.context.question}</p>
              </Card>
            )}

            <div>
              <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-3">Cards Drawn</h4>
              <div className="flex flex-wrap gap-2">
                {selectedReading.cards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-mystic-800/50 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span className="text-sm text-mystic-200">
                      {card.name}
                      {card.reversed && <span className="text-mystic-400 ml-1">(R)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-mystic-400 uppercase tracking-wider mb-3">Interpretation</h4>
              <Card padding="lg" className="bg-gradient-to-br from-gold/5 via-cosmic-blue/5 to-gold/5 border-gold/20">
                <div className="text-sm text-mystic-200 leading-relaxed whitespace-pre-line">
                  {selectedReading.content}
                </div>
              </Card>
            </div>

            {selectedReading.context.usedLlm && (
              <Card padding="sm" className="bg-mystic-800/30 border-mystic-700">
                <p className="text-xs text-mystic-500 text-center">
                  Generated with AI • Personalized to your profile
                </p>
              </Card>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
