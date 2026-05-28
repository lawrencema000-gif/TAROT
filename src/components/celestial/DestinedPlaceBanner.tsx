import { motion } from 'framer-motion';
import { MapPin, X, ChevronRight } from 'lucide-react';
import { ccToFlag } from '../../utils/celestialGeo';
import { useT } from '../../i18n/useT';
import type { DestinedPlace } from '../../types';

/**
 * Persistent revisit banner shown on the Celestial Map when the user
 * has saved a destined place. Tap to fly to it + reopen the reading.
 * Long-press / dismiss to clear.
 *
 * Visual: thin gold-trimmed card with the saved city's flag, name,
 * and a subtle "your destined place" eyebrow. Lives near the top of
 * the page below the hero so users see it on every visit.
 */

interface Props {
  place: DestinedPlace;
  onRevisit: () => void;
  onDismiss: () => Promise<void> | void;
}

export function DestinedPlaceBanner({ place, onRevisit, onDismiss }: Props) {
  const { t } = useT('app');
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative rounded-2xl bg-gradient-to-r from-gold/12 via-mystic-900/60 to-mystic-900/60 hairline-gold border border-gold/30 overflow-hidden"
    >
      {/* Subtle inner glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: 'radial-gradient(ellipse 30% 80% at 0% 50%, rgba(244,214,104,0.22), transparent)' }}
        aria-hidden
      />
      <button
        onClick={onRevisit}
        className="relative w-full flex items-center gap-3 p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-mystic-900/70 hairline-gold-soft flex items-center justify-center text-2xl" aria-hidden>
          {ccToFlag(place.city.cc) || <MapPin className="w-5 h-5 text-gold" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold/80 font-medium">
            {t('celestial.destinedPlace.eyebrow', { defaultValue: 'Your destined place' })}
          </div>
          <div className="text-base font-medium text-mystic-100 truncate">
            {place.city.name}
            <span className="text-xs text-mystic-400 font-normal ml-2">{place.city.country}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0" aria-hidden />
      </button>
      <button
        onClick={() => void onDismiss()}
        aria-label={t('celestial.destinedPlace.clear', { defaultValue: 'Clear destined place' }) as string}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-mystic-900/60 hover:bg-mystic-800 text-mystic-400 hover:text-mystic-200 flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3" aria-hidden />
      </button>
    </motion.div>
  );
}
