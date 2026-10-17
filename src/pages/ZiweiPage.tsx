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
import { getLocale } from '../i18n/config';
import { useContentOverlay, ct } from '../i18n/contentOverlay';
import { localizeHanzi, hanziLang, hanziUnlessShown } from '../i18n/localizeHanzi';
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
  // The chart's hanzi in the reader's script: 天机 / 化禄 / 命宫 in Chinese,
  // 官禄宮 / 化権 in Japanese, the traditional forms in English and Korean.
  const locale = getLocale();
  const lang = hanziLang(locale);
  const hz = (s: string) => localizeHanzi(s, locale);
  const { profile } = useAuth();
  // Star, palace, transformation and bureau prose from the `ziwei` content
  // module, keyed by star / palace / kind / bureau id; English until loaded.
  const { overlay, ready } = useContentOverlay('ziwei');
  const title = t('ziwei.title', { defaultValue: 'Zi Wei Dou Shu' }) as string;
  const lede = t('ziwei.lede', { defaultValue: 'Twelve palaces, fourteen major stars, four transformations — placed from your lunar birth date and hour.' }) as string;
  // 紫微斗数 is the title itself in Chinese and Japanese.
  const ledeHanzi = hanziUnlessShown('紫微斗數', locale, [title, lede]);
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
        title={title}
        subtitle={
          <span className="block text-meta text-mystic-400">
            {ledeHanzi && (
              <>
                <span lang={lang}>{ledeHanzi}</span>
                {' · '}
              </>
            )}
            {lede}
          </span>
        }
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' }) as string}
      />

      <Disclosure
        label={t('ziwei.aboutLabel', { defaultValue: 'About this system' })}
        description={t('ziwei.aboutDescription', { defaultValue: 'What the chart is, and what it is not' })}
      >
        <p className="reading-copy">{ct(overlay, 'intro', ZIWEI_INTRO)}</p>
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
                    {t('ziwei.lunarDate', {
                      defaultValue: '農曆 {{date}}',
                      date: `${chart.lunar.isLeapMonth ? hz('閏') : ''}${chart.lunar.month}/${chart.lunar.day}`,
                    })}
                  </div>
                  <div className="text-mystic-400 text-meta">{hz(`${chart.yearStemCn}年 · ${chart.hourBranchCn}時`)}</div>
                  {lifePalace && (
                    <div className="text-mystic-400 text-meta pt-1">
                      {t('ziwei.lifePalaceIn', { defaultValue: '命宮 in {{branch}}', branch: lifePalace.branchCn })}
                    </div>
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
              <span className="text-gold">{chart.bureauCn}</span> — {ct(overlay, `bureaus.${chart.bureau}`, BUREAU_MEANINGS[chart.bureau])}
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
                  <span className="text-gold">{hz(`${star?.cn ?? tr.star} ${meta.cn}`)}</span>
                  <span className="text-mystic-400"> · {ct(overlay, `transformations.${tr.kind}.name`, meta.en)}</span>
                  <p className="reading-copy mt-1">{ct(overlay, `transformations.${tr.kind}.text`, meta.text)}</p>
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
              // The traditional term in the reader's script (命宮, 官禄宮;
              // 命宫 in Chinese), then the overlay's name for it: a gloss in
              // English, Japanese and Korean (Life, 自分自身, 명궁), which
              // Chinese doesn't need because its overlay name is the term
              // itself (P7 F22/F78). The gloss waits for the overlay, so a
              // CJK reader never sees the English one flash.
              const term = hz(p.cn);
              const gloss = ready ? (meaning ? ct(overlay, `palaces.${p.key}.name`, meaning.en) : p.en) : '';
              return (
                <Disclosure
                  key={p.key}
                  variant="row"
                  open={open}
                  onOpenChange={(next) => setOpenPalace(next ? p.key : null)}
                  icon={<span className="block w-5 text-mystic-500">{p.branchCn}</span>}
                  label={
                    <>
                      <span className={p.isLife ? 'text-gold' : 'text-mystic-100'} lang={lang}>{term}</span>
                      {gloss && gloss !== term && <span className="text-mystic-400 text-meta"> {gloss}</span>}
                      {p.isBody && <span className="text-cosmic-violet-ink text-meta" lang={lang}> · {hz('身宮')}</span>}
                    </>
                  }
                  meta={
                    p.stars.length === 0 ? '—' : p.stars.map((s) => (
                      <span key={s.key} className={s.isSupport ? 'text-mystic-600' : undefined}>{hz(s.cn)} </span>
                    ))
                  }
                  contentClassName="pl-7 space-y-3"
                >
                  {meaning && <p className="reading-copy">{ct(overlay, `palaces.${p.key}.text`, meaning.text)}</p>}
                  {p.stars.map((s) => {
                    const sm = STAR_MEANINGS[s.key];
                    if (!sm) return null;
                    return (
                      <p key={s.key} className="reading-copy">
                        <span className="text-gold">{hz(sm.cn)} · {ct(overlay, `stars.${s.key}.title`, sm.title)}</span> — {ct(overlay, `stars.${s.key}.text`, sm.text)}
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
