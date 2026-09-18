import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Page, PageHeader, Section, Disclosure } from '../components/ui';
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
 */
export function ZiweiPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { profile } = useAuth();
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(profile?.birthTime ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [openPalace, setOpenPalace] = useState<string | null>('life');

  useEffect(() => {
    setPageMeta('Zi Wei Dou Shu Chart', 'Cast your 紫微斗数 chart — 12 palaces, 14 major stars, and the four transformations, computed from the true lunar calendar.');
  }, []);

  const chart = useMemo(
    () => (submitted && birthDate ? computeZiweiChart(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );

  const lifePalace = chart?.palaces.find((p) => p.isLife);

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow="紫微斗数"
        title={t('ziwei.title', { defaultValue: 'Zi Wei Dou Shu' })}
        subtitle={ZIWEI_INTRO}
        onBack={() => navigate(-1)}
        backLabel={t('common.back', { defaultValue: 'Back' }) as string}
        divider
      />

      {!chart && (
        <Card className="p-4 space-y-4">
          <Input
            type="date"
            label={t('ziwei.birthDate', { defaultValue: 'Birth date' })}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Input
            type="time"
            label={t('ziwei.birthTime', { defaultValue: 'Birth time (the 時辰 sets your Life Palace — please give it if you can)' })}
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
          <Button variant="primary" size="md" fullWidth disabled={!birthDate} onClick={() => setSubmitted(true)}>
            <HoroscopeWheelIcon className="w-4 h-4 mr-2" /> {t('ziwei.cast', { defaultValue: 'Cast my chart' })}
          </Button>
          {!birthTime && (
            <p className="text-meta text-mystic-400">
              Without a birth time we assume noon (午時). The star pattern stays right, but your Life Palace may shift.
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
                  <div className="text-mystic-200 text-meta">
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
            {chart.transformations.map((t) => {
              const meta = TRANSFORMATION_MEANINGS[t.kind];
              const star = STAR_MEANINGS[t.star];
              return (
                <div key={t.kind} className="text-ui">
                  <span className="text-gold">{star?.cn ?? t.star} {meta.cn}</span>
                  <span className="text-mystic-400"> · {meta.en}</span>
                  <p className="reading-copy mt-1">{meta.text}</p>
                </div>
              );
            })}
            {chart.yearStemCn === '庚' && (
              <p className="text-meta text-mystic-400 pt-1">
                Schools disagree about 庚 years. We follow the 中州派 reading (陽祿 武權 陰科 同忌),
                which is what most modern charts use; the 全書 lineage assigns 同科 相忌 instead.
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
                      {p.isBody && <span className="text-cosmic-violetLight text-meta"> · 身宮</span>}
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
                      An empty palace isn't a lack — it borrows from the palace opposite, and asks you to bring your own emphasis here.
                    </p>
                  )}
                </Disclosure>
              );
            })}
          </Section>

          <Button variant="ghost" fullWidth onClick={() => setSubmitted(false)}>{t('ziwei.recast', { defaultValue: 'Cast a different chart' })}</Button>
          <p className="reading-caption">
            For reflection and self-understanding — a symbolic system, not a prediction.
          </p>
        </>
      )}
    </Page>
  );
}
