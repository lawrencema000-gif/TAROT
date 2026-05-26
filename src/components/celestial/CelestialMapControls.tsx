import { motion } from 'framer-motion';
import { Globe, Map as MapIcon, Plus, Minus, Crosshair, Target } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { MapMode } from './useCelestialMapEngine';

/**
 * Floating controls overlay for the Celestial Map. Sits at top-right
 * of the map canvas with a frosted-glass background.
 *
 * Layout: vertical column on mobile (compact), horizontal on tablet+.
 * Each control is a 36×36 square so tap targets exceed Material's 44pt
 * with a small margin (icon-only with aria-label, no text).
 *
 * Visual treatment: `bg-mystic-900/70 backdrop-blur-md hairline-gold-soft`.
 * Hover state lifts opacity to 90% + adds a faint gold ring.
 */

interface Props {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Premium-only "fly to my birth place" — undefined hides the button. */
  onFindMe?: () => void;
}

export function CelestialMapControls({
  mode,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onFindMe,
}: Props) {
  const { t } = useT('app');

  const buttons: Array<{
    key: string;
    icon: typeof Globe;
    label: string;
    onClick: () => void;
    active?: boolean;
    available?: boolean;
  }> = [
    {
      key: 'flat',
      icon: MapIcon,
      label: t('celestial.controls.flat', { defaultValue: 'Flat map' }) as string,
      onClick: () => onModeChange('flat'),
      active: mode === 'flat',
    },
    {
      key: 'globe',
      icon: Globe,
      label: t('celestial.controls.globe', { defaultValue: 'Globe view' }) as string,
      onClick: () => onModeChange('globe'),
      active: mode === 'globe',
    },
    {
      key: 'in',
      icon: Plus,
      label: t('celestial.controls.zoomIn', { defaultValue: 'Zoom in' }) as string,
      onClick: onZoomIn,
    },
    {
      key: 'out',
      icon: Minus,
      label: t('celestial.controls.zoomOut', { defaultValue: 'Zoom out' }) as string,
      onClick: onZoomOut,
    },
    {
      key: 'reset',
      icon: Crosshair,
      label: t('celestial.controls.reset', { defaultValue: 'Reset view' }) as string,
      onClick: onReset,
    },
    ...(onFindMe
      ? [{
          key: 'findMe',
          icon: Target,
          label: t('celestial.controls.findMe', { defaultValue: 'Find my birth place' }) as string,
          onClick: onFindMe,
          available: true,
        }]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-mystic-900/70 backdrop-blur-md hairline-gold-soft shadow-lg shadow-black/40"
    >
      {buttons.map((btn, i) => {
        // Separator between mode toggle (first two) and zoom controls.
        const showDivider = i === 2;
        return (
          <div key={btn.key} className="contents">
            {showDivider && (
              <div className="h-px w-full bg-gold/15 my-1" aria-hidden />
            )}
            <button
              type="button"
              onClick={btn.onClick}
              aria-label={btn.label}
              title={btn.label}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                btn.active
                  ? 'bg-gold/25 text-gold ring-1 ring-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                  : 'text-mystic-200 hover:text-gold hover:bg-mystic-800/60 hover:ring-1 hover:ring-gold/20'
              }`}
            >
              <btn.icon className="w-4 h-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </motion.div>
  );
}
