import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fullDeck } from '../data/tarotDeck';
import { getBundledThumbPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';
import type { TarotCard } from '../types';

type Filter = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All Cards' },
  { id: 'major', label: 'Major Arcana' },
  { id: 'wands', label: 'Wands' },
  { id: 'cups', label: 'Cups' },
  { id: 'swords', label: 'Swords' },
  { id: 'pentacles', label: 'Pentacles' },
];

const SUIT_INTROS: Record<string, { title: string; subtitle: string; desc: string }> = {
  major: {
    title: 'Major Arcana',
    subtitle: "The Fool's Journey",
    desc: "The 22 Major Arcana cards represent life's major themes, spiritual lessons, and turning points. From The Fool's innocent first step to The World's triumphant completion, these cards tell the story of the soul's evolution.",
  },
  wands: {
    title: 'Suit of Wands',
    subtitle: 'Fire · Passion · Creation',
    desc: 'Wands represent passion, creativity, ambition, and energy. They speak to what drives you — your goals, desires, and the spark that sets everything in motion.',
  },
  cups: {
    title: 'Suit of Cups',
    subtitle: 'Water · Emotion · Intuition',
    desc: 'Cups represent emotions, relationships, intuition, and the inner world. They reflect how you feel, who you love, and the depths of your emotional landscape.',
  },
  swords: {
    title: 'Suit of Swords',
    subtitle: 'Air · Intellect · Truth',
    desc: 'Swords represent thought, communication, conflict, and truth. They cut through illusion to reveal what is — sometimes painfully, always honestly.',
  },
  pentacles: {
    title: 'Suit of Pentacles',
    subtitle: 'Earth · Material · Growth',
    desc: 'Pentacles represent money, career, health, and the physical world. They ground the spiritual in the practical — what you build, earn, and nurture.',
  },
};

function cardToSlug(card: TarotCard): string {
  return card.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function TarotMeaningsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta(
      'Tarot Card Meanings — All 78 Cards Explained',
      'Explore the meaning of all 78 tarot cards. Upright and reversed meanings, love and career interpretations, keywords, and reflection prompts for every card.'
    );
  }, []);

  const filteredCards = useMemo(() => {
    if (filter === 'all') return fullDeck;
    if (filter === 'major') return fullDeck.filter(c => c.arcana === 'major');
    return fullDeck.filter(c => c.suit === filter);
  }, [filter]);

  const activeIntro = filter !== 'all' ? SUIT_INTROS[filter] : null;

  return (
    <div className="tm-page">
      {/* Hero */}
      <div className="tm-hero">
        <div className="tm-hero-badge">78 Cards · Full Meanings</div>
        <h1 className="tm-hero-title">Tarot Card Meanings</h1>
        <p className="tm-hero-sub">
          A complete guide to every card in the tarot deck — upright and reversed meanings,
          love and career interpretations, and reflection prompts.
        </p>
      </div>

      {/* Filters */}
      <div className="tm-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`tm-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Section intro */}
      {activeIntro && (
        <div className="tm-section-intro">
          <h2 className="tm-section-title">{activeIntro.title}</h2>
          <p className="tm-section-subtitle">{activeIntro.subtitle}</p>
          <div className="tm-section-divider" />
          <p className="tm-section-desc">{activeIntro.desc}</p>
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
        <p className="tm-bottom-text">
          Ready to put these meanings into practice?
        </p>
        <a href="/" className="tm-bottom-btn">
          Try a Free Reading
        </a>
      </div>
    </div>
  );
}
