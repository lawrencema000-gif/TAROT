import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Download, AlertTriangle } from 'lucide-react';
import { Card, Button, Chip, Page, PageHeader, Section, Disclosure } from '../components/ui';
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
      <Disclosure
        variant="row"
        open={open}
        onOpenChange={(next) => setExpanded(next ? d.date : null)}
        icon={
          <span className={`block text-2xl ${tone === 'good' ? 'text-gold' : 'text-rose-400/70'}`} style={{ fontFamily: 'serif' }}>
            {d.mansion.cn}
          </span>
        }
        label={
          <>
            <span className="text-mystic-100 text-sm">{fmt(d.date)}</span>
            <span className="text-mystic-600 text-xs"> · {MANSION_MEANINGS[d.mansion.key]?.title}</span>
          </>
        }
        description={<span className="block truncate text-mystic-500">{d.reasons[0]?.text}</span>}
        meta={d.personalClash ? <AlertTriangle className="w-4 h-4 text-rose-400/80" /> : undefined}
        contentClassName="pl-11"
      >
        <ul className="space-y-1">
          {d.reasons.map((r, i) => (
            <li key={i} className="text-[13px] leading-relaxed">
              <span className={r.weight > 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                {r.weight > 0 ? '+' : ''}{r.weight}
              </span>{' '}
              <span className="text-mystic-300">{r.text}</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    );
  };

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow="擇日"
        title={t('dates.title', { defaultValue: 'Pick a good day' })}
        subtitle={t('dates.intro', {
          defaultValue:
            'Chinese date selection asks a different question from a birth chart: not what you are like, but when to do a particular thing. Each day is read from the lunar mansion that governs it — and, once we know your birth date, from how the day sits against your own pillars.',
        })}
        onBack={() => navigate(-1)}
        backLabel={t('common.back', { defaultValue: 'Back' }) as string}
        divider
      />

      <Section
        title={t('dates.whatFor', { defaultValue: 'What are you choosing a day for?' })}
        headingLevel="h3"
        contentClassName="space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INTENTIONS) as Intention[]).map((k) => (
            <Chip
              key={k}
              size="sm"
              selected={intention === k}
              onSelect={() => { setIntention(k); setExpanded(null); }}
            >
              <span style={{ fontFamily: 'serif' }}>{INTENTIONS[k].cn}</span> {INTENTIONS[k].label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-mystic-500">{INTENTIONS[intention].blurb}</p>
      </Section>

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

      <Section
        title={t('dates.best', { defaultValue: 'Best days ahead' })}
        headingLevel="h3"
        action={
          <Button variant="ghost" size="sm" onClick={download}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('dates.export', { defaultValue: 'Calendar' })}
          </Button>
        }
      >
        {best.map((d) => <DayRow key={d.date} d={d} tone="good" />)}
        <p className="text-[11px] text-mystic-600 pt-2">
          <CalendarDays className="w-3 h-3 inline mr-1" />
          {t('dates.windowNote', { defaultValue: `Looking at the next ${WINDOW_DAYS} days. Tap a day to see exactly why it scored the way it did.` })}
        </p>
      </Section>

      {avoid.length > 0 && (
        <Section title={t('dates.avoid', { defaultValue: 'Days to avoid' })} headingLevel="h3">
          {avoid.map((d) => <DayRow key={d.date} d={d} tone="bad" />)}
        </Section>
      )}

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">
        {t('dates.disclaimer', {
          defaultValue:
            'A traditional custom, offered as one. It says nothing about health, money or law — and the score is a plain tally you can check line by line, not an oracle.',
        })}
      </p>
    </Page>
  );
}
