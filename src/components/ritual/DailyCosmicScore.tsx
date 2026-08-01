import { useState, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
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

function gaugeColor(score: number): string {
  if (score >= 70) return '#5cc9a7';
  if (score >= 45) return '#d4a853';
  return '#c98a9b';
}

/**
 * Daily Cosmic Score — a personal 0-100 read of today's transits against
 * the user's natal chart, with a full "why this number" breakdown. The
 * transparency is deliberate: a score without reasons breeds anxiety.
 */
export function DailyCosmicScore() {
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

  const color = gaugeColor(data.score);
  const circumference = 2 * Math.PI * 34;
  const filled = (data.score / 100) * circumference * 0.75; // 270° arc

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-[135deg]">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"
              strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeLinecap="round" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-display" style={{ color }}>{data.score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-[11px] uppercase tracking-wider text-mystic-500">Today's cosmic weather</span>
          </div>
          <p className="text-sm text-mystic-300 leading-snug mt-1">{frameForDay(data.date)}</p>
          <p className="text-[11px] text-mystic-600 mt-1">
            {data.counts.harmonious} flowing · {data.counts.challenging} demanding
          </p>
        </div>
      </div>

      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-center gap-1 text-xs text-gold/80 hover:text-gold py-1">
        Why this number <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-1.5 pt-1 border-t border-mystic-800/40">
          {data.influences.map((inf, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[inf.transiting]}</span>
              <span className="text-mystic-300 flex-1 truncate">
                {inf.transiting} {inf.type} your {inf.natal}
                <span className="text-mystic-600 text-[11px]"> · {inf.orb}°</span>
              </span>
              <span className={`tabular-nums text-xs ${inf.effect > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {inf.effect > 0 ? '+' : ''}{inf.effect}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-mystic-600 pt-1">Scored from real planetary positions right now vs. your birth chart. It describes weather, not fate.</p>
        </div>
      )}
    </Card>
  );
}
