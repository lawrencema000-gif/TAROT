import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Tag,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Trash2,
  TrendingUp,
  Flame,
  BarChart3,
  X,
  Link2,
  Lock,
  Sparkles,
  BookOpen,
  Lightbulb,
  Star,
  FileText,
  Clock,
  Sun,
  Heart,
  Users,
  Moon,
} from 'lucide-react';
import { Card, Button, Sheet, Input, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { journalEntries, tarotReadings } from '../dal';
// horoscopes loaded lazily to keep journal chunk small
import { journalTemplates, templateCategories, getTemplatesForPersonality, JournalTemplate } from '../data/journalTemplates';
import { adsService } from '../services/ads';
import { awardXP } from '../services/levelSystem';
import { useT } from '../i18n/useT';

const moodEmojis = [
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '🙏', label: 'Grateful', value: 'grateful' },
  { emoji: '✨', label: 'Inspired', value: 'inspired' },
  { emoji: '😴', label: 'Tired', value: 'tired' },
  { emoji: '😢', label: 'Sad', value: 'sad' },
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '🥰', label: 'Loved', value: 'loved' },
  { emoji: '🤔', label: 'Thoughtful', value: 'thoughtful' },
];

const categoryTags = [
  { label: 'Love', value: 'love', color: 'bg-cosmic-rose/20 text-cosmic-rose border-cosmic-rose/30' },
  { label: 'Career', value: 'career', color: 'bg-cosmic-blue/20 text-cosmic-blue border-cosmic-blue/30' },
  { label: 'Anxiety', value: 'anxiety', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { label: 'Gratitude', value: 'gratitude', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'Growth', value: 'growth', color: 'bg-gold/20 text-gold border-gold/30' },
  { label: 'Health', value: 'health', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { label: 'Family', value: 'family', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { label: 'Dreams', value: 'dreams', color: 'bg-mystic-400/20 text-mystic-300 border-mystic-400/30' },
];

const moodColors: Record<string, string> = {
  happy: 'bg-yellow-500',
  calm: 'bg-blue-400',
  anxious: 'bg-orange-500',
  grateful: 'bg-emerald-500',
  inspired: 'bg-gold',
  tired: 'bg-mystic-500',
  sad: 'bg-blue-600',
  frustrated: 'bg-red-500',
  loved: 'bg-pink-500',
  thoughtful: 'bg-cyan-400',
};

interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  mood_tags: string[];
  tags: string[];
  prompt?: string;
  linked_reading_id?: string;
  linked_horoscope_id?: string;
  is_locked: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface TarotReading {
  id: string;
  date: string;
  spread_type: string;
  cards: { name: string; position?: string }[];
}

type JournalTab = 'entries' | 'templates' | 'insights';

const ENTRIES_PAGE_SIZE = 20;

const categoryIcons: Record<string, typeof Sun> = {
  daily: Sun,
  weekly: Calendar,
  emotional: Heart,
  growth: TrendingUp,
  relationships: Users,
  reflection: Moon,
};

export function JournalPage() {
  const { t } = useT('app');
  const { user, profile, refreshProfile } = useAuth();
  const { triggerLevelUp } = useGamification();
  const [activeTab, setActiveTab] = useState<JournalTab>('entries');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [linkedReadingId, setLinkedReadingId] = useState<string | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [recentReadings, setRecentReadings] = useState<TarotReading[]>([]);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<JournalTemplate | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const [todayPrompt, setTodayPrompt] = useState<string>(() => {
    // placeholder — translated default replaced via t() once mounted
    return 'What are you reflecting on today?';
  });

  useEffect(() => {
    import('../data/horoscopes').then(m => setTodayPrompt(m.getDailyPrompt(today)));
  }, [today]);

  useEffect(() => {
    loadEntries();
    if (user) loadRecentReadings();
  }, [user]);

  const loadEntries = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const res = await journalEntries.listForUser(user.id, { limit: ENTRIES_PAGE_SIZE });
    if (res.ok) {
      setEntries(res.data as unknown as JournalEntry[]);
      setHasMoreEntries(res.data.length === ENTRIES_PAGE_SIZE);
    }
    setLoading(false);
  };

  const loadMoreEntries = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);

    const offset = entries.length;
    const res = await journalEntries.listForUser(user.id, {
      limit: ENTRIES_PAGE_SIZE,
      offset,
    });

    if (res.ok) {
      setEntries(prev => [...prev, ...(res.data as unknown as JournalEntry[])]);
      setHasMoreEntries(res.data.length === ENTRIES_PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  const loadRecentReadings = async () => {
    if (!user) return;

    const res = await tarotReadings.listRecent(user.id, 10);
    if (res.ok) {
      setRecentReadings(res.data as unknown as TarotReading[]);
    }
  };

  const calendarDays = useMemo(() => {
    const days: { date: Date; dateStr: string; hasEntry: boolean; isToday: boolean }[] = [];
    const startOfWeek = new Date(calendarDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dateStr,
        hasEntry: entries.some(e => e.date === dateStr),
        isToday: dateStr === today,
      });
    }
    return days;
  }, [calendarDate, entries, today]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCalendarDate(newDate);
  };

  const openNewEntry = useCallback(() => {
    setEditingEntry(null);
    setSelectedTemplate(null);
    setCurrentPromptIndex(0);
    setTitle('');
    setContent('');
    setSelectedMood('');
    setSelectedTags([]);
    setLinkedReadingId(null);
    setShowEditor(true);
  }, []);

  const openEditEntry = (entry: JournalEntry) => {
    if (entry.is_locked && !profile?.isPremium) {
      toast(t('journal.toast.unlockPremiumLock'), 'error');
      return;
    }
    setEditingEntry(entry);
    setTitle(entry.title || '');
    setContent(entry.content);
    setSelectedMood(entry.mood || '');
    setSelectedTags(entry.tags || []);
    setLinkedReadingId(entry.linked_reading_id || null);
    setShowEditor(true);
  };

  const openDayEntry = (dateStr: string) => {
    const existingEntry = entries.find(e => e.date === dateStr);
    if (existingEntry) {
      openEditEntry(existingEntry);
    } else {
      setEditingEntry(null);
      setTitle('');
      setContent('');
      setSelectedMood('');
      setSelectedTags([]);
      setLinkedReadingId(null);
      setShowEditor(true);
    }
  };

  const saveEntry = async (lock = false) => {
    if (!user || !content.trim()) return;

    if (lock && !profile?.isPremium) {
      toast(t('journal.toast.upgradeToLock'), 'error');
      return;
    }

    const templatePrompt = selectedTemplate
      ? `${selectedTemplate.title}: ${selectedTemplate.prompts.join(' | ')}`
      : null;

    const entryInput = {
      userId: user.id,
      title: title.trim(),
      content: content.trim(),
      mood: selectedMood,
      moodTags: selectedMood ? [selectedMood] : [],
      tags: selectedTags,
      prompt: editingEntry ? (editingEntry.prompt ?? null) : (templatePrompt || todayPrompt),
      date: editingEntry ? editingEntry.date : today,
      linkedReadingId: linkedReadingId,
      isLocked: lock,
    };

    if (editingEntry) {
      await journalEntries.updateById(editingEntry.id, entryInput);
    } else {
      await journalEntries.insert(entryInput);
    }

    setShowEditor(false);
    setSelectedTemplate(null);
    loadEntries();
    toast(lock ? t('journal.toast.savedLocked') : t('journal.toast.saved'), 'success');

    if (!editingEntry) {
      const xpResult = await awardXP(user.id, 'journal_entry');
      if (xpResult) {
        toast(t('journal.toast.xpEarned', { n: xpResult.xp_earned }), 'success');
        if (xpResult.level_up) {
          triggerLevelUp({
            newLevel: xpResult.new_level,
            seekerRank: xpResult.seeker_rank,
            xpEarned: xpResult.xp_earned,
          });
        }
      }
      await refreshProfile();
      await adsService.checkAndShowAd(profile?.isPremium || false, 'journal', profile?.isAdFree || false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm(t('journal.toast.deleteConfirm'))) return;

    await journalEntries.deleteById(entryId);
    loadEntries();
    toast(t('journal.toast.deleted'), 'success');
  };

  const toggleTag = (tagValue: string) => {
    setSelectedTags(prev =>
      prev.includes(tagValue)
        ? prev.filter(t => t !== tagValue)
        : [...prev, tagValue]
    );
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTagFilter ||
        entry.tags?.includes(selectedTagFilter);

      return matchesSearch && matchesTag;
    });
  }, [entries, searchQuery, selectedTagFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  };

  const todayEntry = entries.find(e => e.date === today);

  const insights = useMemo(() => {
    const moodCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const moodByDay: Record<string, string[]> = {};
    const weeklyActivity: boolean[] = [];

    const last30Days = entries.filter(e => {
      const date = new Date(e.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    });

    last30Days.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
      entry.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      const dayOfWeek = new Date(entry.date).getDay();
      if (!moodByDay[dayOfWeek]) moodByDay[dayOfWeek] = [];
      if (entry.mood) moodByDay[dayOfWeek].push(entry.mood);
    });

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      weeklyActivity.push(entries.some(e => e.date === dateStr));
    }

    const last7DaysMoods: { date: string; mood: string | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = entries.find(e => e.date === dateStr);
      last7DaysMoods.push({
        date: dateStr,
        mood: entry?.mood || null,
      });
    }

    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalMoods = sortedMoods.reduce((sum, [, count]) => sum + count, 0);

    let currentStreak = 0;
    const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = expectedDate.toISOString().split('T')[0];
      if (sortedDates.includes(expectedStr)) {
        currentStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    const positiveMoods = ['happy', 'calm', 'grateful', 'inspired', 'loved'];
    const bestDayMoods: Record<number, number> = {};
    Object.entries(moodByDay).forEach(([day, moods]) => {
      const positiveCount = moods.filter(m => positiveMoods.includes(m)).length;
      bestDayMoods[parseInt(day)] = positiveCount;
    });
    const bestDay = Object.entries(bestDayMoods).sort((a, b) => b[1] - a[1])[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let generatedInsight = '';
    if (sortedTags.length > 0 && bestDay) {
      const topTag = sortedTags[0][0];
      const topMood = sortedMoods[0]?.[0] || 'reflective';
      generatedInsight = `You felt strongest on ${dayNames[parseInt(bestDay[0])]}s when you wrote about ${topTag}. Your ${topMood} entries often coincide with reflection and growth.`;
    }

    return {
      totalEntries: entries.length,
      last30DaysEntries: last30Days.length,
      moodDistribution: sortedMoods.slice(0, 5).map(([mood, count]) => ({
        mood,
        count,
        percentage: totalMoods > 0 ? Math.round((count / totalMoods) * 100) : 0,
      })),
      topTags: sortedTags,
      weeklyActivity,
      last7DaysMoods,
      currentStreak: profile?.streak || currentStreak,
      averageWordsPerEntry: entries.length > 0
        ? Math.round(entries.reduce((sum, e) => sum + (e.word_count || e.content.split(' ').length), 0) / entries.length)
        : 0,
      generatedInsight,
      totalWords: entries.reduce((sum, e) => sum + (e.word_count || e.content.split(' ').length), 0),
    };
  }, [entries, profile?.streak]);

  const getMoodEmoji = (mood: string) => {
    return moodEmojis.find(m => m.value === mood)?.emoji || '📝';
  };

  const filteredTemplates = useMemo(() => {
    if (!selectedTemplateCategory) return journalTemplates;
    return journalTemplates.filter(t => t.category === selectedTemplateCategory);
  }, [selectedTemplateCategory]);

  const recommendedTemplates = useMemo(() => {
    if (!profile) return [];
    return getTemplatesForPersonality(profile.mbtiType, profile.enneagramType);
  }, [profile]);

  const startTemplateEntry = (template: JournalTemplate) => {
    setSelectedTemplate(template);
    setCurrentPromptIndex(0);
    setEditingEntry(null);
    setTitle(template.title);
    setContent('');
    setSelectedMood('');
    setSelectedTags(template.tags || []);
    setLinkedReadingId(null);
    setShowEditor(true);
  };

  const tabs = [
    { id: 'entries' as const, label: t('journal.tabs.entries'), icon: BookOpen },
    { id: 'templates' as const, label: t('journal.tabs.templates'), icon: FileText },
    { id: 'insights' as const, label: t('journal.tabs.insights'), icon: Lightbulb },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-mystic-100">{t('journal.title')}</h1>
        <Button variant="primary" size="sm" onClick={openNewEntry}>
          <Plus className="w-4 h-4" />
          New
        </Button>
      </div>

      <div className="flex gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-mystic-800/50 text-mystic-400 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'entries' && (
        <>
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-1.5 hover:bg-mystic-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-mystic-400" />
              </button>
              <span className="text-sm text-mystic-300">
                {calendarDays[0].date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-1.5 hover:bg-mystic-700/50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-mystic-400" />
              </button>
            </div>
            <div className="flex justify-between gap-1">
              {calendarDays.map(day => (
                <button
                  key={day.dateStr}
                  onClick={() => openDayEntry(day.dateStr)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                    day.isToday
                      ? 'bg-gold/20 border border-gold/30'
                      : day.hasEntry
                      ? 'bg-mystic-700/50 hover:bg-mystic-700'
                      : 'hover:bg-mystic-800/50'
                  }`}
                >
                  <span className="text-xs text-mystic-500">{formatDayName(day.date)}</span>
                  <span className={`text-sm font-medium ${day.isToday ? 'text-gold' : 'text-mystic-200'}`}>
                    {day.date.getDate()}
                  </span>
                  {day.hasEntry && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {!todayEntry && (
            <Card variant="glow" padding="lg" interactive onClick={openNewEntry}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-mystic-500 uppercase tracking-wide mb-1">{t('journal.todaysPrompt')}</p>
                  <p className="text-mystic-100 leading-relaxed mb-2">{todayPrompt}</p>
                  <div className="flex items-center text-gold text-sm">
                    Start writing
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mystic-500" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl pl-12 pr-4 py-3 text-mystic-100 placeholder-mystic-500 focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                !selectedTagFilter
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-mystic-800/50 text-mystic-400 border border-mystic-700'
              }`}
            >
              All
            </button>
            {categoryTags.map(tag => (
              <button
                key={tag.value}
                onClick={() => setSelectedTagFilter(selectedTagFilter === tag.value ? null : tag.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedTagFilter === tag.value ? tag.color : 'bg-mystic-800/50 text-mystic-400 border-mystic-700'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-mystic-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-mystic-400">{t('journal.emptyState')}</p>
              <p className="text-sm text-mystic-500 mt-1">{t('journal.emptyStateSub')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <Card key={entry.id} padding="md" interactive onClick={() => openEditEntry(entry)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-mystic-800 flex items-center justify-center flex-shrink-0 text-xl">
                      {entry.mood ? getMoodEmoji(entry.mood) : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-mystic-500">{formatDate(entry.date)}</span>
                        {entry.is_locked && <Lock className="w-3 h-3 text-gold" />}
                        {entry.linked_reading_id && <Link2 className="w-3 h-3 text-cosmic-blue" />}
                      </div>
                      {entry.title && (
                        <h3 className="font-medium text-mystic-100 mb-1 line-clamp-1">{entry.title}</h3>
                      )}
                      <p className="text-mystic-300 text-sm line-clamp-2">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {entry.tags.map(tagValue => {
                            const tagInfo = categoryTags.find(t => t.value === tagValue);
                            return (
                              <span
                                key={tagValue}
                                className={`px-2 py-0.5 rounded text-xs border ${tagInfo?.color || 'bg-mystic-700/50 text-mystic-300 border-mystic-600'}`}
                              >
                                {tagInfo?.label || tagValue}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditEntry(entry); }}
                        className="p-2 hover:bg-mystic-700/50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-mystic-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                        className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-mystic-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {hasMoreEntries && !searchQuery && !selectedTagFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreEntries}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? t('journal.loadingMore') : t('journal.loadMore')}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {recommendedTemplates.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Recommended for You
              </h3>
              <div className="space-y-3">
                {recommendedTemplates.slice(0, 3).map(template => {
                  const CategoryIcon = categoryIcons[template.category] || FileText;
                  return (
                    <Card key={template.id} padding="md" interactive onClick={() => startTemplateEntry(template)}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                          <CategoryIcon className="w-5 h-5 text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-mystic-100 mb-1">{template.title}</h4>
                          <p className="text-sm text-mystic-400 line-clamp-2">{template.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-mystic-500">
                              <Clock className="w-3 h-3" />
                              {template.timeEstimate}
                            </span>
                            <span className="text-xs text-mystic-500">{template.prompts.length} prompts</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-mystic-500" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedTemplateCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                !selectedTemplateCategory
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-mystic-800/50 text-mystic-400 border border-mystic-700'
              }`}
            >
              All
            </button>
            {Object.entries(templateCategories).map(([key, cat]) => {
              const Icon = categoryIcons[key] || FileText;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTemplateCategory(selectedTemplateCategory === key ? null : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    selectedTemplateCategory === key
                      ? 'bg-gold/20 text-gold border-gold/30'
                      : 'bg-mystic-800/50 text-mystic-400 border-mystic-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filteredTemplates.map(template => {
              const CategoryIcon = categoryIcons[template.category] || FileText;
              const catInfo = templateCategories[template.category as keyof typeof templateCategories];
              return (
                <Card key={template.id} padding="md" interactive onClick={() => startTemplateEntry(template)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-mystic-800`}>
                      <CategoryIcon className="w-5 h-5 text-mystic-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-mystic-100">{template.title}</h4>
                        <span className="text-xs text-mystic-500 px-2 py-0.5 bg-mystic-800 rounded-full">
                          {catInfo?.name}
                        </span>
                      </div>
                      <p className="text-sm text-mystic-400 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-mystic-500">
                          <Clock className="w-3 h-3" />
                          {template.timeEstimate}
                        </span>
                        <span className="text-xs text-mystic-500">{template.prompts.length} prompts</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-mystic-500" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card padding="lg" className="text-center">
              <Flame className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="font-display text-3xl text-mystic-100">{insights.currentStreak}</p>
              <p className="text-xs text-mystic-400 mt-1">{t('journal.dayStreak')}</p>
            </Card>
            <Card padding="lg" className="text-center">
              <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-display text-3xl text-mystic-100">{insights.totalEntries}</p>
              <p className="text-xs text-mystic-400 mt-1">{t('journal.totalEntries')}</p>
            </Card>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">{t('journal.moodTrend')}</h3>
            <div className="flex justify-between gap-1">
              {insights.last7DaysMoods.map((day, i) => {
                const date = new Date(day.date);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        day.mood
                          ? 'bg-mystic-800'
                          : 'bg-mystic-800/30 border border-dashed border-mystic-700'
                      }`}
                    >
                      {day.mood ? getMoodEmoji(day.mood) : ''}
                    </div>
                    <span className="text-xs text-mystic-500">
                      {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {insights.topTags.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-mystic-500" />
                <h3 className="font-medium text-mystic-200">{t('journal.mostCommonTags')}</h3>
              </div>
              <div className="space-y-3">
                {insights.topTags.map(([tagValue, count]) => {
                  const tagInfo = categoryTags.find(t => t.value === tagValue);
                  const maxCount = insights.topTags[0][1];
                  return (
                    <div key={tagValue}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-mystic-300">{tagInfo?.label || tagValue}</span>
                        <span className="text-mystic-500">{count}x</span>
                      </div>
                      <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {insights.moodDistribution.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-mystic-500" />
                <h3 className="font-medium text-mystic-200">{t('journal.moodDistribution')}</h3>
              </div>
              <div className="space-y-3">
                {insights.moodDistribution.map(({ mood, percentage }) => {
                  const moodInfo = moodEmojis.find(m => m.value === mood);
                  return (
                    <div key={mood}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-mystic-300 flex items-center gap-2">
                          <span>{moodInfo?.emoji}</span>
                          <span className="capitalize">{moodInfo?.label || mood}</span>
                        </span>
                        <span className="text-mystic-500">{percentage}%</span>
                      </div>
                      <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${moodColors[mood] || 'bg-gold'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {insights.generatedInsight && (
            <Card padding="lg" className="bg-gold/5 border-gold/20">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gold mb-2">{t('journal.personalInsight')}</h3>
                  <p className="text-mystic-300 text-sm leading-relaxed">{insights.generatedInsight}</p>
                </div>
              </div>
            </Card>
          )}

          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-mystic-500" />
              <h3 className="font-medium text-mystic-200">{t('journal.thisWeek')}</h3>
            </div>
            <div className="flex justify-between gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      insights.weeklyActivity[i]
                        ? 'bg-gold text-mystic-950'
                        : 'bg-mystic-800 text-mystic-500'
                    }`}
                  >
                    {insights.weeklyActivity[i] && (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-mystic-500">{day}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">{t('journal.writingStats')}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl font-display text-gold">{insights.averageWordsPerEntry}</p>
                <p className="text-xs text-mystic-400">{t('journal.avgWords')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-display text-cosmic-blue">{insights.last30DaysEntries}</p>
                <p className="text-xs text-mystic-400">{t('journal.last30Days')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-display text-emerald-400">{insights.totalWords.toLocaleString()}</p>
                <p className="text-xs text-mystic-400">{t('journal.totalWords')}</p>
              </div>
            </div>
          </Card>

          {entries.length === 0 && (
            <Card padding="lg" className="text-center">
              <p className="text-mystic-400">{t('journal.insightsEmpty')}</p>
              <Button variant="primary" className="mt-4" onClick={openNewEntry}>
                Start Writing
              </Button>
            </Card>
          )}
        </div>
      )}

      <Sheet open={showEditor} onClose={() => { setShowEditor(false); setSelectedTemplate(null); }} title={editingEntry ? t('journal.editSheet.editEntry') : selectedTemplate ? selectedTemplate.title : t('journal.editSheet.newEntry')}>
        <div className="flex flex-col h-full -m-6">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {!editingEntry && selectedTemplate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mystic-500 uppercase tracking-wide">
                    Prompt {currentPromptIndex + 1} of {selectedTemplate.prompts.length}
                  </span>
                  <div className="flex gap-1">
                    {selectedTemplate.prompts.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPromptIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentPromptIndex ? 'bg-gold' : i < currentPromptIndex ? 'bg-emerald-500' : 'bg-mystic-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl">
                  <p className="text-mystic-100">{selectedTemplate.prompts[currentPromptIndex]}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1))}
                    disabled={currentPromptIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPromptIndex(Math.min(selectedTemplate.prompts.length - 1, currentPromptIndex + 1))}
                    disabled={currentPromptIndex === selectedTemplate.prompts.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {!editingEntry && !selectedTemplate && (
              <div className="p-4 bg-mystic-800/30 rounded-xl">
                <p className="text-xs text-mystic-500 uppercase tracking-wide mb-1">Today&apos;s Prompt</p>
                <p className="text-mystic-200 text-sm">{todayPrompt}</p>
              </div>
            )}

            <Input
              label="Title (optional)"
              placeholder="Give your entry a name..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-mystic-300 mb-2">{t('journal.editSheet.yourThoughts')}</label>
              <textarea
                placeholder="Write your reflection..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                className="w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl px-4 py-3 text-mystic-100 placeholder-mystic-500 focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mystic-300 mb-3">{t('journal.editSheet.howFeeling')}</label>
              <div className="flex flex-wrap gap-2">
                {moodEmojis.map(mood => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(selectedMood === mood.value ? '' : mood.value)}
                    className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                      selectedMood === mood.value
                        ? 'bg-gold/20 border-2 border-gold scale-110'
                        : 'bg-mystic-800/50 border border-mystic-700 hover:border-mystic-500'
                    }`}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-mystic-300 mb-3">{t('journal.editSheet.tags')}</label>
              <div className="flex flex-wrap gap-2">
                {categoryTags.map(tag => (
                  <button
                    key={tag.value}
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selectedTags.includes(tag.value) ? tag.color : 'bg-mystic-800/50 text-mystic-400 border-mystic-700'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-mystic-300 mb-3">{t('journal.editSheet.attachments')}</label>
              {linkedReadingId ? (
                <div className="flex items-center gap-3 p-3 bg-cosmic-blue/10 border border-cosmic-blue/30 rounded-xl">
                  <Link2 className="w-5 h-5 text-cosmic-blue" />
                  <span className="text-sm text-mystic-200 flex-1">{t('journal.editSheet.tarotLinked')}</span>
                  <button
                    onClick={() => setLinkedReadingId(null)}
                    className="p-1 hover:bg-mystic-700 rounded"
                  >
                    <X className="w-4 h-4 text-mystic-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAttachmentPicker(true)}
                  className="w-full p-3 border border-dashed border-mystic-600 rounded-xl text-mystic-400 hover:border-gold/50 hover:text-gold transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Link a tarot reading
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-mystic-800 p-6 pb-24 space-y-3 bg-mystic-900 safe-bottom">
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth onClick={() => saveEntry(false)} disabled={!content.trim()}>
                Save
              </Button>
            </div>

            {profile?.isPremium && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => saveEntry(true)}
                disabled={!content.trim()}
                className="border-gold/30 text-gold"
              >
                <Lock className="w-4 h-4 mr-2" />
                Save + Lock
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      <Sheet
        open={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        title="Link Reading"
      >
        <div className="space-y-3">
          {recentReadings.length === 0 ? (
            <p className="text-center text-mystic-400 py-8">{t('journal.noReadings')}</p>
          ) : (
            recentReadings.map(reading => (
              <button
                key={reading.id}
                onClick={() => {
                  setLinkedReadingId(reading.id);
                  setShowAttachmentPicker(false);
                }}
                className="w-full p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl hover:border-gold/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cosmic-blue/20 flex items-center justify-center">
                    <span className="text-lg">🎴</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-mystic-200 capitalize">{reading.spread_type} Spread</p>
                    <p className="text-xs text-mystic-500">
                      {new Date(reading.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {reading.cards.slice(0, 2).map(c => c.name).join(', ')}
                      {reading.cards.length > 2 && '...'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Sheet>
    </div>
  );
}
