import { useState, useMemo, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, Mail, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, toast, PageHeader, EmptyState, ReadingProse, Page, Chip, Tag, EyebrowLabel, Section } from '../components/ui';
import { MoodGlyph } from '../components/journal/MoodGlyphs';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import {
  MOOD_CATEGORIES,
  MOOD_CATEGORY_IDS,
  loadMoodEntries,
  saveMoodEntry,
  replaceLocalMoodEntries,
  mergeMoodEntries,
  entryToYValue,
  derivePattern,
  type MoodCategory,
  type MoodEntry,
  type MoodPattern,
} from '../data/moodDiary';
import * as moodEntriesDal from '../dal/moodEntries';
// Import localDateStr DIRECTLY from utils — going through the moodDiary
// re-export caused Vite's tree-shaker to drop the symbol from the
// MoodDiaryPage chunk in production builds, producing a runtime
// `localDateStr is not defined` ReferenceError on the Mood tab.
import { localDateStr } from '../utils/localDate';

type Stage = 'log' | 'history';

/**
 * Where the log lives right now. `synced` once the table answered; `local`
 * when it did not (offline, or the migration not yet applied) — the device
 * copy is then authoritative and is uploaded on the next successful load.
 */
type SyncState = 'syncing' | 'synced' | 'local';

const LETTER_MIN_DAYS = 3;

interface MoodLetter {
  letter: string;
  dominantTheme: string;
  careSuggestion: string;
}

const TILE_TONE: Record<string, string> = {
  neutral: 'bg-mystic-800 text-mystic-300',
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/15 text-teal',
  coral: 'bg-coral/15 text-coral',
  blue: 'bg-cosmic-blue/15 text-cosmic-blue-ink',
  violet: 'bg-cosmic-violet/15 text-cosmic-violet-ink',
  rose: 'bg-cosmic-rose/15 text-cosmic-rose',
};

