import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fullDeck } from '../data/tarotDeck';
import { getBundledThumbPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import type { TarotCard } from '../types';

type Filter = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const FILTERS: { id: Filter; labelKey: string }[] = [
  { id: 'all', labelKey: 'tarot.allCards' },
  { id: 'major', labelKey: 'tarot.majorArcana' },
  { id: 'wands', labelKey: 'tarot.wands' },
  { id: 'cups', labelKey: 'tarot.cups' },
  { id: 'swords', labelKey: 'tarot.swords' },
  { id: 'pentacles', labelKey: 'tarot.pentacles' },
];

function cardToSlug(card: TarotCard): string {
  return card.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function TarotMeaningsPage() {
  const { t } = useT('app');
  const [filter, setFilter] = useState<Filter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta(t('tarot.pageTitle'), t('tarot.pageDesc'));
  }, [t]);

  const filteredCards = useMemo(() => {
    if (filter === 'all') return fullDeck;
    if (filter === 'major') return fullDeck.filter(c => c.arcana === 'major');
    return fullDeck.filter(c => c.suit === filter);
  }, [filter]);

  const activeSuitKey = filter !== 'all' ? filter : null;

  return (
    <div className="tm-page">
      {/* Hero */}
      <div className="tm-hero">
        <div className="tm-hero-badge">{t('tarot.heroBadge')}</div>
        <h1 className="tm-hero-title">{t('tarot.title')}</h1>
        <p className="tm-hero-sub">{t('tarot.heroSub')}</p>
      </div>

      {/* Filters */}
      <div className="tm-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`tm-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Section intro */}
      {activeSuitKey && (
        <div className="tm-section-intro">
          <h2 className="tm-section-title">{t(`tarot.suits.${activeSuitKey}.title`)}</h2>
          <p className="tm-section-subtitle">{t(`tarot.suits.${activeSuitKey}.subtitle`)}</p>
          <div className="tm-section-divider" />
          <p className="tm-section-desc">{t(`tarot.suits.${activeSuitKey}.desc`)}</p>
        </div>
      )}

      {/* Card Grid */}
      <div className="tm-grid">
        {filteredCards.map(card => {
          const thumb = getBundledThumbPath(card.id);
          return (
            <button
              key={card.id}
              className="tm-card"
              onClick={() => navigate(`/tarot-meanings/${cardToSlug(card)}`)}
            >
              <div className="tm-card-img-wrap">
                {thumb ? (
                  <img src={thumb} alt={card.name} className="tm-card-img" loading="lazy" />
                ) : (
                  <div className="tm-card-placeholder">
                    <span>✦</span>
                  </div>
                )}
              </div>
              <div className="tm-card-info">
                <h3 className="tm-card-name">{card.name}</h3>
                <p className="tm-card-keywords">{card.keywords.slice(0, 3).join(' · ')}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="tm-bottom-cta">
        <p className="tm-bottom-text">{t('tarot.bottomText')}</p>
        <a href="/" className="tm-bottom-btn">{t('tarot.tryFreeReading')}</a>
      </div>
    </div>
  );
}
