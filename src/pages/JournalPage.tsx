import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Flame,
  TrendingUp,
  X,
  Link2,
  Lock,
  Sparkles,
  BookOpen,
  Lightbulb,
  FileText,
  Clock,
  Sun,
  Heart,
  Users,
  Moon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Sheet,
  Input,
  toast,
  dismissToasts,
  PageHeader,
  Section,
  EmptyState,
  Page,
  Tabs,
  Chip,
  Tag,
  Skeleton,
  EyebrowLabel,
  ListRow,
  ListRowGroup,
  PageGrid,
  Paper,
  TarotCardIcon,
  type Tone,
} from '../components/ui';
import { MoodGlyph, JOURNAL_MOOD_GLYPHS, type MoodGlyphId } from '../components/journal/MoodGlyphs';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { journalEntries, tarotReadings } from '../dal';
import { journalTemplates, templateCategories, getTemplatesForPersonality, JournalTemplate } from '../data/journalTemplates';
import { MOOD_CATEGORIES, getTodayEntry as getTodayMood } from '../data/moodDiary';
import { adsService } from '../services/ads';
import { awardXP } from '../services/levelSystem';
import { useT } from '../i18n/useT';
import { getDailyPrompt } from '../data/dailyPrompts';
import { localDateStr, parseLocalDate } from '../utils/localDate';

/**
 * The ten moods. `value` is what the row stores; the label comes from
 * `journal.moodNames.*` at render time; the glyph is drawn (MoodGlyphs).
 */
const MOODS: { value: string; defaultLabel: string; tone: Tone }[] = [
  { value: 'happy', defaultLabel: 'Happy', tone: 'gold' },
  { value: 'calm', defaultLabel: 'Calm', tone: 'blue' },
  { value: 'anxious', defaultLabel: 'Anxious', tone: 'coral' },
  { value: 'grateful', defaultLabel: 'Grateful', tone: 'teal' },
  { value: 'inspired', defaultLabel: 'Inspired', tone: 'gold' },
  { value: 'tired', defaultLabel: 'Tired', tone: 'neutral' },
  { value: 'sad', defaultLabel: 'Sad', tone: 'blue' },
  { value: 'frustrated', defaultLabel: 'Frustrated', tone: 'coral' },
  { value: 'loved', defaultLabel: 'Loved', tone: 'rose' },
  { value: 'thoughtful', defaultLabel: 'Thoughtful', tone: 'teal' },
];

const TAGS: { value: string; defaultLabel: string; tone: Tone }[] = [
  { value: 'love', defaultLabel: 'Love', tone: 'rose' },
  { value: 'career', defaultLabel: 'Career', tone: 'blue' },
  { value: 'anxiety', defaultLabel: 'Anxiety', tone: 'coral' },
  { value: 'gratitude', defaultLabel: 'Gratitude', tone: 'teal' },
  { value: 'growth', defaultLabel: 'Growth', tone: 'gold' },
  { value: 'health', defaultLabel: 'Health', tone: 'teal' },
  { value: 'family', defaultLabel: 'Family', tone: 'rose' },
  { value: 'dreams', defaultLabel: 'Dreams', tone: 'neutral' },
];

const POSITIVE_MOODS = ['happy', 'calm', 'grateful', 'inspired', 'loved'];

/** Five muted hues for the two insight bar charts (design cues §6.7). */
const BAR_HUES = ['bg-cosmic-violet', 'bg-coral-dark', 'bg-cosmic-blue', 'bg-gold-dark', 'bg-teal-dark'];

/** The abbreviation on a row's trailing Tag for its linked spread. */
const SPREAD_ABBR: Record<string, string> = {
  single: 'I',
  'single-card': 'I',
  daily: 'I',
  'three-card': 'III',
  'past-present-future': 'III',
  'celtic-cross': 'CC',
  horseshoe: 'HS',
  relationship: 'REL',
  'yes-no': 'Y/N',
};

function spreadAbbr(type: string | undefined): string {
  if (!type) return '';
  return SPREAD_ABBR[type] ?? type.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase();
}

/** The gate for the generated insight: enough entries, and some variety to speak of. */
const INSIGHT_MIN_ENTRIES = 5;

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

