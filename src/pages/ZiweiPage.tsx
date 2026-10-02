import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Page, PageHeader, Section, Disclosure, Disclaimer } from '../components/ui';
import { HoroscopeWheelIcon } from '../components/ui/NavIcons';
import { ZiweiChart } from '../components/charts/ZiweiChart';
import { computeZiweiChart } from '../data/ziwei';
import {
  STAR_MEANINGS, PALACE_MEANINGS, TRANSFORMATION_MEANINGS,
  BUREAU_MEANINGS, ZIWEI_INTRO,
} from '../data/ziweiContent';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';

/**
 * Zi Wei Dou Shu (紫微斗数) — the Chinese "Emperor star" system, the one
 * major divination tradition Arcana was missing. Every placement derives from
 * the ephemeris-computed lunar calendar, so charts stay correct rather than
 * drifting with a lookup table.
 *
 * The chart is the screen: it casts itself from the profile's birth data on
 * arrival, and the long introduction sits in a Disclosure under the header
 * rather than 1,000 characters above the first control (R7).
 */
export function ZiweiPage() {
  const navigate = useNavigate();
  // The ziwei.* strings live in app.json; the common namespace this page
  // used to read left every label English in ja/ko/zh.
  const { t } = useT(['app', 'common']);
  const { profile } = useAuth();
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(profile?.birthTime ?? '');
  const [submitted, setSubmitted] = useState(!!profile?.birthDate);
  // The user has typed into the form; the profile arriving later must not
  // overwrite what they entered.
  const [touched, setTouched] = useState(false);
  const [openPalace, setOpenPalace] = useState<string | null>('life');

  useEffect(() => {
    setPageMeta('Zi Wei Dou Shu Chart', 'Cast your 紫微斗数 chart — 12 palaces, 14 major stars, and the four transformations, computed from the true lunar calendar.');
  }, []);

  // Auto-cast: the profile can resolve after first paint, so follow it once.
  useEffect(() => {
    if (touched || !profile?.birthDate) return;
    setBirthDate(profile.birthDate);
    setBirthTime(profile.birthTime ?? '');
    setSubmitted(true);
  }, [profile?.birthDate, profile?.birthTime, touched]);

  const chart = useMemo(
    () => (submitted && birthDate ? computeZiweiChart(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );

  const lifePalace = chart?.palaces.find((p) => p.isLife);

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={t('ziwei.eyebrow', { defaultValue: 'Chinese astrology' })}
        title={t('ziwei.title', { defaultValue: 'Zi Wei Dou Shu' })}
        subtitle={
          <span className="block text-meta text-mystic-400">
            <span lang="zh-Hant">紫微斗數</span>
            {' · '}
            {t('ziwei.lede', { defaultValue: 'Twelve palaces, fourteen major stars, four transformations — placed from your lunar birth date and hour.' })}
          </span>
        }
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' }) as string}
      />

      <Disclosure
        label={t('ziwei.aboutLabel', { defaultValue: 'About this system' })}
        description={t('ziwei.aboutDescription', { defaultValue: 'What the chart is, and what it is not' })}
      >
        <p className="reading-copy">{ZIWEI_INTRO}</p>
      </Disclosure>

      {!chart && (
        <Card className="p-4 space-y-4">
          <Input
            type="date"
            label={t('ziwei.birthDate', { defaultValue: 'Birth date' })}
            value={birthDate}
            onChange={(e) => { setTouched(true); setBirthDate(e.target.value); }}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Input
            type="time"
            label={t('ziwei.birthTime', { defaultValue: 'Birth time (the 時辰 sets your Life Palace — please give it if you can)' })}
            value={birthTime}
            onChange={(e) => { setTouched(true); setBirthTime(e.target.value); }}
          />
          <Button variant="primary" size="md" fullWidth disabled={!birthDate} onClick={() => setSubmitted(true)}>
            <HoroscopeWheelIcon className="w-4 h-4" /> {t('ziwei.cast', { defaultValue: 'Cast my chart' })}
          </Button>
          {!birthTime && (
            <p className="text-meta text-mystic-400">
              {t('ziwei.noTimeNote', { defaultValue: 'Without a birth time we assume noon (午時). The star pattern stays right, but your Life Palace may shift.' })}
            </p>
          )}
        </Card>
      )}

      {chart && (
        <>
          <Card className="p-3">
            <ZiweiChart
              palaces={chart.palaces}
              centre={
                <div className="space-y-0.5">
                  <div className="text-gold text-meta">{chart.bureauCn}</div>
                  <div className="text-mystic-200 text-meta tabular-nums">
                    農曆 {chart.lunar.isLeapMonth ? '閏' : ''}{chart.lunar.month}/{chart.lunar.day}
                  </div>
                  <div className="text-mystic-400 text-meta">{chart.yearStemCn}年 · {chart.hourBranchCn}時</div>
                  {lifePalace && (
                    <div className="text-mystic-400 text-meta pt-1">命宮 in {lifePalace.branchCn}</div>
                  )}
                </div>
              }
            />
          </Card>

          {!birthTime && (
            <p className="text-meta text-mystic-400 text-center">
              {t('ziwei.noTimeNote', { defaultValue: 'Without a birth time we assume noon (午時). The star pattern stays right, but your Life Palace may shift.' })}
            </p>
          )}

          <Section title={t('ziwei.bureau', { defaultValue: 'Your bureau' })} headingLevel="h3" spacing="sm">
            <p className="reading-copy">
              <span className="text-gold">{chart.bureauCn}</span> — {BUREAU_MEANINGS[chart.bureau]}
            </p>
          </Section>

          <Section
            title={t('ziwei.transformations', { defaultValue: 'The four transformations' })}
            headingLevel="h3"
            contentClassName="space-y-3"
          >
            {chart.transformations.map((tr) => {
              const meta = TRANSFORMATION_MEANINGS[tr.kind];
              const star = STAR_MEANINGS[tr.star];
              return (
                <div key={tr.kind} className="text-ui">
                  <span className="text-gold">{star?.cn ?? tr.star} {meta.cn}</span>
                  <span className="text-mystic-400"> · {meta.en}</span>
                  <p className="reading-copy mt-1">{meta.text}</p>
                </div>
              );
            })}
            {chart.yearStemCn === '庚' && (
              <p className="text-meta text-mystic-400 pt-1">
                {t('ziwei.gengNote', {
                  defaultValue:
                    'Schools disagree about 庚 years. We follow the 中州派 reading (陽祿 武權 陰科 同忌), which is what most modern charts use; the 全書 lineage assigns 同科 相忌 instead.',
                })}
              </p>
            )}
          </Section>

          <Section title={t('ziwei.palaces', { defaultValue: 'The twelve palaces' })} headingLevel="h3">
            {chart.palaces.map((p) => {
              const open = openPalace === p.key;
              const meaning = PALACE_MEANINGS[p.key];
              return (
                <Disclosure
                  key={p.key}
                  variant="row"
                  open={open}
                  onOpenChange={(next) => setOpenPalace(next ? p.key : null)}
                  icon={<span className="block w-5 text-mystic-500">{p.branchCn}</span>}
                  label={
                    <>
                      <span className={p.isLife ? 'text-gold' : 'text-mystic-100'}>{p.cn}</span>
                      <span className="text-mystic-400 text-meta"> {meaning?.en ?? p.en}</span>
                      {p.isBody && <span className="text-cosmic-violet-ink text-meta"> · 身宮</span>}
                    </>
                  }
                  meta={
                    p.stars.length === 0 ? '—' : p.stars.map((s) => (
                      <span key={s.key} className={s.isSupport ? 'text-mystic-600' : undefined}>{s.cn} </span>
                    ))
                  }
                  contentClassName="pl-7 space-y-3"
                >
                  {meaning && <p className="reading-copy">{meaning.text}</p>}
                  {p.stars.map((s) => {
                    const sm = STAR_MEANINGS[s.key];
                    if (!sm) return null;
                    return (
                      <p key={s.key} className="reading-copy">
                        <span className="text-gold">{sm.cn} · {sm.title}</span> — {sm.text}
                      </p>
                    );
                  })}
                  {p.stars.length === 0 && (
                    <p className="reading-copy italic">
                      {t('ziwei.emptyPalace', {
                        defaultValue: 'An empty palace isn’t a lack — it borrows from the palace opposite, and asks you to bring your own emphasis here.',
                      })}
                    </p>
                  )}
                </Disclosure>
              );
            })}
          </Section>

          <Button variant="ghost" fullWidth onClick={() => { setTouched(true); setSubmitted(false); }}>
            {t('ziwei.recast', { defaultValue: 'Cast a different chart' })}
          </Button>
          <Disclaimer kind="general" />
        </>
      )}
    </Page>
  );
}