export function MoodDiaryPage() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('log');
  const [selected, setSelected] = useState<MoodCategory | null>(null);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [allEntries, setAllEntries] = useState<MoodEntry[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('syncing');
  const [letter, setLetter] = useState<MoodLetter | null>(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);

  const today = localDateStr();

  const adopt = (entries: MoodEntry[]) => {
    setAllEntries(entries);
    const mine = entries.find((e) => e.date === today) ?? null;
    setTodayEntry(mine);
    if (mine) {
      setSelected(mine.category);
      setIntensity(mine.intensity);
      setNote(mine.note ?? '');
    }
  };

  // Local first (instant), then the record. Any day the device knows and the
  // account does not is uploaded, so a log kept before this table existed
  // becomes part of the account without the user doing anything.
  useEffect(() => {
    let cancelled = false;
    const local = loadMoodEntries();
    adopt(local);
    if (!user) {
      setSyncState('local');
      return;
    }
    (async () => {
      const res = await moodEntriesDal.listForUser(user.id);
      if (cancelled) return;
      if (!res.ok) {
        setSyncState('local');
        return;
      }
      const remote = res.data;
      const remoteByDate = new Map(remote.map((e) => [e.date, e]));
      const pending = local.filter((e) => {
        const r = remoteByDate.get(e.date);
        return !r || e.savedAt > r.savedAt + 60_000;
      });
      let uploaded = true;
      if (pending.length > 0) {
        const up = await moodEntriesDal.upsertMany(user.id, pending);
        if (cancelled) return;
        uploaded = up.ok;
      }
      const merged = mergeMoodEntries(pending, remote);
      replaceLocalMoodEntries(merged);
      adopt(merged);
      setSyncState(uploaded ? 'synced' : 'local');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    if (!selected) {
      toast(t('mood.pickOne', { defaultValue: 'Pick a mood first' }), 'error');
      return;
    }
    const entry = {
      date: today,
      category: selected,
      intensity,
      note: note.trim() || undefined,
    };
    // The cache is written first so the day is never lost to a dropped
    // request; the record follows.
    const saved = saveMoodEntry(entry);
    adopt(loadMoodEntries());
    toast(t('mood.saved', { defaultValue: 'Mood logged for today' }), 'success');
    if (!user) return;
    const res = await moodEntriesDal.upsert(user.id, entry);
    if (res.ok) {
      setSyncState('synced');
      const merged = mergeMoodEntries([res.data], loadMoodEntries());
      replaceLocalMoodEntries(merged);
      setAllEntries(merged);
      setTodayEntry(merged.find((e) => e.date === today) ?? saved);
    } else {
      setSyncState('local');
      if (!moodEntriesDal.isUnavailable(res.error)) {
        toast(t('mood.syncFailed', { defaultValue: 'Saved on this device — it will sync when the connection returns.' }), 'info');
      }
    }
  };

  // Hook must run on every render (Rules of Hooks). Computed once here so
  // both the `log` early-return branch and the `history` branch satisfy
  // React's hook ordering.
  const last30: Array<MoodEntry | null> = useMemo(() => {
    const out: Array<MoodEntry | null> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = localDateStr(d);
      out.push(allEntries.find((e) => e.date === dateStr) ?? null);
    }
    return out;
  }, [allEntries]);

  // Pattern derivation — runs over the real logged entries. Rendered
  // as the "insight" card above the curve whenever ≥3 entries exist.
  const pattern: MoodPattern | null = useMemo(() => {
    if (allEntries.length < 3) return null;
    return derivePattern(allEntries);
  }, [allEntries]);

  const { tryConsume, refund, EarnSheet } = useMoonstoneSpend('mood-letter');

  const daysToLetter = Math.max(0, LETTER_MIN_DAYS - allEntries.length);
  const letterProgress = daysToLetter === 1
    ? t('mood.letterProgressOne', { defaultValue: '1 more day until your letter' })
    : t('mood.letterProgress', { defaultValue: '{{n}} more days until your letter', n: daysToLetter });

  const handleGenerateLetter = async () => {
    if (allEntries.length < LETTER_MIN_DAYS) {
      toast(t('mood.needMoreForLetter', { defaultValue: 'Log at least 3 days for a weekly letter.' }), 'error');
      return;
    }
    const ok = await tryConsume();
    if (!ok) return;
    setGeneratingLetter(true);
    try {
      const recent = [...allEntries]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 14)
        .map((e) => ({
          date: e.date,
          category: e.category,
          intensity: e.intensity,
          note: e.note,
        }));

      const { data, error } = await supabase.functions.invoke('ai-mood-letter', {
        body: {
          entries: recent,
          userContext: {
            displayName: profile?.displayName || undefined,
            locale: navigator.language?.slice(0, 2) || undefined,
          },
        },
      });
      if (error) throw error;
      // Unwrap { data, correlationId } envelope.
      const payload = (data as { data?: MoodLetter })?.data ?? (data as MoodLetter);
      if (!payload?.letter) throw new Error('empty letter');
      setLetter(payload);
    } catch (e) {
      await refund();
      console.warn('[Mood] letter generation failed:', e);
      toast(
        t('mood.letterFailed', { defaultValue: 'Couldn’t write your letter right now. Try again in a moment.' }),
        'error',
      );
    } finally {
      setGeneratingLetter(false);
    }
  };

  const storageNote = syncState === 'synced'
    ? t('mood.storageSynced', { defaultValue: 'Saved to your account. It comes with you to any device and is part of your data export.' })
    : t('mood.storageLocal', { defaultValue: 'Saved on this device for now — it moves to your account the next time the connection is there.' });

  /** Three dots, one per logged day toward the letter. */
  const LetterProgress = () => (
    <div className="flex items-center gap-3" aria-live="polite">
      <span className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: LETTER_MIN_DAYS }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${i < allEntries.length ? 'bg-gold' : 'bg-mystic-700'}`}
          />
        ))}
      </span>
      <span className="text-meta text-mystic-400 tabular-nums">{letterProgress}</span>
    </div>
  );

  if (stage === 'log') {
    const selectedInfo = selected ? MOOD_CATEGORIES[selected] : null;
    return (
      <Page spacing="md">
        <PageHeader
          icon={<MoodGlyph glyph="sun" size={20} />}
          title={t('mood.title', { defaultValue: 'Daily mood' })}
          subtitle={t('mood.introShort', { defaultValue: 'Pick the shape of today and how strongly it landed.' })}
        />

        {/* Insight card — surfaces a real pattern derived from the
            last 14 entries. Appears only when we have ≥3 logged days
            so the user actually sees something grounded, not filler. */}
        {pattern && pattern.sampleSize >= 3 && (
          <InsightCard pattern={pattern} t={t} />
        )}

        <Card padding="lg">
          <div
            className="grid grid-cols-4 gap-2"
            role="radiogroup"
            aria-label={t('mood.pickLabel', { defaultValue: 'Today’s mood' })}
          >
            {MOOD_CATEGORY_IDS.map((cat) => {
              const info = MOOD_CATEGORIES[cat];
              const isActive = selected === cat;
              const name = t(`mood.categories.${cat}.name`, { defaultValue: info.name });
              return (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelected(cat)}
                  className={`flex flex-col items-center gap-1.5 px-1 py-3 rounded-control border transition-[border-color,background-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                    isActive
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-mystic-800 border-mystic-700 text-mystic-300 [@media(hover:hover)]:hover:border-mystic-500'
                  }`}
                >
                  <MoodGlyph glyph={info.glyph} size={24} />
                  <span className={`text-caption leading-tight ${isActive ? 'text-gold' : 'text-mystic-300'}`}>{name}</span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-meta text-mystic-400 mb-2">
                  {t('mood.intensityLabel', { defaultValue: 'Intensity' })}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Chip
                      key={v}
                      label={String(v)}
                      selected={intensity === v}
                      onSelect={() => setIntensity(v as 1 | 2 | 3 | 4 | 5)}
                      className="flex-1 justify-center tabular-nums"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="mood-note" className="block text-meta text-mystic-400 mb-2">
                  {t('mood.noteLabel', { defaultValue: 'One-line note (optional)' })}
                </label>
                <textarea
                  id="mood-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full bg-mystic-800/50 border border-mystic-600/50 rounded-control px-4 py-3 text-ui text-mystic-100 placeholder-mystic-500 resize-none focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                  placeholder={t('mood.notePlaceholder', { defaultValue: 'What coloured today?' }) as string}
                />
              </div>
            </div>
          )}
        </Card>

        {selectedInfo && (
          <Card padding="lg">
            <EyebrowLabel align="left" className="block mb-2">
              {t('mood.promptLabel', { defaultValue: 'Journal prompt' })}
            </EyebrowLabel>
            <p className="heading-display-md heading-strong text-mystic-100 mb-3">
              {t(`mood.categories.${selected}.journalPrompt`, { defaultValue: selectedInfo.journalPrompt })}
            </p>
            <p className="text-ui text-mystic-300 leading-relaxed">
              {t(`mood.categories.${selected}.recommendation`, { defaultValue: selectedInfo.recommendation })}
            </p>
            <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={() => navigate('/journal')}>
              <BookOpen className="w-4 h-4" aria-hidden />
              {t('mood.openJournal', { defaultValue: 'Write about it in the journal' })}
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="gold" fullWidth onClick={save}>
            {todayEntry
              ? t('mood.updateButton', { defaultValue: 'Update today' })
              : t('mood.saveButton', { defaultValue: 'Save today' })}
          </Button>
          <Button variant="outline" fullWidth onClick={() => setStage('history')}>
            {t('mood.viewHistory', { defaultValue: '30-day curve' })}
          </Button>
        </div>

        {daysToLetter > 0 && <LetterProgress />}

        <p className="text-caption text-mystic-500">{storageNote}</p>
      </Page>
    );
  }

  // History view — render curve from the hoisted `last30` above.

  const entryCount = last30.filter((e) => e !== null).length;
  const avgIntensity = last30.filter((e): e is MoodEntry => e !== null).reduce((sum, e) => sum + e.intensity, 0) / Math.max(1, entryCount);
  const dominantMood = (() => {
    const counts = new Map<MoodCategory, number>();
    for (const e of last30) {
      if (!e) continue;
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    }
    let max = 0;
    let top: MoodCategory | null = null;
    for (const [cat, count] of counts) {
      if (count > max) { max = count; top = cat; }
    }
    return top;
  })();

  // SVG curve dimensions
  const width = 320;
  const height = 120;
  const pointWidth = width / 30;

  const points = last30
    .map((e, i) => {
      if (!e) return null;
      const y = entryToYValue(e);
      // y in 1..5, invert for SVG (top = high)
      const yPct = (5 - y) / 4;
      return { x: i * pointWidth + pointWidth / 2, y: 10 + yPct * (height - 20), entry: e };
    });

  const pathPoints = points.filter((p): p is NonNullable<typeof p> => p !== null);
  const pathString = pathPoints.length > 0
    ? pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    : '';

  return (
    <Page spacing="sm">
      <PageHeader
        onBack={() => setStage('log')}
        backLabel={t('mood.backToLog', { defaultValue: 'Back to log' })}
        title={t('mood.historyTitle', { defaultValue: '30-day curve' })}
        subtitle={t('mood.entriesCount', { defaultValue: '{{n}} of 30 days logged', n: entryCount })}
      />

      <Card padding="lg">
        {entryCount === 0 ? (
          <EmptyState
            variant="inline"
            size="sm"
            title={t('mood.noEntriesYet', { defaultValue: 'Log today’s mood to start your curve.' })}
          />
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="max-w-full text-gold"
            role="img"
            aria-label={t('mood.curveAria', { defaultValue: 'Mood curve over the last 30 days' })}
          >
            {/* Baseline grid — 3 horizontal lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={0}
                y1={10 + pct * (height - 20)}
                x2={width}
                y2={10 + pct * (height - 20)}
                className="stroke-mystic-700"
                strokeDasharray="3 4"
              />
            ))}
            {/* Curve */}
            {pathString && (
              <path
                d={pathString}
                stroke="currentColor"
                strokeOpacity={0.7}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Dots — brighter for a stronger day */}
            {pathPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="currentColor"
                fillOpacity={0.4 + p.entry.intensity * 0.12}
              />
            ))}
          </svg>
        )}

        <div className="flex justify-between text-meta text-mystic-400 mt-2">
          <span>{t('mood.days.30ago', { defaultValue: '30 days ago' })}</span>
          <span>{t('mood.days.today', { defaultValue: 'Today' })}</span>
        </div>
      </Card>

      {dominantMood && (
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span
              className={`shrink-0 inline-flex w-10 h-10 items-center justify-center rounded-control ${TILE_TONE[MOOD_CATEGORIES[dominantMood].tone]}`}
              aria-hidden
            >
              <MoodGlyph glyph={MOOD_CATEGORIES[dominantMood].glyph} size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-meta text-mystic-400">
                {t('mood.dominantLabel', { defaultValue: 'Most common mood' })}
              </p>
              <p className="text-ui text-mystic-100 font-medium">
                {t(`mood.categories.${dominantMood}.name`, { defaultValue: MOOD_CATEGORIES[dominantMood].name })}
              </p>
            </div>
            <p className="text-meta text-mystic-400 tabular-nums text-right">
              {t('mood.avgIntensity', {
                defaultValue: 'Average intensity: {{n}} / 5',
                n: avgIntensity.toFixed(1),
              })}
            </p>
          </div>
        </Card>
      )}

      {/* Pattern detail + AI letter */}
      {pattern && pattern.sampleSize >= 3 && <InsightCard pattern={pattern} t={t} expanded />}

      {!letter && (
        <Card padding="lg">
          <h3 className="heading-display-md heading-strong text-mystic-100 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold" aria-hidden />
            {t('mood.letterHeading', { defaultValue: 'A letter for this week' })}
          </h3>
          <p className="text-ui text-mystic-300 leading-relaxed mb-4">
            {t('mood.letterIntro', {
              defaultValue:
                'A warm, specific letter that reads your last 14 days of entries — written like a wise friend who has been paying attention.',
            })}
          </p>
          {daysToLetter > 0 ? (
            <LetterProgress />
          ) : (
            <>
              <MoonstoneCostLine className="mb-2" />
              <Button
                variant="outline"
                fullWidth
                onClick={handleGenerateLetter}
                disabled={generatingLetter}
                loading={generatingLetter}
              >
                <Sparkles className="w-4 h-4 mr-2" aria-hidden />
                {generatingLetter
                  ? t('mood.writingLetter', { defaultValue: 'Writing…' })
                  : t('mood.generateLetter', { defaultValue: 'Write my letter' })}
              </Button>
              {EarnSheet}
            </>
          )}
        </Card>
      )}

      {letter && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-gold" aria-hidden />
            <h3 className="heading-display-md heading-strong text-mystic-100">
              {t('mood.letterTitle', { defaultValue: 'Your weekly letter' })}
            </h3>
          </div>
          <Tag tone="violet" size="md" className="mb-4">
            <span className="text-caption uppercase tracking-widest">
              {t('mood.themeLabel', { defaultValue: 'Theme' })}
            </span>
            <span className="text-mystic-200">{letter.dominantTheme}</span>
          </Tag>
          <ReadingProse text={letter.letter} />
          <div className="mt-4 pt-4 border-t border-mystic-700">
            <EyebrowLabel align="left" className="block mb-1">
              {t('mood.carePracticeLabel', { defaultValue: 'One practice' })}
            </EyebrowLabel>
            <p className="text-ui text-mystic-300 italic">{letter.careSuggestion}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { setLetter(null); handleGenerateLetter(); }}
            disabled={generatingLetter}
            className="mt-4"
            size="sm"
          >
            {t('mood.rewriteLetter', { defaultValue: 'Write me another letter' })}
          </Button>
        </Card>
      )}

      <p className="text-caption text-mystic-500 px-1">{storageNote}</p>
    </Page>
  );
}

// ─── Insight card ─────────────────────────────────────────────────
// Surfaces the derived weekly pattern in compact form. When `expanded`
// is true it also shows the heaviest/lightest-day detail and the
// week-over-week drift delta. Kept tight visually so it reads as a
// sidebar-style insight, not another journal prompt.
function InsightCard({
  pattern,
  t,
  expanded = false,
}: {
  pattern: MoodPattern;
  t: (k: string, o?: Record<string, unknown>) => unknown;
  expanded?: boolean;
}) {
  const DriftIcon =
    pattern.drift === 'rising' ? TrendingUp
    : pattern.drift === 'falling' ? TrendingDown
    : Minus;
  const driftTint =
    pattern.drift === 'rising' ? 'text-teal'
    : pattern.drift === 'falling' ? 'text-coral'
    : 'text-mystic-400';

  return (
    <Section headingLevel="h3" spacing="sm">
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-control bg-mystic-800 flex items-center justify-center flex-shrink-0 ${driftTint}`} aria-hidden>
            <DriftIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <EyebrowLabel align="left" className="block mb-1">
              {t('mood.patternLabel', { defaultValue: 'This week' }) as string}
            </EyebrowLabel>
            <p className="text-ui text-mystic-200 leading-relaxed">{pattern.headline}</p>

            {expanded && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {pattern.heaviestDay && (
                  <div className="bg-mystic-800 rounded-inset px-3 py-2">
                    <p className="text-meta text-mystic-400">
                      {t('mood.heaviestDayLabel', { defaultValue: 'Heaviest day' }) as string}
                    </p>
                    <p className="text-ui text-coral font-medium">{pattern.heaviestDay}</p>
                  </div>
                )}
                {pattern.lightestDay && (
                  <div className="bg-mystic-800 rounded-inset px-3 py-2">
                    <p className="text-meta text-mystic-400">
                      {t('mood.lightestDayLabel', { defaultValue: 'Lightest day' }) as string}
                    </p>
                    <p className="text-ui text-teal font-medium">{pattern.lightestDay}</p>
                  </div>
                )}
                <div className="bg-mystic-800 rounded-inset px-3 py-2 col-span-2">
                  <p className="text-meta text-mystic-400">
                    {t('mood.weekOverWeekLabel', { defaultValue: 'Week over week' }) as string}
                  </p>
                  <p className={`text-ui font-medium tabular-nums ${driftTint}`}>
                    {pattern.driftDelta > 0 ? '+' : ''}{pattern.driftDelta.toFixed(2)}
                    <span className="text-meta text-mystic-400 ml-1 font-normal">
                      {t('mood.driftUnits', { defaultValue: 'on the mood scale' }) as string}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Section>
  );
}

export default MoodDiaryPage;
