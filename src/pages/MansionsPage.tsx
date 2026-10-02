import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Card, Button, Input, EyebrowLabel, Page, PageHeader, Section, Disclosure, Disclaimer } from '../components/ui';
import {
  MANSIONS, MANSION_ACTIVITIES, QUADRANT_INFO, PLANET7_INFO,
  mansionForDate, mansionForBirth, sukuyoMansionForBirth,
  type Mansion, type Quadrant,
} from '../data/lunarMansions';
import {
  MANSION_MEANINGS, MANSION_DAILY_ADVICE, QUADRANT_MEANINGS, MANSION_INTRO,
} from '../data/lunarMansionsContent';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';

/**
 * 二十八宿 — the Twenty-Eight Lunar Mansions.
 *
 * Two readings, kept visibly separate rather than blended: the mansion
 * governing today (the Chinese 值日 cycle, which almanacs use for choosing when
 * to act) and the mansion of your birth day, which describes temperament.
 *
 * Today's mansion and the birth mansion lead; the essay about the system
 * sits in a Disclosure, and the birth reading casts itself from the profile
 * (R7). CJK is never set below 13px — the Chinese name is the lede, not the
 * eyebrow.
 */

/** A CJK character set large, in a serif. 28px (text-display) for today, 36px for the birth mansion. */
const CJK_SERIF = { fontFamily: 'serif' } as const;

