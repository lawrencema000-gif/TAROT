import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Download, AlertTriangle } from 'lucide-react';
import { Card, Button, Chip, Page, PageHeader, Section, Disclosure, Disclaimer, toast } from '../components/ui';
import {
  INTENTIONS, scoreWindow, bestDays, daysToAvoid, toICS,
  type Intention, type DayScore, type DayReason, type DayReasonCode,
} from '../data/auspiciousDates';
import { MANSION_ACTIVITIES } from '../data/lunarMansions';
import { MANSION_MEANINGS } from '../data/lunarMansionsContent';
import { computeBazi } from '../data/bazi';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { useContentOverlay, ct, ctList } from '../i18n/contentOverlay';
import { localizeHanzi, hanziLang, hanziUnlessShown } from '../i18n/localizeHanzi';
import { setPageMeta } from '../utils/seo';
import { shareFile } from '../utils/nativeShare';

/** English templates for the reasons a day scored as it did (dates.reasons.*). */
const REASON_EN: Record<DayReasonCode, string> = {
  favours: '{{mansion}} favours {{activity}}',
  counselsAgainst: '{{mansion}} counsels against {{activity}}',
  auspiciousGeneral: '{{mansion}} is a 吉宿 — generally favourable, with nothing specific recorded for this',
  inauspiciousGeneral: '{{mansion}} is a 凶宿 — generally unfavourable, with nothing specific recorded for this',
  dayClash: 'The day branch clashes with your own day pillar (日沖) — the classic reason to pick another date',
  yearClash: 'The day clashes with your year branch (沖太歲)',
  dayCombine: 'The day combines with your day pillar (六合) — an easy, cooperative day for you',
  frameSupport: 'The day shares a 三合 frame with your day pillar — quietly supportive',
};

const WINDOW_DAYS = 90;

/** The calendar file's type; the blob and shareFile name the same one. */
const ICS_MIME = 'text/calendar;charset=utf-8';

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
  // Purposes from the `auspicious` content module; mansion titles and
  // activities from `mansions`. English until loaded, never blank.
  const { overlay: auspOverlay } = useContentOverlay('auspicious');
  const { overlay: mansionsOverlay } = useContentOverlay('mansions');
  const intentionLabel = (k: Intention) => ct(auspOverlay, `intentions.${k}.label`, INTENTIONS[k].label);
  const intentionBlurb = (k: Intention) => ct(auspOverlay, `intentions.${k}.blurb`, INTENTIONS[k].blurb);
  const mansionTitle = (d: DayScore) =>
    ct(mansionsOverlay, `mansions.${d.mansion.key}.title`, MANSION_MEANINGS[d.mansion.key]?.title ?? '');
  // The data's hanzi in the reader's script: 毕 beside the title 毕宿 in
  // Chinese, 参 beside 参宿 in Japanese, never the traditional 畢 / 參 (P7 F32).
  const locale = getLocale();
  const lang = hanziLang(locale);
  const glyph = (d: DayScore) => localizeHanzi(d.mansion.cn, locale);
  /** A reason in the reader's language, built from its code (the English `text` is the ICS fallback). */
  const reasonText = (r: DayReason, d: DayScore): string => {
    let activity = '';
    if (r.activity) {
      const en = MANSION_ACTIVITIES[r.activity.mansionKey]?.[r.activity.list] ?? [];
      const list = ctList(mansionsOverlay, `mansions.${r.activity.mansionKey}.${r.activity.list}`, en);
      activity = (list[r.activity.index] ?? '').toLowerCase();
    }
    return t(`dates.reasons.${r.code}`, { defaultValue: REASON_EN[r.code], mansion: glyph(d), activity }) as string;
  };
  const title = t('dates.title', { defaultValue: 'Pick a good day' }) as string;
  const lede = t('dates.lede', { defaultValue: 'Zeri — choosing the day for a thing' }) as string;
  // The title or lede already says 擇日 in Chinese (择日), Japanese (択日) and Korean (擇日).
  const ledeHanzi = hanziUnlessShown('擇日', locale, [title, lede]);
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

  // The calendar file in the reader's language. On Android/iOS the WebView
  // ignores <a download>, so shareFile hands it to the share sheet (the same
  // path as the data export: open it in a calendar, save it, mail it); on
  // the web it downloads. Only a failure needs saying: the share sheet or
  // the browser's download already show where the file went.
  const download = async () => {
    // The event SUMMARY names the mansion by its data glyph; hand toICS the
    // reader's script so the file says 毕, as the screen does.
    const days = best.map((d) => ({ ...d, mansion: { ...d.mansion, cn: glyph(d) } }));
    const ics = toICS(days, intention, { title: intentionLabel(intention), reason: reasonText });
    const blob = new Blob([ics], { type: ICS_MIME });
    const fileName = `arcana-${intention}-dates.ics`;
    const outcome = await shareFile(blob, fileName, ICS_MIME, { title: intentionLabel(intention) });
    if (outcome === 'failed') {
      toast(t('dates.exportFailed', { defaultValue: 'Couldn’t save the calendar file. Try again.' }), 'error');
    }
  };

  // The app's language, not the device's.
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(getLocale(), {
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
          <span className={`block text-title ${tone === 'good' ? 'text-gold' : 'text-coral'}`} style={{ fontFamily: 'serif' }} lang={lang}>
            {glyph(d)}
          </span>
        }
        label={
          <>
            <span className="text-mystic-100 text-ui">{fmt(d.date)}</span>
            <span className="text-mystic-500 text-meta"> · {mansionTitle(d)}</span>
          </>
        }
        description={<span className="block truncate text-mystic-500">{d.reasons[0] ? reasonText(d.reasons[0], d) : ''}</span>}
        meta={d.personalClash ? <AlertTriangle className="w-4 h-4 text-coral/80" /> : undefined}
        contentClassName="pl-11"
      >
        <ul className="space-y-1">
          {d.reasons.map((r, i) => (
            <li key={i} className="text-meta">
              <span className={`tabular-nums ${r.weight > 0 ? 'text-teal' : 'text-coral'}`}>
                {r.weight > 0 ? '+' : ''}{r.weight}
              </span>{' '}
              <span className="text-mystic-300">{reasonText(r, d)}</span>
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
        title={title}
        subtitle={
          <>
            <span className="block text-meta text-mystic-400 mb-1">
              {ledeHanzi && (
                <>
                  <span lang={lang}>{ledeHanzi}</span>
                  {' · '}
                </>
              )}
              {lede}
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
              <span style={{ fontFamily: 'serif' }} lang={lang}>{localizeHanzi(INTENTIONS[k].cn, locale)}</span> {intentionLabel(k)}
            </Chip>
          ))}
        </div>
        <p className="text-meta text-mystic-500">{intentionBlurb(intention)}</p>
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
          <Button variant="ghost" size="sm" onClick={() => { void download(); }}>
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
