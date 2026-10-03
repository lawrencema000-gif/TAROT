import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Download, AlertTriangle } from 'lucide-react';
import { Card, Button, Chip, Page, PageHeader, Section, Disclosure, Disclaimer } from '../components/ui';
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
  const { t } = useT('app');
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
          <span className={`block text-title ${tone === 'good' ? 'text-gold' : 'text-coral'}`} style={{ fontFamily: 'serif' }} lang="zh-Hant">
            {d.mansion.cn}
          </span>
        }
        label={
          <>
            <span className="text-mystic-100 text-ui">{fmt(d.date)}</span>
            <span className="text-mystic-500 text-meta"> · {MANSION_MEANINGS[d.mansion.key]?.title}</span>
          </>
        }
        description={<span className="block truncate text-mystic-500">{d.reasons[0]?.text}</span>}
        meta={d.personalClash ? <AlertTriangle className="w-4 h-4 text-coral/80" /> : undefined}
        contentClassName="pl-11"
      >
        <ul className="space-y-1">
          {d.reasons.map((r, i) => (
            <li key={i} className="text-meta">
              <span className={`tabular-nums ${r.weight > 0 ? 'text-teal' : 'text-coral'}`}>
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
        eyebrow={t('dates.eyebrow', { defaultValue: 'Chinese date selection' })}
        title={t('dates.title', { defaultValue: 'Pick a good day' })}
        subtitle={
          <>
            <span className="block text-meta text-mystic-400 mb-1">
              <span lang="zh-Hant">擇日</span>
              {' · '}
              {t('dates.lede', { defaultValue: 'Zeri — choosing the day for a thing' })}
            </span>
            {t('dates.intro', {
              defaultValue:
                'Chinese date selection asks a different question from a birth chart: not what you are like, but when to do a particular thing. Each day is read from the lunar mansion that governs it — and, once we know your birth date, from how the day sits against your own pillars.',
            })}
          </>
        }
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' }) as string}
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
              <span style={{ fontFamily: 'serif' }} lang="zh-Hant">{INTENTIONS[k].cn}</span> {INTENTIONS[k].label}
            </Chip>
          ))}
        </div>
        <p className="text-meta text-mystic-500">{INTENTIONS[intention].blurb}</p>
      </Section>

      {!birth && (
        <Card className="p-4">
          <p className="text-ui text-mystic-300">
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
            {t('dates.export', { defaultValue: 'Add to my calendar' })}
          </Button>
        }
      >
        {best.map((d) => <DayRow key={d.date} d={d} tone="good" />)}
        <p className="text-meta text-mystic-500 pt-2">
          <CalendarDays className="w-3 h-3 inline mr-1" />
          {t('dates.windowNote', { defaultValue: 'Looking at the next {{days}} days. Tap a day to see exactly why it scored the way it did.', days: WINDOW_DAYS })}
        </p>
      </Section>

      {avoid.length > 0 && (
        <Section title={t('dates.avoid', { defaultValue: 'Days to avoid' })} headingLevel="h3">
          {avoid.map((d) => <DayRow key={d.date} d={d} tone="bad" />)}
        </Section>
      )}

      <p className="text-center text-meta text-mystic-500 max-w-sm mx-auto">
        {t('dates.disclaimer', {
          defaultValue:
            'A traditional custom, offered as one. It says nothing about health, money or law — and the score is a plain tally you can check line by line, not an oracle.',
        })}
      </p>
      <Disclaimer kind="general" />
    </Page>
  );
}
