import { useState, useMemo, useEffect } from 'react';
import { Home, Compass, Star, Bed, Briefcase, ChefHat, DoorOpen, Sofa, Bath, AlertTriangle, Wind, Target, Share2 } from 'lucide-react';
import { Card, Button, Chip, Input, toast, Page, PageHeader, Section, Disclosure, Tag, EyebrowLabel, ResultSheet } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import {
  BAGUA_AREAS,
  BAGUA_AREA_ORDER,
  computeBaguaReading,
  type BaguaArea,
  type BaguaReading,
} from '../data/fengShuiBagua';
import {
  computeKua,
  DIRECTION_LABEL,
  FAVORABLE_LABEL,
  FAVORABLE_MEANING,
  UNFAVORABLE_LABEL,
  UNFAVORABLE_MEANING,
  type FavorableType,
  type UnfavorableType,
  type Gender,
  type KuaProfile,
  type Direction as KuaDirection,
} from '../data/fengShuiKua';
import {
  getAnnualReading,
} from '../data/fengShuiAnnual';
import { ROOM_GUIDANCE, type Room } from '../data/fengShuiRooms';
import { FENG_SHUI_PROBLEMS } from '../data/fengShuiProblems';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { tArray } from '../utils/tArray';

type Stage = 'rate' | 'result';

