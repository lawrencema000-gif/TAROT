import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fullDeck } from '../data/tarotDeck';
import { getBundledFullPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

function cardToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function TarotCardMeaningPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const card = useMemo(() => {
    return fullDeck.find(c => cardToSlug(c.name) === slug);
  }, [slug]);

  // Find prev/next cards for navigation
  const cardIndex = card ? fullDeck.indexOf(card) : -1;
  const prevCard = cardIndex > 0 ? fullDeck[cardIndex - 1] : null;
  const nextCard = cardIndex < fullDeck.length - 1 ? fullDeck[cardIndex + 1] : null;

  useEffect(() => {
    if (!card) return;
    const suitLabel = card.suit ? ` — ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}` : ' — Major Arcana';
    setPageMeta(
      `${card.name} Tarot Card Meaning${suitLabel}`,
      `${card.name} tarot meaning: ${card.keywords.join(', ')}. Upright and reversed interpretations, love and career readings.`,
      getBundledFullPath(card.id) || undefined
    );

    // JSON-LD for this card
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${card.name} Tarot Card Meaning`,
      description: `${card.name}: ${card.keywords.join(', ')}. Complete upright and reversed meanings.`,
      image: `https://tarotlife.app${getBundledFullPath(card.id) || '/image.png'}`,
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      url: `https://tarotlife.app/tarot-meanings/${cardToSlug(card.name)}`,
      keywords: card.keywords.join(', '),
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Tarot Meanings', item: 'https://tarotlife.app/tarot-meanings' },
        { '@type': 'ListItem', position: 3, name: card.name, item: `https://tarotlife.app/tarot-meanings/${cardToSlug(card.name)}` },
      ],
    });

    window.scrollTo(0, 0);
  }, [card]);

  if (!card) {
    return (
      <div className="tm-page" style={{ textAlign: 'center', padding: '120px 20px' }}>
        <p style={{ color: '#706a82', marginBottom: 16 }}>Card not found.</p>
        <button onClick={() => navigate('/tarot-meanings')} className="tm-bottom-btn">Back to All Cards</button>
      </div>
    );
  }

  const imgPath = getBundledFullPath(card.id);
  const suitLabel = card.suit ? `${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)} · Minor Arcana` : 'Major Arcana';

  return (
    <div className="tm-page">
      {/* Breadcrumb */}
      <nav className="tm-breadcrumb">
        <a href="/tarot-meanings">All Cards</a>
        <span className="tm-breadcrumb-sep">›</span>
        {card.suit && (
          <>
            <a href={`/tarot-meanings?suit=${card.suit}`}>{card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}</a>
            <span className="tm-breadcrumb-sep">›</span>
          </>
        )}
        <span className="tm-breadcrumb-current">{card.name}</span>
      </nav>

      {/* Card Header */}
      <div className="tm-detail-header">
        <div className="tm-detail-img-wrap">
          {imgPath ? (
            <img src={imgPath} alt={card.name} className="tm-detail-img" />
          ) : (
            <div className="tm-detail-placeholder"><span>✦</span></div>
          )}
        </div>
        <div className="tm-detail-info">
          <div className="tm-detail-badge">{suitLabel}</div>
          <h1 className="tm-detail-name">{card.name}</h1>
          <div className="tm-detail-keywords">
            {card.keywords.map(k => (
              <span key={k} className="tm-detail-keyword">{k}</span>
            ))}
          </div>
          <p className="tm-detail-desc">{card.description}</p>
        </div>
      </div>

      {/* Meanings */}
      <div className="tm-meanings">
        <div className="tm-meaning-card upright">
          <div className="tm-meaning-header">
            <span className="tm-meaning-icon">↑</span>
            <h2 className="tm-meaning-title">Upright Meaning</h2>
          </div>
          <p className="tm-meaning-text">{card.meaningUpright}</p>
        </div>

        <div className="tm-meaning-card reversed">
          <div className="tm-meaning-header">
            <span className="tm-meaning-icon">↓</span>
            <h2 className="tm-meaning-title">Reversed Meaning</h2>
          </div>
          <p className="tm-meaning-text">{card.meaningReversed}</p>
        </div>
      </div>

      {/* Love & Career */}
      {(card.loveMeaning || card.careerMeaning) && (
        <div className="tm-contexts">
          {card.loveMeaning && (
            <div className="tm-context-card">
              <h3 className="tm-context-title">
                <span className="tm-context-icon">♡</span> Love & Relationships
              </h3>
              <p className="tm-context-text">{card.loveMeaning}</p>
            </div>
          )}
          {card.careerMeaning && (
            <div className="tm-context-card">
              <h3 className="tm-context-title">
                <span className="tm-context-icon">◈</span> Career & Finances
              </h3>
              <p className="tm-context-text">{card.careerMeaning}</p>
            </div>
          )}
        </div>
      )}

      {/* Reflection */}
      {card.reflectionPrompt && (
        <div className="tm-reflection">
          <h3 className="tm-reflection-title">✎ Reflection Prompt</h3>
          <blockquote className="tm-reflection-text">{card.reflectionPrompt}</blockquote>
        </div>
      )}

      {/* Prev/Next Navigation */}
      <div className="tm-card-nav">
        {prevCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${cardToSlug(prevCard.name)}`)}>
            ← {prevCard.name}
          </button>
        ) : <div />}
        {nextCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${cardToSlug(nextCard.name)}`)}>
            {nextCard.name} →
          </button>
        ) : <div />}
      </div>

      {/* CTA */}
      <div className="tm-bottom-cta">
        <p className="tm-bottom-text">Experience {card.name} in a reading</p>
        <a href="/" className="tm-bottom-btn">Try a Free Reading</a>
      </div>
    </div>
  );
}
