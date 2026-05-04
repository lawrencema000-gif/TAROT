import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Sparkles, Heart, TrendingUp, TrendingDown, Minus, Mail } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import {
  MOOD_CATEGORIES,
  loadMoodEntries,
  saveMoodEntry,
  getTodayEntry,
  entryToYValue,
  derivePattern,
  type MoodCategory,
  type MoodEntry,
  type MoodPattern,
} from '../data/moodDiary';
// Import localDateStr DIRECTLY from utils — going through the moodDiary
// re-export caused Vite's tree-shaker to drop the symbol from the
// MoodDiaryPage chunk in production builds, producing a runtime
// `localDateStr is not defined` ReferenceError on the Mood tab.
import { localDateStr } from '../utils/localDate';

type Stage = 'log' | 'history';

interface MoodLetter {
  letter: string;
  dominantTheme: string;
  careSuggestion: string;
}

export function MoodDiaryPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('log');
  const [selected, setSelected] = useState<MoodCategory | null>(null);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [allEntries, setAllEntries] = useState<MoodEntry[]>([]);
  const [letter, setLetter] = useState<MoodLetter | null>(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);

  useEffect(() => {
    const today = getTodayEntry();
    setTodayEntry(today);
    if (today) {
      setSelected(today.category);
      setIntensity(today.intensity);
      setNote(today.note ?? '');
    }
    setAllEntries(loadMoodEntries());
  }, []);

  const save = () => {
    if (!selected) {
      toast(t('mood.pickOne', { defaultValue: 'Pick a mood first' }), 'error');
      return;
    }
    const today = localDateStr();
    const saved = saveMoodEntry({
      date: today,
      category: selected,
      intensity,
      note: note.trim() || undefined,
    });
    setTodayEntry(saved);
    setAllEntries(loadMoodEntries());
    toast(t('mood.saved', { defaultValue: 'Mood logged for today' }), 'success');
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

  const handleGenerateLetter = async () => {
    if (allEntries.length < 3) {
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
        t('mood.letterFailed', { defaultValue: "Couldn't write your letter right now. Try again in a moment." }),
        'error',
      );
    } finally {
      setGeneratingLetter(false);
    }
  };

  if (stage === 'log') {
    const selectedInfo = selected ? MOOD_CATEGORIES[selected] : null;
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-gold" />
          <h1 className="heading-display-lg text-mystic-100">
            {t('mood.title', { defaultValue: 'Daily Mood' })}
          </h1>
        </div>

        {/* Insight card — surfaces a real pattern derived from the
            last 14 entries. Appears only when we have ≥3 logged days
            so the user actually sees something grounded, not filler. */}
        {pattern && pattern.sampleSize >= 3 && (
          <InsightCard pattern={pattern} t={t} />
        )}

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('mood.intro', {
              defaultValue:
                'How is today landing in you? Pick the shape of it, notice the intensity, optionally write a sentence. Over time your mood curve becomes a map.',
            })}
          </p>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {(Object.keys(MOOD_CATEGORIES) as MoodCategory[]).map((cat) => {
              const info = MOOD_CATEGORIES[cat];
              const isActive = selected === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelected(cat)}
                  className={`p-3 rounded-xl border transition-all active:scale-95 ${
                    isActive
                      ? 'bg-gold/20 border-gold/50 shadow-lg shadow-gold/10'
                      : 'bg-mystic-800/30 border-mystic-700/30 hover:border-mystic-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{info.emoji}</div>
                  <div className={`text-[11px] ${isActive ? 'text-gold' : 'text-mystic-300'}`}>
                    {t(`mood.categories.${cat}.name`, { defaultValue: info.name })}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <>
              <label className="block text-xs text-mystic-500 mb-2">
                {t('mood.intensityLabel', { defaultValue: 'Intensity' })}
              </label>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setIntensity(v as 1 | 2 | 3 | 4 | 5)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                      intensity === v
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-mystic-800/30 border-mystic-700/30 text-mystic-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <label className="block text-xs text-mystic-500 mb-2">
                {t('mood.noteLabel', { defaultValue: 'One-line note (optional)' })}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
                placeholder={t('mood.notePlaceholder', { defaultValue: 'What coloured today?' }) as string}
              />
            </>
          )}
        </Card>

        {selectedInfo && (
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('mood.promptLabel', { defaultValue: 'Journal prompt' })}
            </h3>
            <p className="text-mystic-200 italic text-sm leading-relaxed mb-3">
              "{t(`mood.categories.${selected}.journalPrompt`, { defaultValue: selectedInfo.journalPrompt })}"
            </p>
            <p className="text-xs text-mystic-500">
              💡 {t(`mood.categories.${selected}.recommendation`, { defaultValue: selectedInfo.recommendation })}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" fullWidth className="min-h-[48px]" onClick={save}>
            {todayEntry
              ? t('mood.updateButton', { defaultValue: 'Update today' })
              : t('mood.saveButton', { defaultValue: 'Save today' })}
          </Button>
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={() => setStage('history')}>
            {t('mood.viewHistory', { defaultValue: 'View 30-day curve' })}
          </Button>
        </div>
      </div>
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
    <div className="space-y-4 pb-6">
      <button
        onClick={() => setStage('log')}
        className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('mood.backToLog', { defaultValue: 'Back to log' })}
      </button>

      <Card variant="glow" padding="lg">
        <h2 className="font-display text-xl text-mystic-100 mb-1">
          {t('mood.historyTitle', { defaultValue: '30-day curve' })}
        </h2>
        <p className="text-xs text-mystic-500 mb-4">
          {t('mood.entriesCount', { defaultValue: '{{n}} of 30 days logged', n: entryCount })}
        </p>

        {entryCount === 0 ? (
          <p className="text-mystic-400 text-sm text-center py-8 italic">
            {t('mood.noEntriesYet', { defaultValue: 'Log today\'s mood to start your curve.' })}
          </p>
        ) : (
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="max-w-full">
            {/* Baseline grid — 3 horizontal lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={0}
                y1={10 + pct * (height - 20)}
                x2={width}
                y2={10 + pct * (height - 20)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 4"
              />
            ))}
            {/* Curve */}
            {pathString && (
              <path
                d={pathString}
                stroke="rgba(212,175,55,0.6)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Dots */}
            {pathPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={`rgba(212,175,55,${0.4 + (p.entry.intensity * 0.12)})`}
              />
            ))}
          </svg>
        )}

        <div className="flex justify-between text-[10px] text-mystic-600 mt-2">
          <span>{t('mood.days.30ago', { defaultValue: '30d ago' })}</span>
          <span>{t('mood.days.today', { defaultValue: 'Today' })}</span>
        </div>
      </Card>

      {dominantMood && (
        <Card padding="md">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{MOOD_CATEGORIES[dominantMood].emoji}</span>
            <div>
              <p className="text-xs text-mystic-500">
                {t('mood.dominantLabel', { defaultValue: 'Most common mood' })}
              </p>
              <p className="text-mystic-200 font-medium text-sm">
                {t(`mood.categories.${dominantMood}.name`, { defaultValue: MOOD_CATEGORIES[dominantMood].name })}
              </p>
            </div>
          </div>
          <p className="text-xs text-mystic-500">
            {t('mood.avgIntensity', {
              defaultValue: 'Average intensity: {{n}} / 5',
              n: avgIntensity.toFixed(1),
            })}
          </p>
        </Card>
      )}

      {/* Pattern detail + AI letter */}
      {pattern && pattern.sampleSize >= 3 && <InsightCard pattern={pattern} t={t} expanded />}

      {allEntries.length >= 3 && !letter && (
        <Card variant="glow" padding="lg" className="bg-gradient-to-br from-cosmic-violet/5 to-mystic-900 border-cosmic-violet/20">
          <h3 className="font-medium text-cosmic-violet mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t('mood.letterHeading', { defaultValue: 'A letter for this week' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('mood.letterIntro', {
              defaultValue:
                'Generate a warm, specific letter reading your last 14 days of entries — written like a wise friend who has been paying attention.',
            })}
          </p>
          <MoonstoneCostLine className="mb-2" />
          <Button
            variant="outline"
            fullWidth
            onClick={handleGenerateLetter}
            disabled={generatingLetter}
            loading={generatingLetter}
            className="min-h-[48px]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingLetter
              ? t('mood.writingLetter', { defaultValue: 'Writing…' })
              : t('mood.generateLetter', { defaultValue: 'Write my letter' })}
          </Button>
          {EarnSheet}
        </Card>
      )}

      {letter && (
        <Card variant="glow" padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-gold" />
            <h3 className="font-display text-lg text-mystic-100">
              {t('mood.letterTitle', { defaultValue: 'Your weekly letter' })}
            </h3>
          </div>
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cosmic-violet/10 border border-cosmic-violet/30">
            <span className="text-[10px] uppercase tracking-widest text-cosmic-violet">
              {t('mood.themeLabel', { defaultValue: 'Theme' })}
            </span>
            <span className="text-xs text-mystic-200">{letter.dominantTheme}</span>
          </div>
          {letter.letter.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-mystic-200 text-sm leading-relaxed mb-3 last:mb-0">
              {para}
            </p>
          ))}
          <div className="mt-4 pt-4 border-t border-gold/10">
            <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
              {t('mood.carePracticeLabel', { defaultValue: 'One practice' })}
            </p>
            <p className="text-mystic-200 text-sm italic leading-relaxed">{letter.careSuggestion}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { setLetter(null); handleGenerateLetter(); }}
            disabled={generatingLetter}
            className="mt-4 min-h-[40px]"
            size="sm"
          >
            {t('mood.rewriteLetter', { defaultValue: 'Rewrite' })}
          </Button>
        </Card>
      )}

      <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
        <p className="text-xs text-mystic-400 leading-relaxed">
          {t('mood.privacyNote', {
            defaultValue: 'Your mood log lives on this device only. It is not uploaded or synced.',
          })}
        </p>
      </Card>
    </div>
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
  const driftIcon =
    pattern.drift === 'rising' ? TrendingUp
    : pattern.drift === 'falling' ? TrendingDown
    : Minus;
  const DriftIcon = driftIcon;
  const driftTint =
    pattern.drift === 'rising' ? 'text-emerald-400'
    : pattern.drift === 'falling' ? 'text-pink-400'
    : 'text-mystic-400';

  return (
    <Card padding="md" className="bg-gradient-to-br from-cosmic-blue/5 to-mystic-900 border-cosmic-blue/20">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg bg-mystic-800/60 flex items-center justify-center flex-shrink-0 ${driftTint}`}>
          <DriftIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-cosmic-blue mb-0.5">
            {t('mood.patternLabel', { defaultValue: 'This week' }) as string}
          </p>
          <p className="text-sm text-mystic-200 leading-relaxed">{pattern.headline}</p>

          {expanded && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {pattern.heaviestDay && (
                <div className="bg-mystic-800/40 rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-mystic-500">
                    {t('mood.heaviestDayLabel', { defaultValue: 'Heaviest day' }) as string}
                  </p>
                  <p className="text-pink-400 font-medium">{pattern.heaviestDay}</p>
                </div>
              )}
              {pattern.lightestDay && (
                <div className="bg-mystic-800/40 rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-mystic-500">
                    {t('mood.lightestDayLabel', { defaultValue: 'Lightest day' }) as string}
                  </p>
                  <p className="text-emerald-400 font-medium">{pattern.lightestDay}</p>
                </div>
              )}
              <div className="bg-mystic-800/40 rounded-lg px-2.5 py-2 col-span-2">
                <p className="text-[10px] text-mystic-500">
                  {t('mood.weekOverWeekLabel', { defaultValue: 'Week-over-week' }) as string}
                </p>
                <p className={`font-medium ${driftTint}`}>
                  {pattern.driftDelta > 0 ? '+' : ''}{pattern.driftDelta.toFixed(2)}
                  <span className="text-mystic-500 ml-1 font-normal text-[11px]">
                    {t('mood.driftUnits', { defaultValue: 'mood y-value delta' }) as string}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default MoodDiaryPage;
