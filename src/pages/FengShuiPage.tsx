import { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Home, Compass, Star, Bed, Briefcase, ChefHat, DoorOpen, Sofa, Bath, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
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

type Stage = 'rate' | 'result';

export function FengShuiPage() {
  const { t } = useT('app');
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

  const kua: KuaProfile | null = useMemo(() => {
    const yr = parseInt(birthYear, 10);
    if (!gender || !Number.isFinite(yr)) return null;
    return computeKua(yr, gender);
  }, [birthYear, gender]);

  const annual = useMemo(() => getAnnualReading(2026), []);

  const compute = () => {
    setReading(computeBaguaReading(scores));
    setStage('result');
  };

  if (stage === 'rate') {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('fengshui.title', { defaultValue: 'Feng Shui Bagua' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('fengshui.intro', {
              defaultValue:
                'The Bagua map divides life into nine areas. Rate how each area of YOUR life feels right now on a 1-5 scale. We\'ll surface the area most wanting attention and the Feng Shui adjustments that nourish it.',
            })}
          </p>

          <div className="space-y-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              return (
                <div key={area} className="p-3 bg-mystic-800/30 rounded-xl">
                  <p className="text-sm text-mystic-200 font-medium">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name })}
                  </p>
                  <p className="text-xs text-mystic-500 mb-2">
                    {t(`fengshui.areas.${area}.meaning`, { defaultValue: info.meaning })}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setScore(area, v)}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                          scores[area] === v
                            ? 'bg-gold/20 border-gold/50 text-gold'
                            : 'bg-mystic-900/50 border-mystic-700/30 text-mystic-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-mystic-500 mt-3 italic">
            {t('fengshui.scale', { defaultValue: '1 = severely depleted · 3 = okay · 5 = thriving' })}
          </p>
        </Card>

        {/* Personal Kua inputs — optional, but unlock 8-directions section. */}
        <Card padding="lg" className="bg-gradient-to-br from-cosmic-violet/5 to-mystic-900 border-cosmic-violet/20">
          <h3 className="font-medium text-cosmic-violet mb-2 flex items-center gap-2">
            <Compass className="w-4 h-4" />
            {t('fengshui.kuaHeading', { defaultValue: 'Your personal Kua (optional)' })}
          </h3>
          <p className="text-xs text-mystic-400 mb-3 leading-relaxed">
            {t('fengshui.kuaIntro', {
              defaultValue:
                'Add your birth year + gender to compute your personal Kua number — the basis of Eight Mansions feng shui. We\'ll show your 4 favourable + 4 unfavourable directions for placing the bed, desk, and front door.',
            })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-mystic-500 mb-1">
                {t('fengshui.birthYearLabel', { defaultValue: 'Birth year' })}
              </label>
              <Input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1990"
                min={1900}
                max={2100}
              />
            </div>
            <div>
              <label className="block text-xs text-mystic-500 mb-1">
                {t('fengshui.genderLabel', { defaultValue: 'Birth gender' })}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('fengshui.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                <option value="male">{t('fengshui.male', { defaultValue: 'Male' })}</option>
                <option value="female">{t('fengshui.female', { defaultValue: 'Female' })}</option>
              </select>
            </div>
          </div>
          {kua && (
            <div className="mt-3 p-3 rounded-xl bg-mystic-900/40 border border-cosmic-violet/30">
              <p className="text-xs text-mystic-400">
                {t('fengshui.kuaPreview', {
                  defaultValue: 'Kua {{n}} · {{trigram}} · {{group}} group',
                  n: kua.kua, trigram: kua.trigram, group: kua.group,
                })}
              </p>
            </div>
          )}
        </Card>

        <Button variant="primary" fullWidth onClick={compute} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('fengshui.reveal', { defaultValue: 'Reveal my Bagua' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && reading) {
    const focusInfo = BAGUA_AREAS[reading.focusArea];
    const strongInfo = BAGUA_AREAS[reading.strongestArea];
    const focusName = t(`fengshui.areas.${reading.focusArea}.name`, { defaultValue: focusInfo.name }) as string;
    const strongName = t(`fengshui.areas.${reading.strongestArea}.name`, { defaultValue: strongInfo.name }) as string;
    const focusMeaning = t(`fengshui.areas.${reading.focusArea}.meaning`, { defaultValue: focusInfo.meaning }) as string;
    const adjustments = t(`fengshui.areas.${reading.focusArea}.adjustments`, {
      returnObjects: true,
      defaultValue: focusInfo.adjustments,
    }) as string[];

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: focusName,
          subtitle: t('fengshui.shareSubtitle', { defaultValue: 'Needs attention' }) as string,
          tagline: focusMeaning,
          affirmation: adjustments[0] ?? '',
          brand: 'Arcana · Feng Shui Bagua',
        });
        const out = await shareOrDownload(blob, 'arcana-fengshui.png', `Feng Shui reading: ${focusName}`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button onClick={() => setStage('rate')} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('fengshui.backToRate', { defaultValue: 'Re-rate' })}
        </button>

        {/* 3x3 Bagua grid */}
        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">
            {t('fengshui.mapLabel', { defaultValue: 'Your Bagua map' })}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              const score = reading.scores[area];
              const isFocus = area === reading.focusArea;
              const isStrong = area === reading.strongestArea;
              return (
                <div
                  key={area}
                  className={`aspect-square p-2 rounded-lg border flex flex-col items-center justify-center text-center ${
                    isFocus ? 'border-pink-400/40 bg-pink-400/5'
                    : isStrong ? 'border-emerald-400/40 bg-emerald-400/5'
                    : 'border-mystic-700/30 bg-mystic-800/30'
                  }`}
                >
                  <span className="text-[10px] text-mystic-500 leading-tight">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name }).split(' / ')[0]}
                  </span>
                  <span className={`text-xl font-display mt-1 ${
                    isFocus ? 'text-pink-400'
                    : isStrong ? 'text-emerald-400'
                    : score >= 4 ? 'text-gold' : 'text-mystic-400'
                  }`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-mystic-500 text-center">
            {t('fengshui.overallScore', { defaultValue: 'Overall: {{n}} / 5', n: reading.overall.toFixed(1) })}
          </p>
        </Card>

        <Card padding="lg" className="border-pink-400/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h3 className="font-medium text-pink-400">
              {t('fengshui.focusLabel', { defaultValue: 'Area needing attention' })}
            </h3>
          </div>
          <h2 className="font-display text-2xl text-mystic-100 mb-2">{focusName}</h2>
          <p className="text-mystic-300 text-sm leading-relaxed mb-3">{focusMeaning}</p>
          <p className="text-mystic-200 text-sm leading-relaxed mt-3 pt-3 border-t border-pink-400/15">
            {t(`fengshui.areas.${reading.focusArea}.lowReading`, { defaultValue: focusInfo.lowReading })}
          </p>
          <p className="text-xs text-mystic-500 italic mt-3">
            {t('fengshui.elementLabel', { defaultValue: 'Element' })}: {focusInfo.element} · {t('fengshui.colorLabel', { defaultValue: 'Colour' })}: {focusInfo.color}
          </p>
        </Card>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3">
            {t('fengshui.adjustmentsLabel', { defaultValue: 'Try these adjustments' })}
          </h3>
          <ul className="space-y-2">
            {adjustments.map((adj, i) => (
              <li key={i} className="text-mystic-200 text-sm leading-relaxed">• {adj}</li>
            ))}
          </ul>
          <p className="text-xs text-mystic-500 mt-4 italic">
            {t('fengshui.placement', {
              defaultValue: 'Place these adjustments in the {{dir}} of your room (oriented from the entry door).',
              dir: focusInfo.direction,
            })}
          </p>
        </Card>

        <Card padding="lg" className="border-emerald-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="font-medium text-emerald-400">
              {t('fengshui.strongestLabel', { defaultValue: 'Your strongest area' })}
            </h3>
          </div>
          <h2 className="font-display text-2xl text-mystic-100 mb-2">{strongName}</h2>
          <p className="text-mystic-300 text-sm leading-relaxed">
            {t(`fengshui.areas.${reading.strongestArea}.highReading`, { defaultValue: strongInfo.highReading })}
          </p>
        </Card>

        {/* ─── Personal Kua: 8 directions ─── */}
        {kua && (
          <Card padding="lg" className="border-cosmic-violet/30">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-cosmic-violet" />
              <h3 className="font-medium text-cosmic-violet">
                {t('fengshui.kuaResultHeading', {
                  defaultValue: 'Your 8 personal directions (Kua {{n}})',
                  n: kua.kua,
                })}
              </h3>
            </div>
            <p className="text-xs text-mystic-400 mb-4 leading-relaxed">
              {t('fengshui.kuaResultIntro', {
                defaultValue:
                  'You are a {{trigram}} ({{element}}) of the {{group}} group. Place your bed, desk, and front door so they face one of your 4 favourable directions. Avoid your 4 unfavourable directions — especially Jue Ming.',
                trigram: kua.trigram, element: kua.element, group: kua.group,
              })}
            </p>

            <h4 className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wider">
              {t('fengshui.kuaFavorable', { defaultValue: 'Favourable directions' })}
            </h4>
            <div className="space-y-2 mb-4">
              {(['sheng-qi', 'tian-yi', 'yan-nian', 'fu-wei'] as FavorableType[]).map((key) => (
                <div key={key} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-400/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-emerald-400">{FAVORABLE_LABEL[key]}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                      {DIRECTION_LABEL[kua.favorable[key]]}
                    </span>
                  </div>
                  <p className="text-xs text-mystic-300 leading-relaxed">{FAVORABLE_MEANING[key]}</p>
                </div>
              ))}
            </div>

            <h4 className="text-xs font-medium text-pink-400 mb-2 uppercase tracking-wider">
              {t('fengshui.kuaUnfavorable', { defaultValue: 'Unfavourable directions — avoid' })}
            </h4>
            <div className="space-y-2">
              {(['jue-ming', 'wu-gui', 'liu-sha', 'huo-hai'] as UnfavorableType[]).map((key) => (
                <div key={key} className="p-3 rounded-xl bg-pink-500/5 border border-pink-400/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-pink-400">{UNFAVORABLE_LABEL[key]}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300">
                      {DIRECTION_LABEL[kua.unfavorable[key]]}
                    </span>
                  </div>
                  <p className="text-xs text-mystic-300 leading-relaxed">{UNFAVORABLE_MEANING[key]}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── Annual flying stars 2026 ─── */}
        <Card padding="lg" className="border-gold/30">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gold" />
            <h3 className="font-medium text-gold">
              {t('fengshui.annualHeading', { defaultValue: 'Annual flying stars · {{year}}', year: annual.year })}
            </h3>
          </div>
          <p className="text-xs text-mystic-400 mb-4 leading-relaxed">
            {t('fengshui.annualIntro', {
              defaultValue:
                'Each year, 9 stars rotate through the 9 palaces of your home. The star in each direction this year tells you what to activate and what to avoid. Orient from your front door looking inward.',
            })}
          </p>
          <div className="space-y-2">
            {(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as KuaDirection[]).map((dir) => {
              const r = annual.readings[dir];
              const tint =
                r.nature === 'auspicious' ? 'border-emerald-400/25 bg-emerald-500/5'
                : r.nature === 'inauspicious' ? 'border-pink-400/25 bg-pink-500/5'
                : 'border-gold/25 bg-gold/5';
              const dotColor =
                r.nature === 'auspicious' ? 'bg-emerald-400'
                : r.nature === 'inauspicious' ? 'bg-pink-400'
                : 'bg-gold';
              return (
                <div key={dir} className={`p-3 rounded-xl border ${tint}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-sm font-medium text-mystic-100">{DIRECTION_LABEL[dir]}</span>
                    <span className="text-xs text-mystic-500">· Star {r.star}</span>
                  </div>
                  <p className="text-xs text-mystic-300 leading-relaxed mb-1.5">{r.meaning}</p>
                  <p className="text-[11px] text-mystic-400 italic">{r.remedy}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Room-specific guidance ─── */}
        <Card padding="lg" className="border-cosmic-blue/30">
          <h3 className="font-medium text-cosmic-blue mb-3 flex items-center gap-2">
            <Bed className="w-4 h-4" />
            {t('fengshui.roomsHeading', { defaultValue: 'Room-specific guidance' })}
          </h3>
          <div className="space-y-2">
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
                <div key={room} className="rounded-xl bg-mystic-800/40 border border-mystic-700/30 overflow-hidden">
                  <button
                    onClick={() => setOpenRoom(isOpen ? null : room)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-cosmic-blue" />
                      <span className="text-sm font-medium text-mystic-200">{g.name}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-mystic-500" /> : <ChevronDown className="w-4 h-4 text-mystic-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-3 animate-fade-in">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1.5">
                          {t('fengshui.rules', { defaultValue: 'Rules' })}
                        </p>
                        {g.rules.map((r, i) => (
                          <div key={i} className="mb-2">
                            <p className="text-xs font-medium text-mystic-100 mb-0.5">{r.rule}</p>
                            <p className="text-xs text-mystic-400 leading-relaxed">{r.why}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-1.5">
                          {t('fengshui.avoid', { defaultValue: 'Avoid' })}
                        </p>
                        <ul className="space-y-1">
                          {g.avoid.map((a, i) => (
                            <li key={i} className="text-xs text-mystic-300 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Common problems diagnostic ─── */}
        <Card padding="lg" className="border-pink-400/20">
          <h3 className="font-medium text-pink-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('fengshui.problemsHeading', { defaultValue: 'Common problems checklist' })}
          </h3>
          <p className="text-xs text-mystic-400 mb-4 leading-relaxed">
            {t('fengshui.problemsIntro', {
              defaultValue:
                'Tap any that apply to your home. Each one comes with a concrete fix. Most people find 3-5 that hit, and fixing the high-severity ones first delivers visible results within weeks.',
            })}
          </p>
          <div className="space-y-2">
            {FENG_SHUI_PROBLEMS.map((p) => {
              const isOpen = openProblems.has(p.id);
              const sevTint =
                p.severity === 'high' ? 'text-pink-400'
                : p.severity === 'medium' ? 'text-gold'
                : 'text-mystic-500';
              return (
                <div key={p.id} className="rounded-xl bg-mystic-800/40 border border-mystic-700/30 overflow-hidden">
                  <button
                    onClick={() => {
                      const next = new Set(openProblems);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setOpenProblems(next);
                    }}
                    className="w-full flex items-start gap-3 p-3 text-left"
                  >
                    <span className={`text-[10px] uppercase font-medium tracking-wider ${sevTint} flex-shrink-0 pt-0.5`}>
                      {p.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-mystic-100 leading-snug">{p.problem}</p>
                      <p className="text-[10px] text-mystic-500 mt-0.5">{p.location}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-mystic-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-mystic-500 flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 animate-fade-in">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-0.5">
                          {t('fengshui.why', { defaultValue: 'Why it matters' })}
                        </p>
                        <p className="text-xs text-mystic-300 leading-relaxed">{p.why}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-0.5">
                          {t('fengshui.fix', { defaultValue: 'Remedy' })}
                        </p>
                        <p className="text-xs text-mystic-200 leading-relaxed">{p.remedy}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={() => setStage('rate')} className="min-h-[48px]">
            {t('fengshui.reRate', { defaultValue: 'Re-rate' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default FengShuiPage;
