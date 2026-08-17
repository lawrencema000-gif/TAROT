import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Download, AlertTriangle } from 'lucide-react';
import { Card, Button, EyebrowLabel, SectionDivider } from '../components/ui';
import {
  INTENTIONS, scoreWindow, bestDays, daysToAvoid, toICS,
  type Intention, type DayScore,
} from '../data/auspiciousDates';
import { MANSION_MEANINGS } from '../data/lunarMansionsContent';
import { computeBazi } from '../data/bazi';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';

const WINDOW_DAYS = 90;

/**
 * 擇日 — pick a day for something.
 *
 * Deliberately usable with no birth data: the almanac layer alone gives a real
 * answer, and the personal layer (clashes against your own pillars) simply adds
 * itself once a birth date exists. Every day shows its full reasoning, because
 * "trust me, the 14th is good" is exactly the kind of unexplained authority
 * this app is supposed to be the opposite of.
 */
export function AuspiciousDatesPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { profile } = useAuth();
  const [intention, setIntention] = useState<Intention>('wedding');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta(
      'Auspicious Dates — 擇日',
      'Find a good day for a wedding, a move, a launch or a journey, read from the lunar mansions and your own birth pillars.',
    );
  }, []);

  const birth = useMemo(
    () => (profile?.birthDate ? computeBazi(profile.birthDate, profile.birthTime || undefined) : null),
    [profile?.birthDate, profile?.birthTime],
  );

  const window = useMemo(
    () => scoreWindow(new Date(), WINDOW_DAYS, intention, birth),
    [intention, birth],
  );
  const best = useMemo(() => bestDays(window, 6), [window]);
  const avoid = useMemo(() => daysToAvoid(window, 4), [window]);

  const download = () => {
    const blob = new Blob([toICS(best, intention)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcana-${intention}-dates.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

  const DayRow = ({ d, tone }: { d: DayScore; tone: 'good' | 'bad' }) => {
    const open = expanded === d.date;
    return (
      <div className="border-b border-mystic-800/40 last:border-0">
        <button onClick={() => setExpanded(open ? null : d.date)} className="w-full flex items-center gap-3 py-2.5 text-left">
          <span className={`text-2xl flex-shrink-0 ${tone === 'good' ? 'text-gold' : 'text-rose-400/70'}`} style={{ fontFamily: 'serif' }}>
            {d.mansion.cn}
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-mystic-100 text-sm">{fmt(d.date)}</span>
            <span className="text-mystic-600 text-xs"> · {MANSION_MEANINGS[d.mansion.key]?.title}</span>
            <span className="block text-xs text-mystic-500 truncate">{d.reasons[0]?.text}</span>
          </span>
          {d.personalClash && <AlertTriangle className="w-4 h-4 text-rose-400/80 flex-shrink-0" />}
        </button>
        {open && (
          <ul className="pb-3 pl-11 space-y-1">
            {d.reasons.map((r, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                <span className={r.weight > 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                  {r.weight > 0 ? '+' : ''}{r.weight}
                </span>{' '}
                <span className="text-mystic-300">{r.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" /> {t('common.back', { defaultValue: 'Back' })}
      </button>

      <div className="space-y-2">
        <EyebrowLabel>擇日</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">
          {t('dates.title', { defaultValue: 'Pick a good day' })}
        </h1>
        <p className="text-sm text-mystic-400 leading-relaxed">
          {t('dates.intro', {
            defaultValue:
              'Chinese date selection asks a different question from a birth chart: not what you are like, but when to do a particular thing. Each day is read from the lunar mansion that governs it — and, once we know your birth date, from how the day sits against your own pillars.',
          })}
        </p>
        <SectionDivider tone="gold" />
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="heading-display-md text-mystic-100">
          {t('dates.whatFor', { defaultValue: 'What are you choosing a day for?' })}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INTENTIONS) as Intention[]).map((k) => (
            <button
              key={k}
              onClick={() => { setIntention(k); setExpanded(null); }}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                intention === k
                  ? 'border-gold/60 text-gold bg-gold/10'
                  : 'border-mystic-800/60 text-mystic-400 hover:border-mystic-700'
              }`}
            >
              <span style={{ fontFamily: 'serif' }}>{INTENTIONS[k].cn}</span> {INTENTIONS[k].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-mystic-500">{INTENTIONS[intention].blurb}</p>
      </Card>

      {!birth && (
        <Card className="p-4">
          <p className="text-sm text-mystic-300">
            {t('dates.noBirth', {
              defaultValue:
                'These are the almanac readings, which are the same for everyone. Add your birth date in your profile and each day is also checked against your own pillars — a clash there is the most common reason a traditional almanac says to pick another date.',
            })}
          </p>
        </Card>
      )}

      <Card className="p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="heading-display-md text-mystic-100">
            {t('dates.best', { defaultValue: 'Best days ahead' })}
          </h3>
          <Button variant="ghost" size="sm" onClick={download}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('dates.export', { defaultValue: 'Calendar' })}
          </Button>
        </div>
        {best.map((d) => <DayRow key={d.date} d={d} tone="good" />)}
        <p className="text-[11px] text-mystic-600 pt-2">
          <CalendarDays className="w-3 h-3 inline mr-1" />
          {t('dates.windowNote', { defaultValue: `Looking at the next ${WINDOW_DAYS} days. Tap a day to see exactly why it scored the way it did.` })}
        </p>
      </Card>

      {avoid.length > 0 && (
        <Card className="p-4 space-y-1">
          <h3 className="heading-display-md text-mystic-100 mb-2">
            {t('dates.avoid', { defaultValue: 'Days to avoid' })}
          </h3>
          {avoid.map((d) => <DayRow key={d.date} d={d} tone="bad" />)}
        </Card>
      )}

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">
        {t('dates.disclaimer', {
          defaultValue:
            'A traditional custom, offered as one. It says nothing about health, money or law — and the score is a plain tally you can check line by line, not an oracle.',
        })}
      </p>
    </div>
  );
}
