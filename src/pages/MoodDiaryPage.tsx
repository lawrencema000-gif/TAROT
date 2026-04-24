import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Sparkles, Heart } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import {
  MOOD_CATEGORIES,
  loadMoodEntries,
  saveMoodEntry,
  getTodayEntry,
  entryToYValue,
  type MoodCategory,
  type MoodEntry,
} from '../data/moodDiary';

type Stage = 'log' | 'history';

export function MoodDiaryPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('log');
  const [selected, setSelected] = useState<MoodCategory | null>(null);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [allEntries, setAllEntries] = useState<MoodEntry[]>([]);

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
    const today = new Date().toISOString().slice(0, 10);
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

  if (stage === 'log') {
    const selectedInfo = selected ? MOOD_CATEGORIES[selected] : null;
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('mood.title', { defaultValue: 'Daily Mood' })}
          </h1>
        </div>

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

  // History view — render curve from allEntries
  const entries = allEntries;
  const last30: Array<MoodEntry | null> = useMemo(() => {
    const out: Array<MoodEntry | null> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      out.push(entries.find((e) => e.date === dateStr) ?? null);
    }
    return out;
  }, [entries]);

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

export default MoodDiaryPage;
