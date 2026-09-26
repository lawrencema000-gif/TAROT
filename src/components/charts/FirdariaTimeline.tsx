import { useState } from 'react';
import { PLANET_GLYPH, TIME_LORD_COLOR, isPlanet, withAlpha } from '../../lib/chart';
import { Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { localizePlanetName } from '../../i18n/localizeNames';

export interface FirdariaPeriod {
  lord: string;
  start: string;
  end: string;
  years: number;
  subs?: { lord: string; start: string; end: string }[];
}
export interface FirdariaData {
  sect: 'day' | 'night';
  periods: FirdariaPeriod[];
  current: { major: string; sub: string | null } | null;
}

const YEAR_MS = 365.2425 * 86400000;

type Pick = { kind: 'major'; index: number } | { kind: 'sub'; index: number } | null;

/**
 * Horizontal life-timeline of Firdaria time-lord periods (0–90y) with a
 * "you are here" marker and the current major's sub-period strip. Every
 * band is a button: tapping it names the lord and the years in a tag
 * beneath (the old `title` tooltip never fired on touch).
 */
export function FirdariaTimeline({ data, birthDate }: { data: FirdariaData; birthDate: string }) {
  const { t } = useT('app');
  const [pick, setPick] = useState<Pick>(null);
  const birth = Date.parse(`${birthDate}T00:00:00Z`);
  const SPAN_YEARS = 90;
  const spanMs = SPAN_YEARS * YEAR_MS;
  const nowPct = Math.min(100, Math.max(0, ((Date.now() - birth) / spanMs) * 100));

  const seg = (startIso: string, endIso: string) => {
    const s = Math.max(0, (Date.parse(startIso) - birth) / spanMs) * 100;
    const e = Math.min(1, (Date.parse(endIso) - birth) / spanMs) * 100;
    return { left: s, width: Math.max(0, e - s) };
  };
  const ageAt = (iso: string) => Math.round((Date.parse(iso) - birth) / YEAR_MS);

  const lordName = (lord: string) => {
    if (isPlanet(lord)) return localizePlanetName(lord);
    if (lord === 'North Node') return t('chartWheel.nodes.north', { defaultValue: 'North Node' });
    if (lord === 'South Node') return t('chartWheel.nodes.south', { defaultValue: 'South Node' });
    return lord;
  };
  const lordGlyph = (lord: string) => PLANET_GLYPH[lord] ?? (lord.includes('North') ? '☊' : '☋');

  const currentMajor = data.periods.find(
    (p) => data.current && p.lord === data.current.major &&
      Date.now() >= Date.parse(p.start) && Date.now() < Date.parse(p.end),
  );

  const picked = (() => {
    if (!pick) return null;
    if (pick.kind === 'major') {
      const p = data.periods[pick.index];
      return p
        ? t('chartWheel.firdaria.periodDetail', {
            defaultValue: '{{lord}} · age {{from}}–{{to}} · {{startYear}}–{{endYear}}',
            lord: lordName(p.lord), from: ageAt(p.start), to: ageAt(p.end), startYear: p.start.slice(0, 4), endYear: p.end.slice(0, 4),
          })
        : null;
    }
    const s = currentMajor?.subs?.[pick.index];
    return s
      ? t('chartWheel.firdaria.subPeriodDetail', {
          defaultValue: '{{lord}} sub-period · {{start}} to {{end}}',
          lord: lordName(s.lord), start: s.start.slice(0, 7), end: s.end.slice(0, 7),
        })
      : null;
  })();

  return (
    <div className="space-y-4">
      {/* major-period band */}
      <div>
        <div className="relative h-11 bg-mystic-800 rounded-full overflow-hidden">
          {/* The coloured bands are illustration: a two-year period is a
              few pixels wide on a phone. The buttons below them keep the
              band's centre but never shrink under 44px. */}
          {data.periods.map((p, i) => {
            const { left, width } = seg(p.start, p.end);
            if (width <= 0) return null;
            const isPicked = pick?.kind === 'major' && pick.index === i;
            return (
              <div
                key={`band-${i}`}
                aria-hidden
                className="absolute top-0 bottom-0 flex items-center justify-center text-meta text-mystic-950 font-semibold"
                style={{ left: `${left}%`, width: `${width}%`, background: withAlpha(TIME_LORD_COLOR[p.lord] ?? '#7e7e9e', isPicked ? 1 : 0.85) }}
              >
                {width > 4 ? lordGlyph(p.lord) : ''}
              </div>
            );
          })}
          {data.periods.map((p, i) => {
            const { left, width } = seg(p.start, p.end);
            if (width <= 0) return null;
            const isPicked = pick?.kind === 'major' && pick.index === i;
            return (
              <button
                key={`hit-${i}`}
                type="button"
                onClick={() => setPick(isPicked ? null : { kind: 'major', index: i })}
                aria-pressed={isPicked}
                aria-label={t('chartWheel.firdaria.periodDetail', {
                  defaultValue: '{{lord}} · age {{from}}–{{to}} · {{startYear}}–{{endYear}}',
                  lord: lordName(p.lord), from: ageAt(p.start), to: ageAt(p.end), startYear: p.start.slice(0, 4), endYear: p.end.slice(0, 4),
                })}
                className="absolute top-0 bottom-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mystic-100"
                style={{
                  left: `calc(${left}% + ${width / 2}% - max(${width}%, 44px) / 2)`,
                  width: `max(${width}%, 44px)`,
                  // narrower periods sit on top so a wide neighbour cannot swallow their hit area
                  zIndex: Math.round(100 - Math.min(width, 99)),
                }}
              />
            );
          })}
          <div className="absolute top-0 bottom-0 w-0.5 bg-mystic-100 pointer-events-none" style={{ left: `${nowPct}%` }} aria-hidden />
        </div>
        <div className="flex justify-between text-caption text-mystic-500 mt-1" aria-hidden>
          <span>{t('chartWheel.firdaria.birth', { defaultValue: 'Birth' })}</span>
          <span>30</span>
          <span>60</span>
          <span>{t('chartWheel.firdaria.years', { defaultValue: '{{n}} yrs', n: 90 })}</span>
        </div>
      </div>

      {/* current major's sub-period strip */}
      {currentMajor?.subs && (
        <div>
          <div className="text-meta text-mystic-400 mb-1.5">
            {t('chartWheel.firdaria.insidePeriod', {
              defaultValue: 'Inside your {{lord}} period ({{start}}–{{end}})',
              lord: lordName(currentMajor.lord),
              start: currentMajor.start.slice(0, 4),
              end: currentMajor.end.slice(0, 4),
            })}
          </div>
          <div className="relative h-11 bg-mystic-800 rounded-full overflow-hidden flex">
            {currentMajor.subs.map((s, i) => {
              const isNow = Date.now() >= Date.parse(s.start) && Date.now() < Date.parse(s.end);
              const isPicked = pick?.kind === 'sub' && pick.index === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPick(isPicked ? null : { kind: 'sub', index: i })}
                  aria-pressed={isPicked}
                  aria-label={t('chartWheel.firdaria.subPeriodDetail', {
                    defaultValue: '{{lord}} sub-period · {{start}} to {{end}}',
                    lord: lordName(s.lord), start: s.start.slice(0, 7), end: s.end.slice(0, 7),
                  })}
                  className="flex-1 flex items-center justify-center text-meta font-semibold text-mystic-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mystic-100"
                  style={{ background: withAlpha(TIME_LORD_COLOR[s.lord] ?? '#7e7e9e', isNow || isPicked ? 1 : 0.55) }}
                >
                  <span aria-hidden>{lordGlyph(s.lord)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* what was tapped */}
      <div className="min-h-[28px] flex justify-center" aria-live="polite">
        {picked ? (
          <Tag tone="gold" size="md">{picked}</Tag>
        ) : (
          <span className="text-caption text-mystic-500">
            {t('chartWheel.firdaria.tapPrompt', { defaultValue: 'Tap a period to see its years' })}
          </span>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(TIME_LORD_COLOR).map(([lord, color]) => (
          <span key={lord} className="inline-flex items-center gap-1 text-caption text-mystic-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} aria-hidden />
            {lordName(lord)}
          </span>
        ))}
      </div>
    </div>
  );
}
