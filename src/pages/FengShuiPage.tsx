import { useState, useMemo, useEffect, useRef } from 'react';
import { Home, Compass, Star, Bed, Briefcase, ChefHat, DoorOpen, Sofa, Bath, AlertTriangle, Wind, Target, Share2 } from 'lucide-react';
import { Card, Button, Chip, Input, toast, Page, PageHeader, Section, Disclosure, Tag, EyebrowLabel, ResultSheet } from '../components/ui';
import { useT } from '../i18n/useT';
import { useContentOverlay, ct, ctList } from '../i18n/contentOverlay';
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
import { scrollBehavior } from '../utils/motion';

const ELEMENT_EN: Record<string, string> = { Water: 'Water', Earth: 'Earth', Wood: 'Wood', Metal: 'Metal', Fire: 'Fire' };
const TRIGRAM_EN: Record<string, string> = { Kan: 'Kan', Kun: 'Kun', Zhen: 'Zhen', Xun: 'Xun', Qian: 'Qian', Dui: 'Dui', Gen: 'Gen', Li: 'Li' };
const GROUP_EN: Record<string, string> = { East: 'East', West: 'West' };
const SEVERITY_EN: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

type Stage = 'rate' | 'result';

export function FengShuiPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  // Bagua, Kua, annual-star, room and problem prose from the `fengshui`
  // content module (keyed by area / direction type / star / room / problem
  // id); short labels (directions, elements, trigrams…) are app keys.
  const { overlay } = useContentOverlay('fengshui');
  const baguaText = (area: BaguaArea, field: 'meaning' | 'lowReading' | 'highReading' | 'element' | 'color' | 'direction') =>
    ct(overlay, `bagua.${area}.${field}`, BAGUA_AREAS[area][field]);
  const baguaAdjustments = (area: BaguaArea) => ctList(overlay, `bagua.${area}.adjustments`, BAGUA_AREAS[area].adjustments);
  const dirLabel = (d: KuaDirection) => t(`fengshui.directions.${d}`, { defaultValue: DIRECTION_LABEL[d] }) as string;
  const elementLabel = (e: string) => t(`fengshui.elements.${e}`, { defaultValue: ELEMENT_EN[e] ?? e }) as string;
  const trigramLabel = (g: string) => t(`fengshui.trigrams.${g}`, { defaultValue: TRIGRAM_EN[g] ?? g }) as string;
  const groupLabel = (g: string) => t(`fengshui.groups.${g}`, { defaultValue: GROUP_EN[g] ?? g }) as string;
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

  // Each stage opens at its top. Reveal sits at the foot of the rating
  // form, and the result kept that scroll: it opened on the annual flying
  // stars, two screens below the map and the reading (pre-release pass).
  // "Rate the areas again" is at the foot of the result, so the form
  // comes back at its top too. The stage's own top, not the window's:
  // on Readings → More systems the page sits under the screen's title and
  // tabs (scroll-mt-4 keeps the title off the screen's edge). A smooth
  // scroll unless the reader asked for reduced motion.
  // Keyed on a change of stage, not on the first run, so StrictMode's
  // second mount does not scroll.
  const stageTop = useRef<HTMLDivElement>(null);
  const shownStage = useRef(stage);
  useEffect(() => {
    if (shownStage.current === stage) return;
    shownStage.current = stage;
    const top = stageTop.current;
    if (top && typeof top.scrollIntoView === 'function') top.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }, [stage]);

  const compute = () => {
    setReading(computeBaguaReading(scores));
    setStage('result');
  };

  if (stage === 'rate') {
    return (
      <Page spacing="md" ref={stageTop} className="scroll-mt-4">
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
                    {baguaText(area, 'meaning')}
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
          {/* One field per row on a phone: half of a 390px card left the
              select's option ~105px beside the chevron, so 選択またはスキップ
              read 選択またはスキッ (P7 F85), and en/ko filled it exactly.
              Full width gives every language room. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  n: kua.kua, trigram: trigramLabel(kua.trigram), group: groupLabel(kua.group),
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
    // Every area tied at either end is named, in map order, and an even
    // map names none (p9 Q24): nine untouched 3s used to call Wealth
    // depleted and Helpers thriving, by sort order alone.
    const { focusAreas, strongestAreas, balanced } = reading;
    const areaName = (area: BaguaArea) => t(`fengshui.areas.${area}.name`, { defaultValue: BAGUA_AREAS[area].name }) as string;
    const listSep = t('fengshui.listSeparator', { defaultValue: ', ' }) as string;
    const focusNames = focusAreas.map(areaName).join(listSep);
    const loneFocus = focusAreas.length === 1 ? focusAreas[0] : null;
    const balancedTitle = t('fengshui.balanced.title', { defaultValue: 'Every area feels the same' }) as string;
    const balancedEyebrow = t('fengshui.balanced.eyebrow', { defaultValue: 'A balanced map' }) as string;

    /** One focus area's remedy: what its low rating means, what to place, and where. */
    const focusRemedy = (area: BaguaArea, Heading: 'h3' | 'h4') => (
      <>
        <section>
          <p className="reading-copy">
            {baguaText(area, 'lowReading')}
          </p>
          <p className="reading-meta mt-3">
            {t('fengshui.elementLabel', { defaultValue: 'Element' })}: {baguaText(area, 'element')} · {t('fengshui.colorLabel', { defaultValue: 'Colour' })}: {baguaText(area, 'color')}
          </p>
        </section>

        <section>
          <Heading className="heading-display-md heading-strong text-ink mb-2">
            {t('fengshui.adjustmentsLabel', { defaultValue: 'Try these adjustments' })}
          </Heading>
          <ul className="reading-copy list-disc pl-5 space-y-1.5">
            {baguaAdjustments(area).map((adj, i) => (
              <li key={i}>{adj}</li>
            ))}
          </ul>
          <p className="reading-meta mt-4">
            {/* `direction` is a bare position ('back-left', 左奥); the
                sentence names the room and the door (P7 F28/F68). */}
            {t('fengshui.placement', {
              defaultValue: 'Place these adjustments in the {{dir}} area of your room, as seen from the entry door.',
              dir: baguaText(area, 'direction'),
            })}
          </p>
        </section>
      </>
    );

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: balanced ? balancedTitle : focusNames,
          subtitle: balanced ? balancedEyebrow : t('fengshui.shareSubtitle', { defaultValue: 'Needs attention' }) as string,
          // One area's meaning and first adjustment; several areas are named in the title.
          tagline: loneFocus ? baguaText(loneFocus, 'meaning') : '',
          affirmation: loneFocus ? (baguaAdjustments(loneFocus)[0] ?? '') : '',
          brand: t('share.brand.fengShui', { defaultValue: 'Feng Shui Bagua' }) as string,
        });
        const out = await shareOrDownload(
          blob,
          'arcana-fengshui.png',
          t('fengshui.shareText', { defaultValue: 'Feng Shui reading: {{area}}', area: balanced ? balancedTitle : focusNames }) as string,
        );
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <Page spacing="sm" ref={stageTop} className="scroll-mt-4">
        <PageHeader
          icon={<Home />}
          title={t('fengshui.title', { defaultValue: 'Feng Shui Bagua' })}
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
              const isFocus = focusAreas.includes(area);
              const isStrong = strongestAreas.includes(area);
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

        {/* The reading, on paper: the areas that want attention, what to do
            about each, and the areas already carrying you. An even map
            claims neither (p9 Q24). */}
        {balanced ? (
          <ResultSheet
            headingLevel="h2"
            glyph={<Target />}
            eyebrow={balancedEyebrow}
            title={balancedTitle}
            summary={t('fengshui.balanced.body', {
              n: reading.scores[BAGUA_AREA_ORDER[0]],
              defaultValue:
                'You rated all nine areas {{n}} out of 5, so no area stands out as needing attention or as your strongest. If one feels different, rate the areas again. The room guidance and the checklist below work for any home.',
            })}
            disclaimer="general"
          />
        ) : (
          <ResultSheet
            headingLevel="h2"
            glyph={<Target />}
            eyebrow={
              loneFocus
                ? t('fengshui.focusLabel', { defaultValue: 'Area needing attention' })
                : t('fengshui.focusLabelMany', { defaultValue: 'Areas needing attention' })
            }
            title={focusNames}
            summaryHeading={loneFocus ? t('fengshui.whatItGoverns', { defaultValue: 'What this area governs' }) : undefined}
            summary={loneFocus ? baguaText(loneFocus, 'meaning') : undefined}
            disclaimer="general"
          >
            <div className="space-y-7">
              {loneFocus
                ? focusRemedy(loneFocus, 'h3')
                : focusAreas.map((area) => (
                    // Several areas tie at the bottom: each is named, with
                    // what it governs, and gets its own remedy.
                    <section key={area} className="space-y-4">
                      <h3 className="heading-display-md heading-strong text-ink">{areaName(area)}</h3>
                      <p className="reading-meta">{baguaText(area, 'meaning')}</p>
                      {focusRemedy(area, 'h4')}
                    </section>
                  ))}

              <section className="border-t border-paper-hairline pt-6">
                <EyebrowLabel tone="ink" align="left" className="block">
                  {strongestAreas.length > 1
                    ? t('fengshui.strongestLabelMany', { defaultValue: 'Your strongest areas' })
                    : t('fengshui.strongestLabel', { defaultValue: 'Your strongest area' })}
                </EyebrowLabel>
                {strongestAreas.map((area, i) => (
                  <div key={area} className={i > 0 ? 'mt-6' : undefined}>
                    <h3 className="heading-display-md heading-strong text-ink mt-1 mb-2">{areaName(area)}</h3>
                    <p className="reading-copy">{baguaText(area, 'highReading')}</p>
                  </div>
                ))}
              </section>
            </div>
          </ResultSheet>
        )}

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
                trigram: trigramLabel(kua.trigram), element: elementLabel(kua.element), group: groupLabel(kua.group),
              })}
            </p>

            <h4 className="font-display-eyebrow text-teal mb-2">
              {t('fengshui.kuaFavorable', { defaultValue: 'Favourable directions' })}
            </h4>
            <div className="space-y-2 mb-4">
              {(['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'] as FavorableType[]).map((key) => (
                <div key={key} className="p-3 rounded-control bg-teal/10 border border-teal/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ui font-medium text-teal">{ct(overlay, `kua.favorable.${key}.label`, FAVORABLE_LABEL[key])}</span>
                    <Tag tone="teal">
                      {dirLabel(kua.favorable[key])}
                    </Tag>
                  </div>
                  <p className="reading-copy">{ct(overlay, `kua.favorable.${key}.meaning`, FAVORABLE_MEANING[key])}</p>
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
                    <span className="text-ui font-medium text-coral">{ct(overlay, `kua.unfavorable.${key}.label`, UNFAVORABLE_LABEL[key])}</span>
                    <Tag tone="rose">
                      {dirLabel(kua.unfavorable[key])}
                    </Tag>
                  </div>
                  <p className="reading-copy">{ct(overlay, `kua.unfavorable.${key}.meaning`, UNFAVORABLE_MEANING[key])}</p>
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
                    <span className="text-ui font-medium text-mystic-100">{dirLabel(dir)}</span>
                    <span className="text-meta text-mystic-400 tabular-nums">· {t('fengshui.starN', { defaultValue: 'Star {{n}}', n: r.star })}</span>
                  </div>
                  <div className="reading-copy">
                    <p>{ct(overlay, `annual.stars.${r.star}.meaning`, r.meaning)}</p>
                    <p>{ct(overlay, `annual.stars.${r.star}.remedy`, r.remedy)}</p>
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
                label={ct(overlay, `rooms.${room}.name`, g.name)}
                contentClassName="space-y-3"
              >
                <div>
                  <p className="font-display-eyebrow text-teal mb-1.5">
                    {t('fengshui.rules', { defaultValue: 'Rules' })}
                  </p>
                  {g.rules.map((r, i) => (
                    <div key={i} className="mb-2">
                      <p className="reading-copy font-medium text-mystic-100 mb-0.5">{ct(overlay, `rooms.${room}.rules.${i}.rule`, r.rule)}</p>
                      <p className="reading-copy">{ct(overlay, `rooms.${room}.rules.${i}.why`, r.why)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-display-eyebrow text-coral mb-1.5">
                    {t('fengshui.avoid', { defaultValue: 'Avoid' })}
                  </p>
                  <ul className="reading-copy space-y-1">
                    {ctList(overlay, `rooms.${room}.avoid`, g.avoid).map((a, i) => (
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
                    {t(`fengshui.severity.${p.severity}`, { defaultValue: SEVERITY_EN[p.severity] ?? p.severity })}
                  </EyebrowLabel>
                }
                label={<span className="leading-snug">{ct(overlay, `problems.${p.id}.problem`, p.problem)}</span>}
                description={t(`fengshui.locations.${slugOf(p.location)}`, { defaultValue: p.location })}
                contentClassName="space-y-2"
              >
                <div>
                  <p className="font-display-eyebrow text-mystic-400 mb-0.5">
                    {t('fengshui.why', { defaultValue: 'Why it matters' })}
                  </p>
                  <p className="reading-copy">{ct(overlay, `problems.${p.id}.why`, p.why)}</p>
                </div>
                <div>
                  <p className="font-display-eyebrow text-teal mb-0.5">
                    {t('fengshui.fix', { defaultValue: 'Remedy' })}
                  </p>
                  <p className="reading-copy">{ct(overlay, `problems.${p.id}.remedy`, p.remedy)}</p>
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