export function FengShuiPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('rate');
  const [scores, setScores] = useState<Record<BaguaArea, number>>({
    wealth: 3, fame: 3, relationships: 3, family: 3, health: 3,
    creativity: 3, knowledge: 3, career: 3, helpers: 3,
  });
  const [reading, setReading] = useState<BaguaReading | null>(null);
  // Personal Kua inputs — drive the 8-directions personal-feng-shui section.
  const [birthYear, setBirthYear] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  // Common-problems diagnostic checklist
  const [openProblems, setOpenProblems] = useState<Set<string>>(new Set());
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

  const setScore = (area: BaguaArea, v: number) => {
    setScores((prev) => ({ ...prev, [area]: v }));
  };

  // Pre-fill birth year from profile so users with full birth dates get
  // the correct 立春 (Feb 4) year boundary applied automatically. Gender
  // isn't stored on the profile; user picks it inline.
  useEffect(() => {
    if (profile?.birthDate && !birthYear) {
      setBirthYear(profile.birthDate.slice(0, 4));
    }
  }, [profile, birthYear]);

  const kua: KuaProfile | null = useMemo(() => {
    const yr = parseInt(birthYear, 10);
    if (!gender || !Number.isFinite(yr)) return null;
    // If we have the user's full birthDate (from profile), pass it so the
    // Feb-4 solar-year boundary is applied; otherwise fall back to year only.
    const birthDate = profile?.birthDate?.startsWith(birthYear) ? profile.birthDate : undefined;
    return computeKua(yr, gender, birthDate);
  }, [birthYear, gender, profile?.birthDate]);

  const annual = useMemo(() => getAnnualReading(new Date().getFullYear()), []);

  const compute = () => {
    setReading(computeBaguaReading(scores));
    setStage('result');
  };

  if (stage === 'rate') {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<Home />}
          title={t('fengshui.title', { defaultValue: 'Feng Shui Bagua' })}
        />

        <Card variant="glow" padding="lg">
          <p className="reading-copy mb-4">
            {t('fengshui.intro', {
              defaultValue:
                'The Bagua map divides life into nine areas. Rate how each area of YOUR life feels right now on a 1-5 scale. We\'ll surface the area most wanting attention and the Feng Shui adjustments that nourish it.',
            })}
          </p>

          <div className="space-y-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              return (
                <div key={area} className="p-3 bg-mystic-800/30 rounded-control">
                  <p className="text-ui text-mystic-200 font-medium">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name })}
                  </p>
                  <p className="text-meta text-mystic-400 mb-2">
                    {t(`fengshui.areas.${area}.meaning`, { defaultValue: info.meaning })}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Chip
                        key={v}
                        label={String(v)}
                        selected={scores[area] === v}
                        onSelect={() => setScore(area, v)}
                        size="sm"
                        className="flex-1 justify-center"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-meta text-mystic-400 mt-3">
            {t('fengshui.scale', { defaultValue: '1 = severely depleted · 3 = okay · 5 = thriving' })}
          </p>
        </Card>

        {/* Personal Kua inputs — optional, but unlock 8-directions section. */}
        <Card padding="lg" className="bg-cosmic-violet/5 border-cosmic-violet/20">
          <h3 className="heading-display-md text-mystic-100 mb-2 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cosmic-violet-ink" aria-hidden />
            {t('fengshui.kuaHeading', { defaultValue: 'Your personal Kua (optional)' })}
          </h3>
          <p className="reading-copy mb-3">
            {t('fengshui.kuaIntro', {
              defaultValue:
                'Add your birth year + gender to compute your personal Kua number — the basis of Eight Mansions feng shui. We\'ll show your 4 favourable + 4 unfavourable directions for placing the bed, desk, and front door.',
            })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fengshui-birth-year" className="block text-ui font-medium text-mystic-300 mb-2">
                {t('fengshui.birthYearLabel', { defaultValue: 'Birth year' })}
              </label>
              <Input
                id="fengshui-birth-year"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1990"
                min={1900}
                max={2100}
              />
            </div>
            <div>
              <label htmlFor="fengshui-gender" className="block text-ui font-medium text-mystic-300 mb-2">
                {t('fengshui.genderLabel', { defaultValue: 'Birth gender' })}
              </label>
              <select
                id="fengshui-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 min-h-[48px] text-mystic-100 text-ui focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('fengshui.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                <option value="male">{t('fengshui.male', { defaultValue: 'Male' })}</option>
                <option value="female">{t('fengshui.female', { defaultValue: 'Female' })}</option>
              </select>
            </div>
          </div>
          {kua && (
            <div className="mt-3 p-3 rounded-control bg-mystic-900/40 border border-cosmic-violet/30">
              <p className="text-meta text-mystic-400">
                {t('fengshui.kuaPreview', {
                  defaultValue: 'Kua {{n}} · {{trigram}} · {{group}} group',
                  n: kua.kua, trigram: kua.trigram, group: kua.group,
                })}
              </p>
            </div>
          )}
        </Card>

        <Button variant="primary" size="lg" fullWidth onClick={compute}>
          <Wind className="w-5 h-5" aria-hidden />
          {t('fengshui.reveal', { defaultValue: 'Reveal my Bagua' })}
        </Button>
      </Page>
    );
  }

  if (stage === 'result' && reading) {
    const focusInfo = BAGUA_AREAS[reading.focusArea];
    const strongInfo = BAGUA_AREAS[reading.strongestArea];
    const focusName = t(`fengshui.areas.${reading.focusArea}.name`, { defaultValue: focusInfo.name }) as string;
    const strongName = t(`fengshui.areas.${reading.strongestArea}.name`, { defaultValue: strongInfo.name }) as string;
    const focusMeaning = t(`fengshui.areas.${reading.focusArea}.meaning`, { defaultValue: focusInfo.meaning }) as string;
    const adjustments = tArray(t, `fengshui.areas.${reading.focusArea}.adjustments`, focusInfo.adjustments);

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: focusName,
          subtitle: t('fengshui.shareSubtitle', { defaultValue: 'Needs attention' }) as string,
          tagline: focusMeaning,
          affirmation: adjustments[0] ?? '',
          brand: t('share.brand.fengShui', { defaultValue: 'Feng Shui Bagua' }) as string,
        });
        const out = await shareOrDownload(blob, 'arcana-fengshui.png', `Feng Shui reading: ${focusName}`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <Page spacing="sm">
        <PageHeader
          icon={<Home />}
          title={t('fengshui.title', { defaultValue: 'Feng Shui Bagua' })}
          onBack={() => setStage('rate')}
          backLabel={t('fengshui.backToRate', { defaultValue: 'Re-rate' }) as string}
        />

        {/* 3x3 Bagua grid — the instrument stays on the canvas. */}
        <Card padding="lg">
          <h2 className="heading-display-md text-mystic-100 mb-3">
            {t('fengshui.mapLabel', { defaultValue: 'Your Bagua map' })}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              const score = reading.scores[area];
              const isFocus = area === reading.focusArea;
              const isStrong = area === reading.strongestArea;
              return (
                <div
                  key={area}
                  className={`aspect-square p-2 rounded-inset border flex flex-col items-center justify-center text-center ${
                    isFocus ? 'border-coral/40 bg-coral/10'
                    : isStrong ? 'border-teal/40 bg-teal/10'
                    : 'border-mystic-700/30 bg-mystic-800/30'
                  }`}
                >
                  <span className="text-caption text-mystic-400">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name }).split(' / ')[0]}
                  </span>
                  <span className={`text-title font-semibold tabular-nums mt-1 ${
                    isFocus ? 'text-coral'
                    : isStrong ? 'text-teal'
                    : score >= 4 ? 'text-gold' : 'text-mystic-400'
                  }`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-meta text-mystic-400 text-center tabular-nums">
            {t('fengshui.overallScore', { defaultValue: 'Overall: {{n}} / 5', n: reading.overall.toFixed(1) })}
          </p>
        </Card>

        {/* The reading, on paper: the area that wants attention, what to do
            about it, and the area that is already carrying you. */}
        <ResultSheet
          headingLevel="h2"
          glyph={<Target />}
          eyebrow={t('fengshui.focusLabel', { defaultValue: 'Area needing attention' })}
          title={focusName}
          summaryHeading={t('fengshui.whatItGoverns', { defaultValue: 'What this area governs' })}
          summary={focusMeaning}
          disclaimer="general"
        >
          <div className="space-y-7">
            <section>
              <p className="reading-copy">
                {t(`fengshui.areas.${reading.focusArea}.lowReading`, { defaultValue: focusInfo.lowReading })}
              </p>
              <p className="reading-meta mt-3">
                {t('fengshui.elementLabel', { defaultValue: 'Element' })}: {focusInfo.element} · {t('fengshui.colorLabel', { defaultValue: 'Colour' })}: {focusInfo.color}
              </p>
            </section>

            <section>
              <h3 className="heading-display-md heading-strong text-ink mb-2">
                {t('fengshui.adjustmentsLabel', { defaultValue: 'Try these adjustments' })}
              </h3>
              <ul className="reading-copy list-disc pl-5 space-y-1.5">
                {adjustments.map((adj, i) => (
                  <li key={i}>{adj}</li>
                ))}
              </ul>
              <p className="reading-meta mt-4">
                {t('fengshui.placement', {
                  defaultValue: 'Place these adjustments in the {{dir}} of your room (oriented from the entry door).',
                  dir: focusInfo.direction,
                })}
              </p>
            </section>

            <section className="border-t border-paper-hairline pt-6">
              <EyebrowLabel tone="ink" align="left" className="block">
                {t('fengshui.strongestLabel', { defaultValue: 'Your strongest area' })}
              </EyebrowLabel>
              <h3 className="heading-display-md heading-strong text-ink mt-1 mb-2">{strongName}</h3>
              <p className="reading-copy">
                {t(`fengshui.areas.${reading.strongestArea}.highReading`, { defaultValue: strongInfo.highReading })}
              </p>
            </section>
          </div>
        </ResultSheet>

        {/* ─── Personal Kua: 8 directions ─── */}
        {kua && (
          <Card padding="lg" className="border-cosmic-violet/30">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-cosmic-violet-ink" aria-hidden />
              <h3 className="heading-display-md text-mystic-100">
                {t('fengshui.kuaResultHeading', {
                  defaultValue: 'Your 8 personal directions (Kua {{n}})',
                  n: kua.kua,
                })}
              </h3>
            </div>
            <p className="reading-copy mb-4">
              {t('fengshui.kuaResultIntro', {
                defaultValue:
                  'You are a {{trigram}} ({{element}}) of the {{group}} group. Place your bed, desk, and front door so they face one of your 4 favourable directions. Avoid your 4 unfavourable directions — especially Jue Ming.',
                trigram: kua.trigram, element: kua.element, group: kua.group,
              })}
            </p>

            <h4 className="font-display-eyebrow text-teal mb-2">
              {t('fengshui.kuaFavorable', { defaultValue: 'Favourable directions' })}
            </h4>
            <div className="space-y-2 mb-4">
              {(['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'] as FavorableType[]).map((key) => (
                <div key={key} className="p-3 rounded-control bg-teal/10 border border-teal/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ui font-medium text-teal">{FAVORABLE_LABEL[key]}</span>
                    <Tag tone="teal">
                      {DIRECTION_LABEL[kua.favorable[key]]}
                    </Tag>
                  </div>
                  <p className="reading-copy">{FAVORABLE_MEANING[key]}</p>
                </div>
              ))}
            </div>

            <h4 className="font-display-eyebrow text-coral mb-2">
              {t('fengshui.kuaUnfavorable', { defaultValue: 'Unfavourable directions — avoid' })}
            </h4>
            <div className="space-y-2">
              {(['jue-ming', 'wu-gui', 'liu-sha', 'huo-hai'] as UnfavorableType[]).map((key) => (
                <div key={key} className="p-3 rounded-control bg-coral/10 border border-coral/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ui font-medium text-coral">{UNFAVORABLE_LABEL[key]}</span>
                    <Tag tone="rose">
                      {DIRECTION_LABEL[kua.unfavorable[key]]}
                    </Tag>
                  </div>
                  <p className="reading-copy">{UNFAVORABLE_MEANING[key]}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── Annual flying stars 2026 ─── */}
        <Card padding="lg" className="border-gold/30">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gold" />
            <h3 className="heading-display-md text-mystic-100">
              {t('fengshui.annualHeading', { defaultValue: 'Annual flying stars · {{year}}', year: annual.year })}
            </h3>
          </div>
          <p className="reading-copy mb-4">
            {t('fengshui.annualIntro', {
              defaultValue:
                'Each year, 9 stars rotate through the 9 palaces of your home. The star in each direction this year tells you what to activate and what to avoid. Orient from your front door looking inward.',
            })}
          </p>
          <div className="space-y-2">
            {(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as KuaDirection[]).map((dir) => {
              const r = annual.readings[dir];
              const tint =
                r.nature === 'auspicious' ? 'border-teal/25 bg-teal/10'
                : r.nature === 'inauspicious' ? 'border-coral/25 bg-coral/10'
                : 'border-gold/25 bg-gold/5';
              const dotColor =
                r.nature === 'auspicious' ? 'bg-teal'
                : r.nature === 'inauspicious' ? 'bg-coral'
                : 'bg-gold';
              return (
                <div key={dir} className={`p-3 rounded-control border ${tint}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden />
                    <span className="text-ui font-medium text-mystic-100">{DIRECTION_LABEL[dir]}</span>
                    <span className="text-meta text-mystic-400 tabular-nums">· {t('fengshui.starN', { defaultValue: 'Star {{n}}', n: r.star })}</span>
                  </div>
                  <div className="reading-copy">
                    <p>{r.meaning}</p>
                    <p>{r.remedy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Room-specific guidance ─── */}
        <Section
          title={
            <span className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-cosmic-blue" />
              {t('fengshui.roomsHeading', { defaultValue: 'Room-specific guidance' })}
            </span>
          }
          headingLevel="h3"
          contentClassName="space-y-2"
        >
          {(Object.keys(ROOM_GUIDANCE) as Room[]).map((room) => {
            const g = ROOM_GUIDANCE[room];
            const isOpen = openRoom === room;
            const Icon =
              room === 'bedroom' ? Bed
              : room === 'office' ? Briefcase
              : room === 'kitchen' ? ChefHat
              : room === 'front-door' ? DoorOpen
              : room === 'living-room' ? Sofa
              : Bath;
            return (
              <Disclosure
                key={room}
                open={isOpen}
                onOpenChange={(next) => setOpenRoom(next ? room : null)}
                icon={<Icon className="text-cosmic-blue-ink" />}
                label={g.name}
                contentClassName="space-y-3"
              >
                <div>
                  <p className="font-display-eyebrow text-teal mb-1.5">
                    {t('fengshui.rules', { defaultValue: 'Rules' })}
                  </p>
                  {g.rules.map((r, i) => (
                    <div key={i} className="mb-2">
                      <p className="reading-copy font-medium text-mystic-100 mb-0.5">{r.rule}</p>
                      <p className="reading-copy">{r.why}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-display-eyebrow text-coral mb-1.5">
                    {t('fengshui.avoid', { defaultValue: 'Avoid' })}
                  </p>
                  <ul className="reading-copy space-y-1">
                    {g.avoid.map((a, i) => (
                      <li key={i} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-coral">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </Disclosure>
            );
          })}
        </Section>

        {/* ─── Common problems diagnostic ─── */}
        <Section
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-coral" />
              {t('fengshui.problemsHeading', { defaultValue: 'Common problems checklist' })}
            </span>
          }
          headingLevel="h3"
          description={t('fengshui.problemsIntro', {
            defaultValue:
              'Tap any that apply to your home. Each one comes with a concrete fix. Most people find 3-5 that hit, and fixing the high-severity ones first delivers visible results within weeks.',
          })}
          contentClassName="space-y-2"
        >
          {FENG_SHUI_PROBLEMS.map((p) => {
            const isOpen = openProblems.has(p.id);
            const sevTint =
              p.severity === 'high' ? 'text-coral'
              : p.severity === 'medium' ? 'text-gold'
              : 'text-mystic-500';
            return (
              <Disclosure
                key={p.id}
                open={isOpen}
                onOpenChange={(next) => {
                  const nextSet = new Set(openProblems);
                  if (next) nextSet.add(p.id);
                  else nextSet.delete(p.id);
                  setOpenProblems(nextSet);
                }}
                // Severity goes in `meta`, not `icon`: the icon slot is
                // aria-hidden (correct for a glyph), and putting the severity
                // word there made it inaudible to screen readers.
                meta={
                  <EyebrowLabel className={sevTint}>
                    {p.severity}
                  </EyebrowLabel>
                }
                label={<span className="leading-snug">{p.problem}</span>}
                description={p.location}
                contentClassName="space-y-2"
              >
                <div>
                  <p className="font-display-eyebrow text-mystic-400 mb-0.5">
                    {t('fengshui.why', { defaultValue: 'Why it matters' })}
                  </p>
                  <p className="reading-copy">{p.why}</p>
                </div>
                <div>
                  <p className="font-display-eyebrow text-teal mb-0.5">
                    {t('fengshui.fix', { defaultValue: 'Remedy' })}
                  </p>
                  <p className="reading-copy">{p.remedy}</p>
                </div>
              </Disclosure>
            );
          })}
        </Section>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4" aria-hidden />
            {t('fengshui.share', { defaultValue: 'Share my Bagua' })}
          </Button>
          <Button variant="outline" fullWidth onClick={() => setStage('rate')}>
            {t('fengshui.reRate', { defaultValue: 'Rate the areas again' })}
          </Button>
        </div>
      </Page>
    );
  }

  return null;
}

export default FengShuiPage;
