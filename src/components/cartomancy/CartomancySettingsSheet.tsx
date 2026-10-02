import { useMemo } from 'react';
import { ListRow, ListRowGroup, Sheet, Switch } from '../ui';
import { useT } from '../../i18n/useT';
import { COURT_RANKS, PLAYING_JOKERS, PLAYING_SUITS, getPlayingCardBySlug, playingCardId, getPlayingCard } from '../../data/cartomancy';
import type { PlayingCard } from '../../types/cartomancy';
import { PlayingCardFace } from './PlayingCardFace';
import type { CartoSettings } from './cartoFlow';

/**
 * How the deck is read: Jokers in or out, reversals on or off, and an
 * optional significator — the card set aside to stand for the reader (the
 * King or Queen of Hearts in the old practice; any court card, or the Red
 * Joker, here). Persisted per viewer in localStorage by the section.
 */

export interface CartomancySettingsSheetProps {
  open: boolean;
  settings: CartoSettings;
  onChange: (settings: CartoSettings) => void;
  onClose: () => void;
  /** The card with the active locale's name. */
  localize: (card: PlayingCard) => PlayingCard;
}

export function CartomancySettingsSheet({ open, settings, onChange, onClose, localize }: CartomancySettingsSheetProps) {
  const { t } = useT('app');

  // Courts by suit, then the Red Joker: the cards a reader may stand behind.
  const candidates = useMemo(() => {
    const courts: PlayingCard[] = [];
    for (const suit of PLAYING_SUITS) {
      for (const rank of COURT_RANKS) {
        const card = getPlayingCard(playingCardId(suit, rank));
        if (card) courts.push(card);
      }
    }
    return [...courts, ...PLAYING_JOKERS.filter((j) => j.color === 'red')];
  }, []);

  const significator = settings.significator ? getPlayingCardBySlug(settings.significator) ?? null : null;
  const jokersId = 'carto-setting-jokers';
  const reversalsId = 'carto-setting-reversals';

  return (
    <Sheet open={open} onClose={onClose} title={t('cartomancy.settings.title', { defaultValue: 'How the deck is read' })}>
      <div className="space-y-6 pb-2">
        <ListRowGroup>
          <ListRow
            label={<span id={jokersId}>{t('cartomancy.settings.jokers', { defaultValue: 'Jokers' })}</span>}
            meta={t('cartomancy.settings.jokersHint', { defaultValue: 'Shuffle the two Jokers in. Most traditions leave them out.' })}
            trailing={<Switch checked={settings.jokers} onChange={(jokers) => onChange({ ...settings, jokers })} aria-labelledby={jokersId} />}
          />
          <ListRow
            label={<span id={reversalsId}>{t('cartomancy.settings.reversals', { defaultValue: 'Reversals' })}</span>}
            meta={t('cartomancy.settings.reversalsHint', { defaultValue: 'Read a card that lands upside down with its reversed meaning.' })}
            trailing={<Switch checked={settings.reversals} onChange={(reversals) => onChange({ ...settings, reversals })} aria-labelledby={reversalsId} />}
          />
        </ListRowGroup>

        <section>
          <h3 className="heading-display-md text-mystic-100">{t('cartomancy.settings.significator', { defaultValue: 'Significator' })}</h3>
          <p className="text-meta text-mystic-400 mt-1">
            {t('cartomancy.settings.significatorHint', {
              defaultValue: 'A card set aside to stand for you. It is never drawn; the table is read around it.',
            })}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('cartomancy.settings.significator', { defaultValue: 'Significator' })}>
            <button
              type="button"
              role="radio"
              aria-checked={!significator}
              onClick={() => onChange({ ...settings, significator: null })}
              className={`aspect-[2/3] rounded-inset border text-caption text-mystic-300 flex items-center justify-center text-center px-1 select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                !significator ? 'border-gold bg-gold/10 text-gold' : 'border-dashed border-mystic-600'
              }`}
            >
              {t('cartomancy.settings.none', { defaultValue: 'None' })}
            </button>
            {candidates.map((card) => {
              const selected = settings.significator === card.slug;
              return (
                <button
                  key={card.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={localize(card).name}
                  onClick={() => onChange({ ...settings, significator: card.slug })}
                  className={`aspect-[2/3] rounded-inset overflow-hidden border text-gold select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[border-color,transform] duration-fast motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 [&>svg]:w-full [&>svg]:h-full [&>svg]:block ${
                    selected ? 'border-gold' : 'border-gold/25'
                  }`}
                >
                  <PlayingCardFace card={card} detail="quiet" />
                </button>
              );
            })}
          </div>
          {significator && (
            <p className="mt-3 text-center text-meta text-mystic-300">
              {t('cartomancy.settings.significatorTag', { defaultValue: 'Significator: {{name}}', name: localize(significator).name })}
            </p>
          )}
        </section>
      </div>
    </Sheet>
  );
}
