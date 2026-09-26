import { ChevronRight } from 'lucide-react';
import { EyebrowLabel } from '../ui';
import { ZODIAC_ICONS } from '../icons';
import { useT } from '../../i18n/useT';
import { localizeSignName } from '../../i18n/localizeNames';
import type { ZodiacSign } from '../../types';
import type { ZodiacSign as AstroSign } from '../../types/astrology';

interface HoroscopeCardProps {
  sign: ZodiacSign;
  onRead: () => void;
}

/**
 * The first part of the ritual: today's horoscope.
 *
 * It used to show three labels — Love, Work, Mood — with no data behind
 * them, and the sign as a text glyph that Android renders as colour emoji.
 * Now it says what it is: the sign, drawn in the same line as every other
 * glyph in the app, and a single line inviting the read. The surface is
 * `.card-ritual`, the app's one tappable-card treatment, on a real button.
 */
export function HoroscopeCard({ sign, onRead }: HoroscopeCardProps) {
  const { t } = useT('app');
  // utils/zodiac keys signs in lower case; the glyph set and the name
  // localiser use the astrology type's capitalised names.
  const astro = (sign.charAt(0).toUpperCase() + sign.slice(1)) as AstroSign;
  const Glyph = ZODIAC_ICONS[astro];
  const name = localizeSignName(astro);

  return (
    <button
      type="button"
      onClick={onRead}
      className="card-ritual w-full text-left p-5 touch-manipulation [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-control bg-gold/10 text-gold flex items-center justify-center shrink-0">
          <Glyph size={30} strokeWidth={1.5} aria-label={name} />
        </div>
        <div className="flex-1 min-w-0">
          <EyebrowLabel align="left">{t('home.ritualCards.todaysEnergy')}</EyebrowLabel>
          <h3 className="heading-display-md text-mystic-100 mt-0.5">{name}</h3>
          <p className="text-meta text-mystic-400 mt-0.5">{t('home.ritualCards.read')}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-mystic-500 shrink-0" aria-hidden />
      </div>
    </button>
  );
}