export function MansionsPage() {
  const navigate = useNavigate();
  // The mansions.* strings live in app.json; the common namespace this page
  // used to read left every label English in ja/ko/zh.
  const { t } = useT(['app', 'common']);
  const { profile } = useAuth();
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  // The 値日 cycle turns at midnight, so only the date matters here. We still
  // pass the profile's time through for the sukuyō reading, which is defined on
  // the lunar day and can shift across a day boundary.
  const birthTime = profile?.birthTime ?? '';
  const [submitted, setSubmitted] = useState(!!profile?.birthDate);
  const [touched, setTouched] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta(
      'Lunar Mansions — 二十八宿',
      'The Chinese division of the sky the Moon passes through: today’s governing mansion, and the mansion of the day you were born.',
    );
  }, []);

  // Auto-cast once the profile has resolved, unless the user has typed a date.
  useEffect(() => {
    if (touched || !profile?.birthDate) return;
    setBirthDate(profile.birthDate);
    setSubmitted(true);
  }, [profile?.birthDate, touched]);

  const today = useMemo(() => mansionForDate(new Date()), []);
  const birth = useMemo(
    () => (submitted && birthDate ? mansionForBirth(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );
  const sukuyo = useMemo(
    () => (submitted && birthDate ? sukuyoMansionForBirth(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );

  const byQuadrant = useMemo(() => {
    const out: Record<Quadrant, Mansion[]> = {
      azureDragon: [], blackTortoise: [], whiteTiger: [], vermilionBird: [],
    };
    for (const m of MANSIONS) out[m.quadrant].push(m);
    return out;
  }, []);

  const renderActivities = (m: Mansion) => {
    const acts = MANSION_ACTIVITIES[m.key];
    if (!acts) return null;
    return (
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="font-display-eyebrow text-teal mb-1">{t('mansions.favoured', { defaultValue: '宜 · Favoured' })}</div>
          {acts.favourable.length === 0 ? (
            <p className="text-ui text-mystic-300 italic">
              {t('mansions.nothingFavoured', { defaultValue: 'The almanacs record nothing favoured here — a day to keep small rather than start.' })}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {acts.favourable.map((a) => (
                <li key={a} className="text-ui text-mystic-200">{a}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="font-display-eyebrow text-coral mb-1">{t('mansions.avoided', { defaultValue: '忌 · Avoided' })}</div>
          {acts.unfavourable.length === 0 ? (
            <p className="text-ui text-mystic-300 italic">{t('mansions.nothingAvoided', { defaultValue: 'Nothing particular to avoid.' })}</p>
          ) : (
            <ul className="space-y-0.5">
              {acts.unfavourable.map((a) => (
                <li key={a} className="text-ui text-mystic-200">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={t('mansions.eyebrow', { defaultValue: 'Chinese sky lore' })}
        title={t('mansions.title', { defaultValue: 'The Lunar Mansions' })}
        subtitle={
          <span className="block text-meta text-mystic-400">
            <span lang="zh-Hant">二十八宿</span>
            {' · '}
            {t('mansions.lede', { defaultValue: 'The twenty-eight lodges the Moon passes through: one governs today, one was yours at birth.' })}
          </span>
        }
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' }) as string}
      />

      <Disclosure
        label={t('mansions.aboutLabel', { defaultValue: 'About this system' })}
        description={t('mansions.aboutDescription', { defaultValue: 'Where the twenty-eight come from, and how the daily count works' })}
      >
        <p className="reading-copy">{MANSION_INTRO}</p>
      </Disclosure>

      {/* Today's governing mansion */}
      {today && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-gold" aria-hidden />
            <EyebrowLabel>{t('mansions.today', { defaultValue: 'Today' })}</EyebrowLabel>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-display text-gold" style={CJK_SERIF} lang="zh-Hant">{today.cn}</span>
            <span className="text-mystic-100 text-body">{MANSION_MEANINGS[today.key]?.title}</span>
            <span className="text-meta text-mystic-400" lang="zh-Hant">
              {today.cn}{PLANET7_INFO[today.planet].cn}{today.animalCn}
            </span>
          </div>
          <p className="reading-copy">{MANSION_DAILY_ADVICE[today.key]}</p>
          {renderActivities(today)}
        </Card>
      )}

      {/* Birth mansion */}
      {!birth && (
        <Card className="p-4 space-y-4">
          <h3 className="heading-display-md text-mystic-100">{t('mansions.birthHeading', { defaultValue: 'Your birth mansion' })}</h3>
          <Input
            type="date"
            label={t('mansions.birthDate', { defaultValue: 'Birth date' })}
            value={birthDate}
            onChange={(e) => { setTouched(true); setBirthDate(e.target.value); }}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Button variant="primary" size="md" fullWidth disabled={!birthDate} onClick={() => setSubmitted(true)}>
            <Moon className="w-4 h-4" aria-hidden /> {t('mansions.find', { defaultValue: 'Find my mansion' })}
          </Button>
          <p className="text-meta text-mystic-400">
            {t('mansions.dateOnlyNote', { defaultValue: 'The 值日 mansion turns over at midnight, so the date is all this needs — a birth time changes nothing here.' })}
          </p>
        </Card>
      )}

      {birth && (
        <>
          <Card className="p-4 space-y-3">
            <EyebrowLabel>{t('mansions.birthHeading', { defaultValue: 'Your birth mansion' })}</EyebrowLabel>
            <div className="flex items-baseline gap-3">
              <span className="text-hero text-gold" style={CJK_SERIF} lang="zh-Hant">{birth.cn}</span>
              <div>
                <div className="text-mystic-100 text-body">{MANSION_MEANINGS[birth.key]?.title}</div>
                <div className="text-meta text-mystic-400" lang="zh-Hant">
                  {birth.cn}{PLANET7_INFO[birth.planet].cn}{birth.animalCn} · {QUADRANT_INFO[birth.quadrant].cn}
                </div>
              </div>
            </div>
            <p className="reading-copy">{MANSION_MEANINGS[birth.key]?.text}</p>
            <p className="reading-copy border-t border-mystic-800/40 pt-3">
              <span className="text-gold">{QUADRANT_INFO[birth.quadrant].en}</span> — {QUADRANT_MEANINGS[birth.quadrant]?.text}
            </p>
          </Card>

          {sukuyo && sukuyo.key !== birth.key && (
            <Section eyebrow={t('mansions.sukuyoEyebrow', { defaultValue: '宿曜 · the Japanese reading' })} spacing="sm">
              <p className="reading-copy">
                {t('mansions.sukuyoBefore', {
                  defaultValue: 'The Japanese 宿曜道 tradition counts differently — from your lunar month and day rather than the running day cycle — and puts you in',
                })}{' '}
                <span className="text-gold" lang="zh-Hant">{sukuyo.cn} {MANSION_MEANINGS[sukuyo.key]?.title}</span>.{' '}
                {t('mansions.sukuyoAfter', {
                  defaultValue: 'Both are genuine; they answer slightly different questions, so we show them separately rather than pick one for you.',
                })}
              </p>
            </Section>
          )}

          <Button variant="ghost" fullWidth onClick={() => { setTouched(true); setSubmitted(false); }}>
            {t('mansions.recast', { defaultValue: 'Use a different date' })}
          </Button>
        </>
      )}

      {/* The full sky, by quadrant */}
      <Section
        title={t('mansions.all', { defaultValue: 'All twenty-eight' })}
        headingLevel="h3"
        contentClassName="space-y-4"
      >
        {(Object.keys(byQuadrant) as Quadrant[]).map((q) => (
          <div key={q} className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-ui font-medium text-mystic-100" lang="zh-Hant">{QUADRANT_INFO[q].cn}</span>
              <span className="text-ui text-mystic-200">{QUADRANT_INFO[q].en}</span>
              <span className="text-meta text-mystic-400">— {QUADRANT_INFO[q].season}, {QUADRANT_INFO[q].element}</span>
            </div>
            {byQuadrant[q].map((m) => {
              const open = openKey === m.key;
              return (
                <Disclosure
                  key={m.key}
                  variant="row"
                  open={open}
                  onOpenChange={(next) => setOpenKey(next ? m.key : null)}
                  icon={
                    <span className="block w-6 text-center text-gold text-ui" style={CJK_SERIF} lang="zh-Hant">{m.cn}</span>
                  }
                  label={
                    <>
                      <span className="text-mystic-100 text-ui">{MANSION_MEANINGS[m.key]?.title}</span>
                      <span className="text-meta text-mystic-400"> · {m.animal}</span>
                    </>
                  }
                  meta={
                    <span className={`text-ui ${m.fortune === 'auspicious' ? 'text-teal' : 'text-coral'}`} lang="zh-Hant">
                      {m.fortune === 'auspicious' ? '吉' : '凶'}
                    </span>
                  }
                  contentClassName="pl-8 space-y-2"
                >
                  <p className="reading-copy">{MANSION_MEANINGS[m.key]?.text}</p>
                  {renderActivities(m)}
                </Disclosure>
              );
            })}
          </div>
        ))}
      </Section>

      <p className="reading-caption max-w-prose">
        {t('mansions.countNote', {
          defaultValue: 'The 值日 cycle is a calendrical count that has run unbroken for centuries — not a live measurement of where the Moon is tonight.',
        })}
      </p>
      <Disclaimer kind="general" />
    </Page>
  );
}
