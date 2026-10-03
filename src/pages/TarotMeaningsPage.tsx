import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DeckLibrary, type DeckFilter } from '../components/readings/DeckLibrary';
import { PageHeader } from '../components/ui';
import { fullDeck } from '../data/tarotDeck';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { localizeCards } from '../i18n/localizeCard';
import { getLocale } from '../i18n/config';
import type { TarotCard } from '../types';

// Slug lookup always uses English names so URLs stay stable across locales.
const enNameById: Map<number, string> = new Map(fullDeck.map(c => [c.id, c.name]));
function slugFromCardId(id: number): string {
  const enName = enNameById.get(id) ?? '';
  return enName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const SUITS: DeckFilter[] = ['major', 'wands', 'cups', 'swords', 'pentacles'];

/**
 * /tarot-meanings — the public card library: the DeckLibrary (search, suit
 * tabs, the faces, no captions) and a closing call to action. Tapping a
 * card opens its meaning page.
 */
export function TarotMeaningsPage() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const locale = getLocale();
  const { user } = useAuth();

  useEffect(() => {
    setPageMeta(t('tarot.pageTitle'), t('tarot.pageDesc'));
  }, [t]);

  const localizedDeck = useMemo(() => localizeCards(fullDeck, locale), [locale]);
  const suitParam = params.get('suit');
  const initialFilter: DeckFilter = SUITS.includes(suitParam as DeckFilter) ? (suitParam as DeckFilter) : 'all';

  const open = (card: TarotCard) => navigate(`/tarot-meanings/${slugFromCardId(card.id)}`);

  return (
    <div className="tm-page py-6 sm:py-10 space-y-4">
      <PageHeader
        eyebrow={t('tarot.deckCount', { defaultValue: '78 cards' })}
        title={t('tarot.libraryTitle', { defaultValue: 'Card meanings' })}
      />
      <DeckLibrary
        cards={localizedDeck}
        onSelect={open}
        initialFilter={initialFilter}
        footer={
          <div className="tm-bottom-cta">
            <p className="tm-bottom-text">{t('tarot.bottomText')}</p>
            {/* A visitor is offered a free reading; a signed-in reader goes to the table. */}
            {user ? (
              <Link to="/readings" className="tm-bottom-btn">{t('tarot.startReading', { defaultValue: 'Start a reading' })}</Link>
            ) : (
              <a href="/" className="tm-bottom-btn">{t('tarot.tryFreeReading')}</a>
            )}
          </div>
        }
      />
    </div>
  );
}
