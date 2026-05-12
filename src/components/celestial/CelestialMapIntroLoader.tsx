import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { PLANETS } from '../../utils/astrocartography';

/**
 * First-open intro loader for the Celestial Map.
 *
 * Inspired by Astroline's "Mapping your birth chart…" step but tuned to
 * Arcana's voice — no fake progress bars, no Barnum framing. Just a
 * gentle planet-by-planet reveal that orients the user to what's about
 * to load.
 *
 * Shown once per user via localStorage flag. Total duration ~4 seconds
 * (10 planets × 350ms stagger + 500ms tail). The parent owns the
 * "shown / dismiss" state — this component is purely presentational.
 */

interface Props {
  open: boolean;
  onDone: () => void;
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_COLOR: Record<string, string> = {
  Sun: '#f4d668', Moon: '#e6e0ff', Mercury: '#a8e8e0', Venus: '#f0b8a0',
  Mars: '#e07a5f', Jupiter: '#d4af37', Saturn: '#c2b280', Uranus: '#80c8e8',
  Neptune: '#8e6eb5', Pluto: '#a83253',
};

export function CelestialMapIntroLoader({ open, onDone }: Props) {
  const { t } = useT('app');

  useEffect(() => {
    if (!open) return;
    // Auto-dismiss after the stagger completes. The user can't tap to
    // skip — the wait IS the experience here, and it's short enough
    // that an explicit skip would feel disrespectful.
    const total = PLANETS.length * 350 + 1200;
    const timer = setTimeout(onDone, total);
    return () => clearTimeout(timer);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-mystic-950 via-mystic-950 to-black"
          role="dialog"
          aria-label={t('celestial.intro.title', { defaultValue: 'Drawing your celestial map' }) as string}
        >
          <div className="max-w-md w-full px-8 text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <Sparkles className="w-6 h-6 text-gold mx-auto" aria-hidden />
              <h2 className="heading-display-lg text-mystic-100">
                {t('celestial.intro.title', { defaultValue: 'Drawing your celestial map' })}
              </h2>
              <p className="text-sm text-mystic-400 leading-relaxed">
                {t('celestial.intro.body', {
                  defaultValue: 'Placing each planet where it was rising, setting, and at its meridian when you were born…',
                })}
              </p>
            </motion.div>

            <div className="grid grid-cols-5 gap-3 max-w-xs mx-auto">
              {PLANETS.map((planet, i) => (
                <motion.div
                  key={planet}
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.35, duration: 0.45, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
                    style={{
                      backgroundColor: `${PLANET_COLOR[planet]}22`,
                      color: PLANET_COLOR[planet],
                      boxShadow: `0 0 16px ${PLANET_COLOR[planet]}55`,
                    }}
                  >
                    {PLANET_GLYPH[planet]}
                  </div>
                  <span className="text-[10px] text-mystic-400 uppercase tracking-wider">
                    {planet}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: PLANETS.length * 0.35 + 0.5, duration: 0.6 }}
              className="flex items-center justify-center gap-2 text-xs text-gold/80 uppercase tracking-wider"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse"
                aria-hidden
              />
              <span>
                {t('celestial.intro.ready', { defaultValue: 'Ready in a moment' })}
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