/** True at the `lg` breakpoint — the PageGrid aside is mounted only there. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return isDesktop;
}

function snippet(text: string, max = 72): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function JournalPage() {
  const { t } = useT('app');
  const locale = getLocale();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { user, profile, refreshProfile } = useAuth();
  const { triggerLevelUp } = useGamification();
  const journalCoachEnabled = useFeatureFlag('journal-coach');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<{ observation: string; prompts: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<JournalTab>('entries');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // The user's local day, as the mood diary and the ritual count it. A
  // UTC date put an 08:00 Tokyo entry on "yesterday".
  const today = localDateStr();
  // The day a new entry is written FOR. Tapping a past day in the week
  // strip sets it; "Write today" resets it (R6 A5: every entry used to
  // land on today).
  const [draftDate, setDraftDate] = useState(today);
  const [todayPrompt, setTodayPrompt] = useState<string>(() => t('journal.defaultPrompt', { defaultValue: 'What are you reflecting on today?' }));

  useEffect(() => {
    setTodayPrompt(getDailyPrompt(today));
  }, [today]);

  useEffect(() => {
    loadEntries();
    if (user) loadRecentReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Labels ──────────────────────────────────────────────────────────
  const moodLabel = useCallback(
    (value: string) => {
      const m = MOODS.find(x => x.value === value);
      return t(`journal.moodNames.${value}`, { defaultValue: m?.defaultLabel ?? value });
    },
    [t],
  );
  const moodTone = (value: string): Tone => MOODS.find(x => x.value === value)?.tone ?? 'neutral';
  const moodGlyph = (value: string): MoodGlyphId => JOURNAL_MOOD_GLYPHS[value] ?? 'cloud';
  const tagLabel = useCallback(
    (value: string) => {
      const x = TAGS.find(tag => tag.value === value);
      return t(`journal.tagNames.${value}`, { defaultValue: x?.defaultLabel ?? value });
    },
    [t],
  );
  const tagTone = (value: string): Tone => TAGS.find(x => x.value === value)?.tone ?? 'neutral';

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }), [locale]);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }), [locale]);
  const narrowDayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }), [locale]);
  const longDayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
  const shortDateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }), [locale]);
  const numberFmt = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const formatDate = (dateStr: string) => dateFmt.format(parseLocalDate(dateStr));

  // ── Week strip ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const days: { date: Date; dateStr: string; hasEntry: boolean; isToday: boolean; isFuture: boolean }[] = [];
    const startOfWeek = new Date(calendarDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = localDateStr(date);
      days.push({
        date,
        dateStr,
        hasEntry: entries.some(e => e.date === dateStr),
        isToday: dateStr === today,
        isFuture: dateStr > today,
      });
    }
    return days;
  }, [calendarDate, entries, today]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCalendarDate(newDate);
  };

  // ── Editor ──────────────────────────────────────────────────────────
  const resetDraft = () => {
    setEditingEntry(null);
    setSelectedTemplate(null);
    setCurrentPromptIndex(0);
    setTitle('');
    setContent('');
    setSelectedMood('');
    setSelectedTags([]);
    setLinkedReadingId(null);
    setCoachResult(null);
  };

  const openNewEntry = useCallback(() => {
    resetDraft();
    setDraftDate(today);
    setShowEditor(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const openEditEntry = (entry: JournalEntry) => {
    if (entry.is_locked && !profile?.isPremium) {
      toast(t('journal.toast.unlockPremiumLock'), 'error');
      return;
    }
    resetDraft();
    setEditingEntry(entry);
    setDraftDate(entry.date);
    setTitle(entry.title || '');
    setContent(entry.content);
    setSelectedMood(entry.mood || '');
    setSelectedTags(entry.tags || []);
    setLinkedReadingId(entry.linked_reading_id || null);
    setShowEditor(true);
  };

  const openDayEntry = (dateStr: string) => {
    if (dateStr > today) return;
    const existingEntry = entries.find(e => e.date === dateStr);
    if (existingEntry) {
      openEditEntry(existingEntry);
    } else {
      resetDraft();
      setDraftDate(dateStr);
      setShowEditor(true);
    }
  };

  const closeEditor = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
  };

  const saveEntry = async (lock = false) => {
    if (!user || !content.trim() || saving) return;

    if (lock && !profile?.isPremium) {
      toast(t('journal.toast.upgradeToLock'), 'error');
      return;
    }

    const templatePrompt = selectedTemplate
      ? `${selectedTemplate.title}: ${selectedTemplate.prompts.join(' | ')}`
      : null;

    const entryDate = editingEntry ? editingEntry.date : draftDate;
    const entryInput = {
      userId: user.id,
      title: title.trim(),
      content: content.trim(),
      mood: selectedMood,
      moodTags: selectedMood ? [selectedMood] : [],
      tags: selectedTags,
      prompt: editingEntry ? (editingEntry.prompt ?? null) : (templatePrompt || (entryDate === today ? todayPrompt : null)),
      date: entryDate,
      linkedReadingId: linkedReadingId,
      isLocked: lock,
    };

    setSaving(true);
    const res = editingEntry
      ? await journalEntries.updateById(editingEntry.id, entryInput)
      : await journalEntries.insert(entryInput);
    setSaving(false);

    if (!res.ok) {
      toast(t('journal.toast.saveFailed', { defaultValue: 'Couldn’t save this entry — check your connection and try again.' }), 'error');
      return;
    }

    const wasNew = !editingEntry;
    closeEditor();
    loadEntries();
    // One confirmation. Anything an earlier step complained about (a coach
    // error, a failed save) is withdrawn by the success (R6 A23).
    dismissToasts();

    if (!wasNew) {
      toast(lock ? t('journal.toast.savedLocked') : t('journal.toast.saved'), 'success');
      return;
    }

    const xpResult = await awardXP(user.id, 'journal_entry');
    if (xpResult && xpResult.xp_earned > 0) {
      toast(
        lock
          ? t('journal.toast.savedLockedXp', { defaultValue: 'Saved and locked · +{{n}} XP', n: xpResult.xp_earned })
          : t('journal.toast.savedXp', { defaultValue: 'Saved · +{{n}} XP', n: xpResult.xp_earned }),
        'success',
      );
      if (xpResult.level_up) {
        triggerLevelUp({
          newLevel: xpResult.new_level,
          seekerRank: xpResult.seeker_rank,
          xpEarned: xpResult.xp_earned,
        });
      }
    } else {
      toast(lock ? t('journal.toast.savedLocked') : t('journal.toast.saved'), 'success');
    }
    await refreshProfile();
    await adsService.checkAndShowAd(profile?.isPremium || false, 'journal', profile?.isAdFree || false);
  };

  const confirmDelete = async () => {
    if (!user || !pendingDelete || deleting) return;
    setDeleting(true);
    const res = await journalEntries.deleteById(pendingDelete.id, user.id);
    setDeleting(false);
    if (!res.ok) {
      toast(t('journal.toast.deleteFailed', { defaultValue: 'Couldn’t delete this entry — try again.' }), 'error');
      return;
    }
    setPendingDelete(null);
    if (editingEntry?.id === pendingDelete.id) closeEditor();
    loadEntries();
    toast(t('journal.toast.deleted'), 'success');
  };

  const toggleTag = (tagValue: string) => {
    setSelectedTags(prev =>
      prev.includes(tagValue)
        ? prev.filter(x => x !== tagValue)
        : [...prev, tagValue]
    );
  };

  // ── Lists ───────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter(entry => {
      const matchesSearch = !q ||
        entry.content.toLowerCase().includes(q) ||
        entry.title?.toLowerCase().includes(q) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(q) || tagLabel(tag).toLowerCase().includes(q));

      const matchesTag = !selectedTagFilter ||
        entry.tags?.includes(selectedTagFilter);

      return matchesSearch && matchesTag;
    });
  }, [entries, searchQuery, selectedTagFilter, tagLabel]);

  const todayEntry = entries.find(e => e.date === today);
  const todayMood = getTodayMood();

  const readingById = useMemo(() => {
    const map = new Map<string, TarotReading>();
    for (const r of recentReadings) map.set(r.id, r);
    return map;
  }, [recentReadings]);

  const insights = useMemo(() => {
    const moodCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const writingDays: Record<number, number> = {};
    const positiveByDay: Record<number, number> = {};
    const weeklyActivity: boolean[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = entries.filter(e => parseLocalDate(e.date) >= thirtyDaysAgo);

    for (const entry of entries) {
      if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      for (const tag of entry.tags ?? []) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      const day = parseLocalDate(entry.date).getDay();
      writingDays[day] = (writingDays[day] || 0) + 1;
      if (entry.mood && POSITIVE_MOODS.includes(entry.mood)) positiveByDay[day] = (positiveByDay[day] || 0) + 1;
    }

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      weeklyActivity.push(entries.some(e => e.date === localDateStr(date)));
    }

    const last7DaysMoods: { date: string; mood: string | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = localDateStr(date);
      const entry = entries.find(e => e.date === dateStr);
      last7DaysMoods.push({ date: dateStr, mood: entry?.mood || null });
    }

    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    const totalMoods = sortedMoods.reduce((sum, [, count]) => sum + count, 0);

    let currentStreak = 0;
    const dateSet = new Set(entries.map(e => e.date));
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (dateSet.has(localDateStr(d))) currentStreak++;
      else if (i === 0) continue;
      else break;
      if (i > 400) break;
    }

    const busiestDay = Object.entries(writingDays).sort((a, b) => b[1] - a[1])[0];

    // Enough entries, and more than one mood or more than one theme —
    // otherwise there is no pattern to report and we say so (R6 A13).
    const hasSignal =
      entries.length >= INSIGHT_MIN_ENTRIES && (sortedMoods.length >= 2 || sortedTags.length >= 2);

    const wordCount = (e: JournalEntry) => e.word_count || e.content.split(/\s+/).filter(Boolean).length;
    const totalWords = entries.reduce((sum, e) => sum + wordCount(e), 0);

    return {
      totalEntries: entries.length,
      last30DaysEntries: last30Days.length,
      moodDistribution: sortedMoods.slice(0, 5).map(([mood, count]) => ({
        mood,
        count,
        percentage: totalMoods > 0 ? Math.round((count / totalMoods) * 100) : 0,
      })),
      topTags: sortedTags.slice(0, 5),
      weeklyActivity,
      last7DaysMoods,
      currentStreak: profile?.streak || currentStreak,
      averageWordsPerEntry: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
      totalWords,
      hasSignal,
      busiestDay: busiestDay ? Number(busiestDay[0]) : null,
      topMood: sortedMoods[0] ?? null,
      topTag: sortedTags[0] ?? null,
      totalMoods,
    };
  }, [entries, profile?.streak]);

  const generatedInsight = useMemo(() => {
    if (!insights.hasSignal || insights.busiestDay === null || !insights.topMood) return '';
    // A date on the busiest weekday, for Intl to name it.
    const d = new Date();
    d.setDate(d.getDate() + ((insights.busiestDay - d.getDay() + 7) % 7));
    const weekday = longDayFmt.format(d);
    const common = {
      weekday,
      mood: moodLabel(insights.topMood[0]),
      n: insights.topMood[1],
      total: insights.totalMoods,
    };
    return insights.topTag
      ? t('journal.insight.withTag', {
          defaultValue: 'You write most often on {{weekday}}. Your most common mood is {{mood}} ({{n}} of {{total}} entries), and you return to {{tag}} more than any other theme.',
          ...common,
          tag: tagLabel(insights.topTag[0]),
        })
      : t('journal.insight.summary', {
          defaultValue: 'You write most often on {{weekday}}. Your most common mood is {{mood}} ({{n}} of {{total}} entries).',
          ...common,
        });
  }, [insights, longDayFmt, moodLabel, tagLabel, t]);

  const filteredTemplates = useMemo(() => {
    if (!selectedTemplateCategory) return journalTemplates;
    return journalTemplates.filter(x => x.category === selectedTemplateCategory);
  }, [selectedTemplateCategory]);

  const recommendedTemplates = useMemo(() => {
    if (!profile) return [];
    return getTemplatesForPersonality(profile.mbtiType, profile.enneagramType);
  }, [profile]);

  const startTemplateEntry = (template: JournalTemplate) => {
    resetDraft();
    setSelectedTemplate(template);
    setDraftDate(today);
    setTitle(template.title);
    setSelectedTags(template.tags || []);
    setShowEditor(true);
  };

  const tabs = [
    { id: 'entries' as const, label: t('journal.tabs.entries') },
    { id: 'templates' as const, label: t('journal.tabs.templates') },
    { id: 'insights' as const, label: t('journal.tabs.insights') },
  ];

  const newEntryLabel = t('journal.newEntry', { defaultValue: 'New entry' });
  const writeTodayLabel = todayEntry
    ? t('journal.openToday', { defaultValue: 'Open today’s entry' })
    : t('journal.writeToday', { defaultValue: 'Write today' });
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isSearching = Boolean(searchQuery.trim() || selectedTagFilter);
  const editorDateLabel = formatDate(draftDate);

  const promptCard = !todayEntry && (
    <Card padding="lg" interactive onClick={openNewEntry}>
      <EyebrowLabel align="left" className="block mb-2">{t('journal.todaysPrompt')}</EyebrowLabel>
      <p className="heading-display-md heading-strong text-mystic-100 text-balance">{todayPrompt}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-meta font-medium text-gold">
        {t('journal.startWritingCta', { defaultValue: 'Start writing' })}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </span>
    </Card>
  );

  const templateRow = (template: JournalTemplate, tone: 'gold' | 'neutral') => {
    const CategoryIcon = categoryIcons[template.category] || FileText;
    const catInfo = templateCategories[template.category as keyof typeof templateCategories];
    return (
      <ListRow
        key={template.id}
        icon={<CategoryIcon />}
        tone={tone}
        label={template.title}
        meta={
          <>
            <span className="tracking-[0.08em] uppercase text-caption text-mystic-500">
              {t(`journal.templateCategories.${template.category}`, { defaultValue: catInfo?.name ?? template.category })}
              {' · '}
              {template.timeEstimate}
              {' · '}
              {t('journal.promptCount', { defaultValue: '{{n}} prompts', n: template.prompts.length })}
            </span>
            <span className="block">{template.description}</span>
          </>
        }
        onClick={() => startTemplateEntry(template)}
      />
    );
  };

  const entriesMain = (
    <div className="space-y-4">
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => navigateWeek('prev')}
            aria-label={t('journal.prevWeek', { defaultValue: 'Previous week' })}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-inset text-mystic-400 [@media(hover:hover)]:hover:bg-mystic-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <span className="text-meta tracking-[0.08em] uppercase text-mystic-300 tabular-nums">
            {monthFmt.format(calendarDays[0].date)}
          </span>
          <button
            type="button"
            onClick={() => navigateWeek('next')}
            aria-label={t('journal.nextWeek', { defaultValue: 'Next week' })}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-inset text-mystic-400 [@media(hover:hover)]:hover:bg-mystic-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label={t('journal.weekStrip', { defaultValue: 'This week' })}>
          {calendarDays.map(day => (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => openDayEntry(day.dateStr)}
              disabled={day.isFuture}
              aria-label={`${formatDate(day.dateStr)}${day.hasEntry ? ` · ${t('journal.hasEntry', { defaultValue: 'has an entry' })}` : ''}`}
              aria-current={day.isToday ? 'date' : undefined}
              className={`flex flex-col items-center gap-1 py-2 rounded-inset border transition-[background-color,border-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-40 ${
                day.isToday
                  ? 'bg-gold/10 border-gold/40'
                  : day.hasEntry
                  ? 'bg-mystic-800 border-mystic-700 [@media(hover:hover)]:hover:border-mystic-500'
                  : 'border-transparent [@media(hover:hover)]:hover:bg-mystic-800'
              }`}
            >
              <span className="text-caption text-mystic-500">{narrowDayFmt.format(day.date)}</span>
              <span className={`text-ui font-medium tabular-nums ${day.isToday ? 'text-gold' : 'text-mystic-200'}`}>
                {day.date.getDate()}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${day.hasEntry ? 'bg-gold' : 'bg-transparent'}`} aria-hidden />
            </button>
          ))}
        </div>
      </Card>

      <Input
        type="search"
        placeholder={t('journal.searchPlaceholder', { defaultValue: 'Search entries' })}
        aria-label={t('journal.searchPlaceholder', { defaultValue: 'Search entries' })}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        icon={<Search className="w-5 h-5" aria-hidden />}
      />

      <Button variant="gold" fullWidth onClick={todayEntry ? () => openEditEntry(todayEntry) : openNewEntry}>
        <Plus className="w-4 h-4" aria-hidden />
        {writeTodayLabel}
      </Button>

      <ListRowGroup>
        <ListRow
          icon={<MoodGlyph glyph={todayMood ? MOOD_CATEGORIES[todayMood.category].glyph : 'sun'} size={20} />}
          tone="teal"
          label={t('journal.dailyMood', { defaultValue: 'Daily mood' })}
          meta={t('journal.dailyMoodSub', { defaultValue: 'Log how today feels in one tap' })}
          value={todayMood ? t(`mood.categories.${todayMood.category}.name`, { defaultValue: MOOD_CATEGORIES[todayMood.category].name }) : undefined}
          onClick={() => navigate('/mood-diary')}
        />
      </ListRowGroup>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={t('journal.editSheet.tags')}>
        <Chip
          label={t('journal.filterAll', { defaultValue: 'All' })}
          selected={!selectedTagFilter}
          onSelect={() => setSelectedTagFilter(null)}
          size="sm"
        />
        {TAGS.map(tag => (
          <Chip
            key={tag.value}
            label={tagLabel(tag.value)}
            selected={selectedTagFilter === tag.value}
            onSelect={() => setSelectedTagFilter(selectedTagFilter === tag.value ? null : tag.value)}
            size="sm"
          />
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-card" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        isSearching ? (
          <EmptyState
            icon={<Search />}
            title={
              searchQuery.trim()
                ? t('journal.searchMiss', { defaultValue: 'Nothing matches ‘{{query}}’', query: searchQuery.trim() })
                : t('journal.filterMiss', { defaultValue: 'No entries tagged {{tag}} yet', tag: tagLabel(selectedTagFilter ?? '') })
            }
            description={t('journal.searchMissSub', { defaultValue: 'Try another word, or clear the filter.' })}
            action={
              <Button variant="ghost" onClick={() => { setSearchQuery(''); setSelectedTagFilter(null); }}>
                {t('journal.clearSearch', { defaultValue: 'Clear' })}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<BookOpen />}
            title={t('journal.emptyState')}
            description={t('journal.emptyStateSub')}
            action={
              <Button variant="gold" onClick={openNewEntry}>
                <Plus className="w-4 h-4" aria-hidden />
                {t('journal.writeToday', { defaultValue: 'Write today' })}
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-3">
          <ListRowGroup>
            {filteredEntries.map(entry => {
              const reading = entry.linked_reading_id ? readingById.get(entry.linked_reading_id) : undefined;
              const abbr = reading ? spreadAbbr(reading.spread_type) : '';
              const body = snippet(entry.content);
              return (
                <ListRow
                  key={entry.id}
                  icon={<MoodGlyph glyph={moodGlyph(entry.mood)} size={20} />}
                  tone={entry.mood ? moodTone(entry.mood) : 'neutral'}
                  label={entry.title || body}
                  meta={
                    <>
                      <span className="tracking-[0.08em] uppercase text-caption text-mystic-500">{formatDate(entry.date)}</span>
                      {entry.title && <span className="block">{body}</span>}
                    </>
                  }
                  trailing={
                    <span className="flex items-center gap-2 shrink-0">
                      {entry.is_locked && <Lock className="w-3.5 h-3.5 text-mystic-500" aria-label={t('journal.lock.locked')} />}
                      {entry.linked_reading_id && (
                        <Tag tone="blue" icon={<Link2 className="w-3 h-3" aria-hidden />}>
                          {abbr || t('journal.linkedShort', { defaultValue: 'Reading' })}
                        </Tag>
                      )}
                      <ChevronRight className="w-5 h-5 text-mystic-500" aria-hidden />
                    </span>
                  }
                  onClick={() => openEditEntry(entry)}
                />
              );
            })}
          </ListRowGroup>
          {hasMoreEntries && !isSearching && (
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
    </div>
  );

  const entriesAside = (
    <div className="space-y-4">
      {promptCard}
      <Card padding="md">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-mystic-800 rounded-control p-3 text-center">
            <Flame className="w-4 h-4 text-gold mx-auto mb-1" aria-hidden />
            <p className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.currentStreak)}</p>
            <p className="text-caption text-mystic-500">{t('journal.dayStreak')}</p>
          </div>
          <div className="bg-mystic-800 rounded-control p-3 text-center">
            <BookOpen className="w-4 h-4 text-teal mx-auto mb-1" aria-hidden />
            <p className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.totalEntries)}</p>
            <p className="text-caption text-mystic-500">{t('journal.totalEntries')}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setActiveTab('insights')}>
          {t('journal.seeInsights', { defaultValue: 'See insights' })}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Button>
      </Card>
    </div>
  );

  return (
    <Page spacing="sm">
      <PageHeader
        title={t('journal.title')}
        action={
          <Button variant="primary" size="sm" onClick={openNewEntry} aria-label={newEntryLabel}>
            <Plus className="w-4 h-4" aria-hidden />
            <span className="hidden min-[400px]:inline">{newEntryLabel}</span>
          </Button>
        }
      />

      <Tabs<JournalTab>
        items={tabs}
        value={activeTab}
        onChange={setActiveTab}
        aria-label={t('journal.title') as string}
        idPrefix="journal"
      />

      {activeTab === 'entries' && (
        isDesktop ? (
          <PageGrid aside={entriesAside} asideLabel={t('journal.todaysPrompt')}>
            {entriesMain}
          </PageGrid>
        ) : (
          entriesMain
        )
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {recommendedTemplates.length > 0 && (
            <Section
              headingLevel="h3"
              spacing="sm"
              title={t('journal.recommended', { defaultValue: 'Recommended for you' })}
            >
              <ListRowGroup>
                {recommendedTemplates.slice(0, 3).map(template => templateRow(template, 'gold'))}
              </ListRowGroup>
            </Section>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={t('journal.tabs.templates')}>
            <Chip
              label={t('journal.filterAll', { defaultValue: 'All' })}
              selected={!selectedTemplateCategory}
              onSelect={() => setSelectedTemplateCategory(null)}
              size="sm"
            />
            {Object.entries(templateCategories).map(([key, cat]) => (
              <Chip
                key={key}
                label={t(`journal.templateCategories.${key}`, { defaultValue: cat.name })}
                selected={selectedTemplateCategory === key}
                onSelect={() => setSelectedTemplateCategory(selectedTemplateCategory === key ? null : key)}
                size="sm"
              />
            ))}
          </div>

          <ListRowGroup>
            {filteredTemplates.map(template => templateRow(template, 'neutral'))}
          </ListRowGroup>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card padding="lg" className="text-center">
              <Flame className="w-6 h-6 text-gold mx-auto mb-2" aria-hidden />
              <p className="text-display font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.currentStreak)}</p>
              <p className="text-meta text-mystic-400 mt-1">{t('journal.dayStreak')}</p>
            </Card>
            <Card padding="lg" className="text-center">
              <BookOpen className="w-6 h-6 text-teal mx-auto mb-2" aria-hidden />
              <p className="text-display font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.totalEntries)}</p>
              <p className="text-meta text-mystic-400 mt-1">{t('journal.totalEntries')}</p>
            </Card>
          </div>

          <Section headingLevel="h3" title={t('journal.personalInsight')}>
            <Card padding="lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" aria-hidden />
                <p className="text-ui text-mystic-200 leading-relaxed">
                  {generatedInsight ||
                    t('journal.insight.notYet', {
                      defaultValue: 'Write a few more entries — a pattern shows here once there are five with more than one mood or theme.',
                    })}
                </p>
              </div>
            </Card>
          </Section>

          <Section title={t('journal.moodTrend')} headingLevel="h3">
            <div className="grid grid-cols-7 gap-1">
              {insights.last7DaysMoods.map((day) => {
                const date = parseLocalDate(day.date);
                return (
                  <div key={day.date} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-control flex items-center justify-center ${
                        day.mood
                          ? `bg-mystic-800 ${TILE_INK[moodTone(day.mood)]}`
                          : 'border border-dashed border-mystic-700 text-mystic-700'
                      }`}
                      title={day.mood ? moodLabel(day.mood) : undefined}
                    >
                      {day.mood && <MoodGlyph glyph={moodGlyph(day.mood)} size={20} aria-label={moodLabel(day.mood)} />}
                    </div>
                    <span className="text-caption text-mystic-500">{narrowDayFmt.format(date)}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {insights.moodDistribution.length > 0 && (
            <Section headingLevel="h3" title={t('journal.commonMoods', { defaultValue: 'Common moods' })}>
              <Card padding="md">
                <ul className="space-y-3">
                  {insights.moodDistribution.map(({ mood, count, percentage }, i) => (
                    <li key={mood}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="flex items-center gap-2 text-ui text-mystic-200 min-w-0">
                          <MoodGlyph glyph={moodGlyph(mood)} size={16} className="shrink-0 text-mystic-400" />
                          <span className="truncate">{moodLabel(mood)}</span>
                        </span>
                        <span className="text-meta text-mystic-400 tabular-nums shrink-0">
                          {numberFmt.format(count)} · {percentage}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-mystic-800 overflow-hidden" role="presentation">
                        <div className={`h-full rounded-full ${BAR_HUES[i % BAR_HUES.length]}`} style={{ width: `${Math.max(4, percentage)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          {insights.topTags.length > 0 && (
            <Section headingLevel="h3" title={t('journal.commonTags', { defaultValue: 'Common tags' })}>
              <Card padding="md">
                <ul className="space-y-3">
                  {insights.topTags.map(([tagValue, count], i) => {
                    const max = insights.topTags[0][1];
                    const pct = Math.round((count / max) * 100);
                    return (
                      <li key={tagValue}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-ui text-mystic-200 truncate">{tagLabel(tagValue)}</span>
                          <span className="text-meta text-mystic-400 tabular-nums shrink-0">
                            {t('journal.timesCount', { defaultValue: '{{n}}×', n: numberFmt.format(count) })}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-mystic-800 overflow-hidden" role="presentation">
                          <div className={`h-full rounded-full ${BAR_HUES[i % BAR_HUES.length]}`} style={{ width: `${Math.max(4, pct)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Section>
          )}

          <Section headingLevel="h3" title={t('journal.thisWeek')}>
            <div className="grid grid-cols-7 gap-1">
              {insights.weeklyActivity.map((active, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        active ? 'bg-gold text-mystic-950' : 'bg-mystic-800 text-mystic-500'
                      }`}
                      aria-label={`${formatDate(localDateStr(d))}${active ? ` · ${t('journal.hasEntry', { defaultValue: 'has an entry' })}` : ''}`}
                      role="img"
                    >
                      {active && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-caption text-mystic-500">{narrowDayFmt.format(d)}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t('journal.writingStats')} headingLevel="h3">
            <Card padding="md">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.averageWordsPerEntry)}</p>
                  <p className="text-caption text-mystic-400">{t('journal.avgWords')}</p>
                </div>
                <div className="text-center">
                  <p className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.last30DaysEntries)}</p>
                  <p className="text-caption text-mystic-400">{t('journal.last30Days')}</p>
                </div>
                <div className="text-center">
                  <p className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(insights.totalWords)}</p>
                  <p className="text-caption text-mystic-400">{t('journal.totalWords')}</p>
                </div>
              </div>
            </Card>
          </Section>

          {entries.length === 0 && (
            <EmptyState
              icon={<Lightbulb />}
              title={t('journal.insightsEmpty')}
              action={
                <Button variant="gold" onClick={openNewEntry}>
                  {t('journal.startWriting', { defaultValue: 'Write my first entry' })}
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* ── Editor ─────────────────────────────────────────────────── */}
      <Sheet
        open={showEditor}
        onClose={closeEditor}
        title={editingEntry ? t('journal.editSheet.editEntry') : selectedTemplate ? selectedTemplate.title : t('journal.editSheet.newEntry')}
      >
        <div className="flex flex-col h-full -m-6">
          <div className="flex-1 overflow-y-auto">
            {!editingEntry && selectedTemplate && (
              <div className="px-6 pt-5 pb-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-y-1">
                  <EyebrowLabel align="left" className="text-mystic-500">
                    {t('journal.editSheet.promptOf', { defaultValue: 'Prompt {{n}} of {{total}}', n: currentPromptIndex + 1, total: selectedTemplate.prompts.length })}
                  </EyebrowLabel>
                  <div className="flex shrink-0 ml-auto">
                    {selectedTemplate.prompts.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentPromptIndex(i)}
                        aria-label={t('journal.editSheet.goToPrompt', { defaultValue: 'Prompt {{n}}', n: i + 1 })}
                        aria-current={i === currentPromptIndex ? 'step' : undefined}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <span className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentPromptIndex ? 'bg-gold' : i < currentPromptIndex ? 'bg-teal' : 'bg-mystic-600'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1))}
                    disabled={currentPromptIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden />
                    {t('journal.editSheet.prevPrompt', { defaultValue: 'Previous' })}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPromptIndex(Math.min(selectedTemplate.prompts.length - 1, currentPromptIndex + 1))}
                    disabled={currentPromptIndex === selectedTemplate.prompts.length - 1}
                  >
                    {t('journal.editSheet.nextPrompt', { defaultValue: 'Next' })}
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}

            {/* The writing surface. The prompt is read, the entry is written
                for meaning: both sit on paper with ink, flush to the sheet
                edge (the px-4 wrapper absorbs Paper's -mx-4). The Input
                primitive has no paper variant, so the two fields are styled
                here with the ink roles. */}
            <div className="px-4 pt-4">
              <Paper className="!py-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <EyebrowLabel tone="ink" align="left">
                    {editingEntry
                      ? t('journal.editSheet.editEntry')
                      : selectedTemplate
                        ? t('journal.editSheet.promptOf', { defaultValue: 'Prompt {{n}} of {{total}}', n: currentPromptIndex + 1, total: selectedTemplate.prompts.length })
                        : draftDate === today
                          ? t('journal.todaysPrompt')
                          : t('journal.entryFor', { defaultValue: 'Entry for {{date}}', date: editorDateLabel })}
                  </EyebrowLabel>
                  {/* The eyebrow already names the day for a past-day entry; say it once. */}
                  {(editingEntry || selectedTemplate || draftDate === today) && (
                    <span className="reading-caption tabular-nums shrink-0">{editorDateLabel}</span>
                  )}
                </div>
                {!editingEntry && (selectedTemplate || draftDate === today) && (
                  <p className="reading-lede mb-4">
                    {selectedTemplate ? selectedTemplate.prompts[currentPromptIndex] : todayPrompt}
                  </p>
                )}
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  aria-label={t('journal.titlePlaceholder')}
                  placeholder={t('journal.titlePlaceholder')}
                  maxLength={120}
                  className="w-full bg-transparent border-0 border-b border-paper-hairline pb-2 heading-display-md heading-strong text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink-gold"
                />
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  aria-label={t('journal.editSheet.yourThoughts')}
                  placeholder={t('journal.entryPlaceholder')}
                  rows={8}
                  className="w-full mt-4 bg-transparent border-0 p-0 text-body leading-relaxed text-ink placeholder:text-ink-muted resize-none focus:outline-none min-h-[12rem]"
                />
                <p className="reading-caption text-right tabular-nums mt-1">
                  {t('journal.wordCount', { n: numberFmt.format(wordCount) })}
                </p>
              </Paper>
            </div>

            <div className="px-6 py-5 space-y-5">
              {journalCoachEnabled && content.trim().length >= 20 && !coachResult && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setCoachLoading(true);
                    const { data, error } = await supabase.functions.invoke('ai-journal-coach', {
                      body: {
                        entry: content.trim(),
                        userContext: {
                          mbtiType: profile?.mbtiType,
                          enneagramType: profile?.enneagramType,
                          locale: getLocale(),
                        },
                      },
                    });
                    setCoachLoading(false);
                    if (error) {
                      toast(t('journalCoach.failed', { defaultValue: 'Couldn’t reach the coach — check your connection and try again.' }), 'error');
                      return;
                    }
                    const payload = (data?.data ?? data) as { observation: string; prompts: string[] } | null;
                    if (payload) setCoachResult(payload);
                  }}
                  disabled={coachLoading}
                  className="-ml-2 gap-1"
                >
                  <Sparkles className="w-4 h-4 text-gold" aria-hidden />
                  {coachLoading
                    ? t('journalCoach.thinking', { defaultValue: 'Reading…' })
                    : t('journalCoach.askCta', { defaultValue: 'Ask the journal coach' })}
                </Button>
              )}

              {coachResult && (
                <Card padding="md" className="border-cosmic-violet/30">
                  <EyebrowLabel align="left" className="!text-cosmic-violet-ink block mb-2">
                    {t('journalCoach.observationLabel', { defaultValue: 'An observation' })}
                  </EyebrowLabel>
                  <p className="text-ui text-mystic-200 italic leading-relaxed mb-3">
                    {coachResult.observation}
                  </p>
                  <EyebrowLabel align="left" className="block text-mystic-500 mb-1.5">
                    {t('journalCoach.promptsLabel', { defaultValue: 'Sit with these' })}
                  </EyebrowLabel>
                  <ul className="space-y-1.5">
                    {coachResult.prompts.map((p, i) => (
                      <li key={i} className="text-meta text-mystic-300 pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-cosmic-violet-ink">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setCoachResult(null)}
                    className="text-caption text-mystic-500 [@media(hover:hover)]:hover:text-mystic-300 mt-2 min-h-[44px] underline underline-offset-2"
                  >
                    {t('journalCoach.dismiss', { defaultValue: 'Hide these prompts' })}
                  </button>
                </Card>
              )}

              <div>
                <p className="text-meta text-mystic-400 mb-3" id="journal-mood-label">{t('journal.editSheet.howFeeling')}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="journal-mood-label">
                  {MOODS.map(mood => {
                    const active = selectedMood === mood.value;
                    return (
                      <button
                        key={mood.value}
                        type="button"
                        onClick={() => setSelectedMood(active ? '' : mood.value)}
                        aria-pressed={active}
                        aria-label={moodLabel(mood.value)}
                        title={moodLabel(mood.value)}
                        className={`w-12 h-12 rounded-control border flex items-center justify-center transition-[border-color,background-color,color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                          active
                            ? 'bg-gold/10 border-gold text-gold'
                            : 'bg-mystic-800 border-mystic-700 text-mystic-300 [@media(hover:hover)]:hover:border-mystic-500'
                        }`}
                      >
                        <MoodGlyph glyph={moodGlyph(mood.value)} size={22} />
                      </button>
                    );
                  })}
                </div>
                {selectedMood && <p className="text-caption text-mystic-400 mt-2">{moodLabel(selectedMood)}</p>}
              </div>

              <div>
                <p className="text-meta text-mystic-400 mb-3" id="journal-tags-label">{t('journal.editSheet.tags')}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="journal-tags-label">
                  {TAGS.map(tag => (
                    <Chip
                      key={tag.value}
                      label={tagLabel(tag.value)}
                      selected={selectedTags.includes(tag.value)}
                      onSelect={() => toggleTag(tag.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-meta text-mystic-400 mb-3">{t('journal.editSheet.attachments')}</p>
                {linkedReadingId ? (
                  <ListRowGroup>
                    <ListRow
                      icon={<TarotCardIcon />}
                      tone="blue"
                      label={t('journal.editSheet.tarotLinked')}
                      meta={(() => {
                        const r = readingById.get(linkedReadingId);
                        return r ? `${shortDateFmt.format(parseLocalDate(r.date))} · ${r.cards.slice(0, 2).map(c => c.name).join(', ')}` : undefined;
                      })()}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setLinkedReadingId(null)}
                          aria-label={t('journal.editSheet.unlinkReading', { defaultValue: 'Remove the linked reading' })}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-inset text-mystic-400 [@media(hover:hover)]:hover:bg-mystic-700"
                        >
                          <X className="w-4 h-4" aria-hidden />
                        </button>
                      }
                    />
                  </ListRowGroup>
                ) : (
                  <Button variant="outline" fullWidth onClick={() => setShowAttachmentPicker(true)}>
                    <Link2 className="w-4 h-4" aria-hidden />
                    {t('journal.linkReading', { defaultValue: 'Link a reading' })}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-mystic-800 px-6 pt-4 pb-24 space-y-3 bg-mystic-900 safe-bottom">
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={closeEditor}>
                {t('journal.editor.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="gold" fullWidth onClick={() => saveEntry(false)} disabled={!content.trim()} loading={saving}>
                {t('journal.saveEntry', { defaultValue: 'Save this entry' })}
              </Button>
            </div>

            {profile?.isPremium && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => saveEntry(true)}
                disabled={!content.trim() || saving}
              >
                <Lock className="w-4 h-4" aria-hidden />
                {t('journal.saveAndLock', { defaultValue: 'Save and lock' })}
              </Button>
            )}

            {editingEntry && (
              <Button variant="ghost" fullWidth onClick={() => setPendingDelete(editingEntry)} className="text-coral [@media(hover:hover)]:hover:text-coral">
                <Trash2 className="w-4 h-4" aria-hidden />
                {t('journal.deleteEntry', { defaultValue: 'Delete this entry' })}
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      {/* ── Delete confirm (the app's Sheet, not window.confirm) ──────── */}
      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t('journal.deleteConfirmTitle', { defaultValue: 'Delete this entry?' })}
      >
        <div className="space-y-5">
          <p className="text-ui text-mystic-300 leading-relaxed">
            {t('journal.deleteConfirmBody', { defaultValue: 'It goes for good — there is no undo. Your other entries are not affected.' })}
          </p>
          {pendingDelete && (
            <ListRowGroup>
              <ListRow
                icon={<MoodGlyph glyph={moodGlyph(pendingDelete.mood)} size={20} />}
                tone={pendingDelete.mood ? moodTone(pendingDelete.mood) : 'neutral'}
                label={pendingDelete.title || snippet(pendingDelete.content)}
                meta={<span className="tracking-[0.08em] uppercase text-caption">{formatDate(pendingDelete.date)}</span>}
              />
            </ListRowGroup>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setPendingDelete(null)}>
              {t('common:actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button variant="destructive" fullWidth onClick={confirmDelete} loading={deleting}>
              {t('common:actions.delete', { defaultValue: 'Delete' })}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* ── Link a reading ──────────────────────────────────────────── */}
      <Sheet
        open={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        title={t('journal.linkReading', { defaultValue: 'Link a reading' })}
      >
        {recentReadings.length === 0 ? (
          <EmptyState variant="inline" icon={<TarotCardIcon />} title={t('journal.noReadings')} />
        ) : (
          <ListRowGroup>
            {recentReadings.map(reading => (
              <ListRow
                key={reading.id}
                icon={<TarotCardIcon />}
                tone="blue"
                label={t('journal.spreadRow', { defaultValue: '{{spread}} spread', spread: reading.spread_type.replace(/-/g, ' ') })}
                meta={`${shortDateFmt.format(parseLocalDate(reading.date))} · ${reading.cards.slice(0, 2).map(c => c.name).join(', ')}${reading.cards.length > 2 ? '…' : ''}`}
                trailing={<Tag tone="blue">{spreadAbbr(reading.spread_type)}</Tag>}
                onClick={() => {
                  setLinkedReadingId(reading.id);
                  setShowAttachmentPicker(false);
                }}
              />
            ))}
          </ListRowGroup>
        )}
      </Sheet>
    </Page>
  );
}

/** Ink for a mood glyph on a mystic-800 tile, by tone. */
const TILE_INK: Record<Tone, string> = {
  neutral: 'text-mystic-300',
  gold: 'text-gold',
  teal: 'text-teal',
  coral: 'text-coral',
  blue: 'text-cosmic-blue-ink',
  violet: 'text-cosmic-violet-ink',
  rose: 'text-cosmic-rose',
};
