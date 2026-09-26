import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { HoroscopeWheelIcon } from '../ui/NavIcons';
import { Card, EyebrowLabel } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { supabase } from '../../lib/supabase';
import { appStorage } from '../../lib/appStorage';
import { localDateStr } from '../../utils/localDate';
import { PLANET_GLYPH } from '../../lib/chart';
import { DAILY_SCORE_FRAMES } from '../../data/oracleSuggestions';

interface Influence {
  transiting: string; natal: string; type: string; orb: number; effect: number; harmonious: boolean;
}
interface ScoreData {
  score: number; date: string;
  influences: Influence[];
  counts: { harmonious: number; challenging: number; neutral: number };
}

const CACHE_KEY = 'arcana_daily_score';

function frameForDay(day: string): string {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return DAILY_SCORE_FRAMES[Math.abs(h) % DAILY_SCORE_FRAMES.length];
}

/** Palette tones for the gauge, from the token set rather than loose hexes. */
function gaugeTone(score: number): string {
  if (score >= 70) return 'text-teal';
  if (score >= 45) return 'text-gold';
  return 'text-coral';
}

/**
 * Daily Cosmic Score — a personal 0-100 read of today's transits against
 * the user's natal chart, with a full "why this number" breakdown. The
 * transparency is deliberate: a score without reasons breeds anxiety.
 */
export function DailyCosmicScore() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const [data, setData] = useState<ScoreData | null>(null);
  const [open, setOpen] = useState(false);
  const today = localDateStr();

  useEffect(() => {
    if (!user || !profile?.birthDate) return;
    let cancelled = false;
    (async () => {
      try {
        const cached = await appStorage.get(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ScoreData & { localDay?: string };
          if (parsed.localDay === today) { if (!cancelled) setData(parsed); return; }
        }
      } catch { /* recompute */ }
      const { data: res, error } = await supabase.functions.invoke('astrology-daily-score', { body: {} });
      if (cancelled || error) return;
      const score = (res?.data ?? res) as ScoreData;
      if (score?.score != null) {
        setData(score);
        appStorage.set(CACHE_KEY, JSON.stringify({ ...score, localDay: today })).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile?.birthDate, today]);

  if (!profile?.birthDate || !data) return null;

  const tone = gaugeTone(data.score);
  const circumference = 2 * Math.PI * 34;
  const filled = (data.score / 100) * circumference * 0.75; // 270° arc

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-4">
        <div className={`relative w-20 h-20 shrink-0 ${tone}`}>
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-[135deg]" aria-hidden>
            <circle cx="40" cy="40" r="34" fill="none" className="stroke-mystic-700" strokeWidth="6"
              strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeLinecap="round" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-display leading-none">{data.score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <HoroscopeWheelIcon className="w-3.5 h-3.5 text-gold" />
            <EyebrowLabel>{t('home.cosmicScore.eyebrow', { defaultValue: 'Today’s cosmic weather' })}</EyebrowLabel>
          </div>
          <p className="text-ui text-mystic-200 leading-snug mt-1">{frameForDay(data.date)}</p>
          <p className="text-meta text-mystic-500 mt-1">
            {t('home.cosmicScore.counts', {
              defaultValue: '{{flowing}} flowing · {{demanding}} demanding',
              flowing: data.counts.harmonious,
              demanding: data.counts.challenging,
            })}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-1 text-meta text-gold py-2 min-h-[44px]"
      >
        {t('home.cosmicScore.why', { defaultValue: 'Why this number' })}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div className="space-y-1.5 pt-2 border-t border-mystic-700">
          {data.influences.map((inf, i) => (
            <div key={i} className="flex items-center gap-2 text-meta">
              <span className="font-display" aria-hidden>{PLANET_GLYPH[inf.transiting]}</span>
              <span className="text-mystic-300 flex-1 truncate">
                {t('home.cosmicScore.influence', {
                  defaultValue: '{{transiting}} {{type}} your {{natal}}',
                  transiting: inf.transiting,
                  type: inf.type,
                  natal: inf.natal,
                })}
                <span className="text-mystic-500 text-caption"> · {inf.orb}°</span>
              </span>
              <span className={`tabular-nums ${inf.effect > 0 ? 'text-teal' : 'text-coral'}`}>
                {inf.effect > 0 ? '+' : ''}{inf.effect}
              </span>
            </div>
          ))}
          <p className="text-caption text-mystic-500 pt-1">
            {t('home.cosmicScore.footnote', { defaultValue: 'Scored from real planetary positions right now against your birth chart. It describes weather, not fate.' })}
          </p>
        </div>
      )}
    </Card>
  );
}
