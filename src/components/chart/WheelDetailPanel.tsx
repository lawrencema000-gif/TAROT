import type { ReactNode } from 'react';
import type { Aspect, Planet, PlanetPlacement, ZodiacSign } from '../../types/astrology';
import { PlanetGlyph, ZodiacGlyph } from '../icons';
import { Button, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';
import { localizeAspectName, localizePlanetName, localizeSignName } from '../../i18n/localizeNames';
import { houseTheme } from './houseThemes';

export interface OverlayPlanet {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  longitude?: number;
}

export type WheelSelection =
  | { kind: 'planet'; placement: PlanetPlacement }
  | { kind: 'transit'; placement: OverlayPlanet; label?: string }
  | { kind: 'house'; index: number; planets: PlanetPlacement[] }
  | { kind: 'aspect'; aspect: Aspect }
  | null;

interface Props {
  selection: WheelSelection;
  onOpenPlanet?: (placement: PlanetPlacement) => void;
  onOpenAspect?: (aspect: Aspect) => void;
}

/**
 * What the tap meant, in words. Announced politely so a keyboard or screen-
 * reader user hears the same thing a sighted one reads. Every string here is
 * localised: planet, sign and aspect names through localizeNames, house
 * themes through keys, the rest through t().
 */
export function WheelDetailPanel({ selection, onOpenPlanet, onOpenAspect }: Props) {
  const { t } = useT('app');

  return (
    <div className="min-h-[92px]" aria-live="polite" aria-atomic="true">
      {!selection && (
        <p className="text-meta text-mystic-500 italic text-center pt-2">
          {t('chartWheel.tapPrompt', { defaultValue: 'Tap a planet, house, or aspect line.' })}
        </p>
      )}

      {selection?.kind === 'planet' && (
        <PanelCard key={`planet-${selection.placement.planet}`} eyebrow={t('chartWheel.planetLabel', { defaultValue: 'Planet' })}>
          <p className="text-ui font-medium text-mystic-100 flex items-center gap-1.5 flex-wrap">
            <PlanetGlyph planet={selection.placement.planet} size={18} className="text-gold shrink-0" />
            {t('horoscope.birthChartView.planetInSign', {
              planet: localizePlanetName(selection.placement.planet),
              sign: localizeSignName(selection.placement.sign),
            })}
            <ZodiacGlyph sign={selection.placement.sign} size={16} className="text-mystic-300 shrink-0" />
          </p>
          <p className="text-meta text-mystic-400 mt-0.5">
            {selection.placement.degree.toFixed(1)}°
            {selection.placement.retrograde ? ` · ${t('chartWheel.retrograde', { defaultValue: 'Retrograde' })}` : ''}
            {selection.placement.house
              ? ` · ${t('chartWheel.houseLabel', { defaultValue: 'House {{n}}', n: selection.placement.house })} · ${houseTheme(t, selection.placement.house)}`
              : ''}
          </p>
          {onOpenPlanet && (
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => onOpenPlanet(selection.placement)}>
              {t('chartWheel.readMore', { defaultValue: 'Read the full interpretation' })}
            </Button>
          )}
        </PanelCard>
      )}

      {selection?.kind === 'transit' && (
        <PanelCard
          key={`transit-${selection.placement.planet}`}
          eyebrow={`${t('chartWheel.transitLabel', { defaultValue: 'Transit' })}${selection.label ? ` · ${selection.label}` : ''}`}
          tone="blue"
        >
          <p className="text-ui font-medium text-mystic-100 flex items-center gap-1.5 flex-wrap">
            <PlanetGlyph planet={selection.placement.planet} size={18} className="text-cosmic-blue-ink shrink-0" />
            {t('horoscope.birthChartView.planetInSign', {
              planet: localizePlanetName(selection.placement.planet),
              sign: localizeSignName(selection.placement.sign),
            })}
            <ZodiacGlyph sign={selection.placement.sign} size={16} className="text-mystic-300 shrink-0" />
          </p>
          <p className="text-meta text-mystic-400 mt-0.5">{selection.placement.degree.toFixed(1)}°</p>
        </PanelCard>
      )}

      {selection?.kind === 'house' && (
        <PanelCard key={`house-${selection.index}`} eyebrow={t('chartWheel.houseLabel', { defaultValue: 'House {{n}}', n: selection.index })} tone="violet">
          <p className="text-ui font-medium text-mystic-100">{houseTheme(t, selection.index)}</p>
          <p className="text-meta text-mystic-400 mt-0.5">
            {selection.planets.length > 0
              ? t('chartWheel.planetsInHouse', {
                  defaultValue: 'Planets here: {{list}}',
                  list: selection.planets.map((p) => localizePlanetName(p.planet)).join(', '),
                })
              : t('chartWheel.emptyHouse', { defaultValue: 'No planets in this house' })}
          </p>
        </PanelCard>
      )}

      {selection?.kind === 'aspect' && (
        <PanelCard key={`aspect-${selection.aspect.planet1}-${selection.aspect.planet2}`} eyebrow={t('chartWheel.aspectLabel', { defaultValue: 'Aspect' })}>
          <p className="text-ui font-medium text-mystic-100 flex items-center gap-2 flex-wrap">
            <PlanetGlyph planet={selection.aspect.planet1} size={18} className="text-gold shrink-0" />
            <span>
              {localizePlanetName(selection.aspect.planet1)} {localizeAspectName(selection.aspect.type)} {localizePlanetName(selection.aspect.planet2)}
            </span>
            <PlanetGlyph planet={selection.aspect.planet2} size={18} className="text-gold shrink-0" />
          </p>
          <p className="text-meta text-mystic-400 mt-0.5">
            {t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: selection.aspect.orb.toFixed(1) })}
            {' · '}
            {selection.aspect.applying
              ? t('horoscope.birthChartView.applying')
              : t('horoscope.birthChartView.separating')}
          </p>
          {onOpenAspect && (
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => onOpenAspect(selection.aspect)}>
              {t('chartWheel.readMore', { defaultValue: 'Read the full interpretation' })}
            </Button>
          )}
        </PanelCard>
      )}
    </div>
  );
}

const TONE_RULE: Record<'gold' | 'blue' | 'violet', string> = {
  gold: 'border-l-gold/60',
  blue: 'border-l-cosmic-blue/70',
  violet: 'border-l-cosmic-violet/70',
};

/** A raised surface (fill, not shadow) with a coloured left rule for the kind of thing selected. */
function PanelCard({ eyebrow, tone = 'gold', children }: { eyebrow: string; tone?: 'gold' | 'blue' | 'violet'; children: ReactNode }) {
  return (
    <div className={`rounded-card bg-mystic-800 border-l-2 ${TONE_RULE[tone]} px-3.5 py-3 animate-fade-in`}>
      <EyebrowLabel align="left" className="mb-1">{eyebrow}</EyebrowLabel>
      {children}
    </div>
  );
}
