import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { fullDeck } from '../data/tarotDeck';
import { getBundledFullPath, getBundledThumbPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { useT } from '../i18n/useT';
import { localizeCard } from '../i18n/localizeCard';
import { getLocale } from '../i18n/config';
import type { TarotCard } from '../types';

function cardToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Map card id → English name, so we can generate stable URL slugs even when
// the UI is rendering localized card names.
const EN_NAME_BY_ID: Map<number, string> = new Map(fullDeck.map(c => [c.id, c.name]));
function slugFromId(id: number): string {
  return cardToSlug(EN_NAME_BY_ID.get(id) ?? '');
}

// Yes/No determination based on card energy
const YES_CARDS = new Set([
  'The Fool', 'The Magician', 'The Empress', 'The Emperor', 'The Lovers',
  'The Chariot', 'Strength', 'Wheel of Fortune', 'The Star', 'The Sun',
  'The World', 'Judgement', 'Temperance',
]);
const NO_CARDS = new Set([
  'The Tower', 'The Devil', 'Death', 'The Hanged Man',
]);
// Everything else is "Maybe" — depends on context

type YesNoVerdict = 'yes' | 'no' | 'maybe';

function getYesNoVerdict(card: TarotCard): { verdict: YesNoVerdict; keywords: string[] } {
  if (YES_CARDS.has(card.name)) return { verdict: 'yes', keywords: [] };
  if (NO_CARDS.has(card.name)) return { verdict: 'no', keywords: [] };
  const positiveKeywords = ['success', 'joy', 'abundance', 'victory', 'celebration', 'love', 'harmony', 'fulfillment', 'completion'];
  const negativeKeywords = ['loss', 'defeat', 'betrayal', 'grief', 'conflict', 'anxiety', 'burden', 'deception', 'stagnation'];
  const kw = card.keywords.map((k) => k.toLowerCase());
  const posMatch = kw.some((k) => positiveKeywords.some((p) => k.includes(p)));
  const negMatch = kw.some((k) => negativeKeywords.some((n) => k.includes(n)));
  const first2 = card.keywords.slice(0, 2);
  if (posMatch && !negMatch) return { verdict: 'yes', keywords: first2 };
  if (negMatch && !posMatch) return { verdict: 'no', keywords: first2 };
  return { verdict: 'maybe', keywords: [] };
}

/** Render-time localized Yes/No for the active locale. */
function getYesNo(card: TarotCard, t: (key: string, opts?: Record<string, unknown>) => string, localizedName: string): { answer: string; explanation: string } {
  const { verdict, keywords } = getYesNoVerdict(card);
  const answer = t(`cardMeaning.yesNo.answer.${verdict}`);
  const kw = keywords.join(
    t('cardMeaning.yesNo.keywordSeparator', { defaultValue: ' and ' }),
  );
  const explanationKey = keywords.length > 0
    ? `cardMeaning.yesNo.explanationKeywords.${verdict}`
    : `cardMeaning.yesNo.explanation.${verdict}`;
  const explanation = t(explanationKey, { name: localizedName, keywords: kw });
  return { answer, explanation };
}

// Get cards in same group for navigation grid
function getRelatedCards(card: TarotCard): TarotCard[] {
  if (card.arcana === 'major') return fullDeck.filter(c => c.arcana === 'major');
  return fullDeck.filter(c => c.suit === card.suit);
}

export function TarotCardMeaningPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const locale = getLocale();

  // `enCard` keeps the English content used for slug lookups, Yes/No classification,
  // and JSON-LD (which should stay English for search indexing).
  const enCard = useMemo(() => fullDeck.find(c => cardToSlug(c.name) === slug), [slug]);
  const cardIndex = enCard ? fullDeck.indexOf(enCard) : -1;
  const enPrev = cardIndex > 0 ? fullDeck[cardIndex - 1] : null;
  const enNext = cardIndex < fullDeck.length - 1 ? fullDeck[cardIndex + 1] : null;
  // Localized versions used for display.
  const card = useMemo(() => (enCard ? localizeCard(enCard, locale) : null), [enCard, locale]);
  const prevCard = useMemo(() => (enPrev ? localizeCard(enPrev, locale) : null), [enPrev, locale]);
  const nextCard = useMemo(() => (enNext ? localizeCard(enNext, locale) : null), [enNext, locale]);
  const relatedCards = useMemo(
    () => (enCard ? getRelatedCards(enCard).map(c => localizeCard(c, locale)) : []),
    [enCard, locale],
  );
  const yesNo = enCard && card ? getYesNo(enCard, t, card.name) : null;

  useEffect(() => {
    if (!card || !enCard) return;
    const suitLabel = card.suit ? ` — ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}` : ' — Major Arcana';
    setPageMeta(
      `${card.name} Tarot Card Meaning${suitLabel}`,
      `${card.name} tarot meaning: ${card.keywords.join(', ')}. Upright and reversed interpretations, love, career, yes/no readings.`,
      getBundledFullPath(card.id) || undefined
    );
    removeJsonLd();
    // JSON-LD / breadcrumb keep English names + EN slug so structured data
    // stays consistent with the canonical EN URL that Google indexes.
    addJsonLd({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: `${enCard.name} Tarot Card Meaning`,
      description: `${enCard.name}: ${enCard.keywords.join(', ')}. Complete upright and reversed meanings.`,
      image: `https://tarotlife.app${getBundledFullPath(enCard.id) || '/image.png'}`,
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      url: `https://tarotlife.app/tarot-meanings/${cardToSlug(enCard.name)}`,
      keywords: enCard.keywords.join(', '),
    });
    addJsonLd({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Tarot Meanings', item: 'https://tarotlife.app/tarot-meanings' },
        { '@type': 'ListItem', position: 3, name: enCard.name, item: `https://tarotlife.app/tarot-meanings/${cardToSlug(enCard.name)}` },
      ],
    });
    // DefinedTerm schema — each tarot card is a well-defined symbolic
    // term. This schema type is used by generative AI engines when
    // answering "what does X mean" queries; it establishes Arcana as
    // an authoritative definition source for each card.
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `https://tarotlife.app/tarot-meanings/${cardToSlug(enCard.name)}#term`,
      name: enCard.name,
      description: `${enCard.name} — ${enCard.keywords.slice(0, 4).join(', ')}. A card of the ${enCard.suit === null ? 'Major Arcana' : `${enCard.suit} suit (Minor Arcana)`}.`,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        '@id': 'https://tarotlife.app/tarot-meanings#deck',
        name: 'Rider-Waite-Smith Tarot Deck',
        url: 'https://tarotlife.app/tarot-meanings',
      },
      termCode: cardToSlug(enCard.name),
      url: `https://tarotlife.app/tarot-meanings/${cardToSlug(enCard.name)}`,
    });
    // FAQPage schema — drives "People also ask" rich results
    // SEO JSON-LD always uses English — Google indexes canonical EN URLs.
    const { verdict, keywords } = getYesNoVerdict(enCard);
    const yn = {
      answer: verdict === 'yes' ? 'Yes' : verdict === 'no' ? 'No' : 'Maybe',
      explanation:
        verdict === 'yes' && keywords.length === 0
          ? `${enCard.name} carries positive, affirming energy. This card supports forward movement and favorable outcomes.`
          : verdict === 'no' && keywords.length === 0
          ? `${enCard.name} suggests obstacles, upheaval, or the need to pause. The timing may not be right, or a different approach is needed.`
          : verdict === 'maybe'
          ? `${enCard.name} is context-dependent. The answer depends on surrounding cards and your specific situation.`
          : verdict === 'yes'
          ? `This card's energy of ${keywords.join(' and ')} leans toward a positive outcome.`
          : `This card's energy of ${keywords.join(' and ')} suggests challenges or delays.`,
    };
    addJsonLd({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What does the ${enCard.name} tarot card mean?`,
          acceptedAnswer: { '@type': 'Answer', text: enCard.meaningUpright },
        },
        {
          '@type': 'Question',
          name: `What does the ${enCard.name} mean reversed?`,
          acceptedAnswer: { '@type': 'Answer', text: enCard.meaningReversed },
        },
        {
          '@type': 'Question',
          name: `Is the ${enCard.name} a yes or no card?`,
          acceptedAnswer: { '@type': 'Answer', text: `${yn.answer}. ${yn.explanation}` },
        },
        {
          '@type': 'Question',
          name: `What does the ${enCard.name} mean in a love reading?`,
          acceptedAnswer: { '@type': 'Answer', text: enCard.loveMeaning || `${enCard.name} in love represents ${enCard.keywords.slice(0, 3).join(', ').toLowerCase()}.` },
        },
        {
          '@type': 'Question',
          name: `What does the ${enCard.name} mean in a career reading?`,
          acceptedAnswer: { '@type': 'Answer', text: enCard.careerMeaning || `${enCard.name} in career represents ${enCard.keywords.slice(0, 3).join(', ').toLowerCase()}.` },
        },
      ],
    });
    window.scrollTo(0, 0);
  }, [card, enCard]);

  if (!card) {
    return (
      <div className="tm-page" style={{ textAlign: 'center', padding: '120px 20px' }}>
        <p style={{ color: '#706a82', marginBottom: 16 }}>{t('tarot.cardNotFound')}</p>
        <button onClick={() => navigate('/tarot-meanings')} className="tm-bottom-btn">{t('tarot.backToAllCards')}</button>
      </div>
    );
  }

  const imgPath = getBundledFullPath(card.id);
  const suitKeyMap: Record<string, string> = { wands: 'wands', cups: 'cups', swords: 'swords', pentacles: 'pentacles' };
  const suitLabel = card.suit
    ? t('tarot.suitMinorLabel', { suit: t(`tarot.${suitKeyMap[card.suit]}`) })
    : t('tarot.majorArcana');
  const elementKey = card.suit === 'wands' ? 'fire' : card.suit === 'cups' ? 'water' : card.suit === 'swords' ? 'air' : card.suit === 'pentacles' ? 'earth' : 'spirit';

  return (
    <div className="tm-page">
      {/* Breadcrumb */}
      <nav className="tm-breadcrumb">
        <a href="/tarot-meanings">{t('tarot.allCards')}</a>
        <span className="tm-breadcrumb-sep">›</span>
        {card.suit && (
          <>
            <a href={`/tarot-meanings?suit=${card.suit}`}>{t(`tarot.${suitKeyMap[card.suit]}`)}</a>
            <span className="tm-breadcrumb-sep">›</span>
          </>
        )}
        <span className="tm-breadcrumb-current">{card.name}</span>
      </nav>

      {/* Card Header */}
      <div className="tm-detail-header">
        <div className="tm-detail-img-wrap">
          {imgPath ? <img src={imgPath} alt={card.name} className="tm-detail-img" /> : <div className="tm-detail-placeholder"><span>✦</span></div>}
        </div>
        <div className="tm-detail-info">
          <div className="tm-detail-badge">{suitLabel}</div>
          <h1 className="tm-detail-name">{card.name}</h1>
          <div className="tm-detail-keywords">
            {card.keywords.map(k => <span key={k} className="tm-detail-keyword">{k}</span>)}
          </div>

          {/* ── Cheat Sheet (NEW) ── */}
          <div className="tm-cheatsheet">
            <h3 className="tm-cheatsheet-title">{t('tarot.quickReference')}</h3>
            <table className="tm-cheatsheet-table">
              <tbody>
                <tr>
                  <td className="tm-cs-label">{t('tarot.upright')}</td>
                  <td className="tm-cs-value">{card.keywords.join(', ')}</td>
                </tr>
                <tr>
                  <td className="tm-cs-label">{t('tarot.reversed')}</td>
                  <td className="tm-cs-value">{card.meaningReversed.split('.')[0]}.</td>
                </tr>
                {yesNo && (
                  <tr>
                    <td className="tm-cs-label">{t('tarot.yesOrNo')}</td>
                    <td className="tm-cs-value">
                      <span className={`tm-yesno ${yesNo.answer.toLowerCase()}`}>{yesNo.answer}</span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="tm-cs-label">{t('tarot.element')}</td>
                  <td className="tm-cs-value">{t(`tarot.elements.${elementKey}`)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Card Description */}
      <div className="tm-description">
        <h2 className="tm-section-h2">{t('tarot.cardDescription')}</h2>
        <p className="tm-description-text">{card.description}</p>
      </div>

      {user && (
        <div className="my-4">
          <AskOracleButton
            variant="card"
            context={`the meaning of ${card.name} tarot card for me`}
            label={t('tarot.askOracleCta', { defaultValue: 'Read this card for me' }) as string}
          />
        </div>
      )}

      {/* Upright & Reversed Meanings */}
      <div className="tm-meanings">
        <div className="tm-meaning-card upright">
          <div className="tm-meaning-header">
            <span className="tm-meaning-icon">↑</span>
            <h2 className="tm-meaning-title">{t('tarot.uprightMeaning')}</h2>
          </div>
          <p className="tm-meaning-text">{card.meaningUpright}</p>
        </div>
        <div className="tm-meaning-card reversed">
          <div className="tm-meaning-header">
            <span className="tm-meaning-icon">↓</span>
            <h2 className="tm-meaning-title">{t('tarot.reversedMeaning')}</h2>
          </div>
          <p className="tm-meaning-text">{card.meaningReversed}</p>
        </div>
      </div>

      {/* Context Readings: Love, Career, Yes/No */}
      <div className="tm-contexts-full">
        {card.loveMeaning && (
          <div className="tm-context-card">
            <h3 className="tm-context-title"><span className="tm-context-icon">♡</span> {t('tarot.loveAndRelationships')}</h3>
            <p className="tm-context-text">{card.loveMeaning}</p>
          </div>
        )}
        {card.careerMeaning && (
          <div className="tm-context-card">
            <h3 className="tm-context-title"><span className="tm-context-icon">◈</span> {t('tarot.careerAndFinances')}</h3>
            <p className="tm-context-text">{card.careerMeaning}</p>
          </div>
        )}
        {yesNo && (
          <div className="tm-context-card">
            <h3 className="tm-context-title"><span className="tm-context-icon">◉</span> {t('tarot.yesOrNoReading')}</h3>
            <div className="tm-yesno-block">
              <span className={`tm-yesno-badge ${yesNo.answer.toLowerCase()}`}>{yesNo.answer}</span>
              <p className="tm-context-text">{yesNo.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reflection Prompt */}
      {card.reflectionPrompt && (
        <div className="tm-reflection">
          <h3 className="tm-reflection-title">✎ {t('tarot.reflectionPrompt')}</h3>
          <blockquote className="tm-reflection-text">{card.reflectionPrompt}</blockquote>
        </div>
      )}

      {/* ── Email Capture (NEW) ── */}
      <div className="tm-email-capture">
        {subscribed ? (
          <div className="tm-email-success">
            <span>✓</span> {t('tarot.youreIn')}
          </div>
        ) : (
          <>
            <h3 className="tm-email-title">☽ {t('tarot.freeTarotGuide')}</h3>
            <p className="tm-email-desc">{t('tarot.freeTarotGuideDesc')}</p>
            <form className="tm-email-form" onSubmit={(e) => {
              e.preventDefault();
              if (email.includes('@')) setSubscribed(true);
            }}>
              <input
                type="email"
                placeholder={t('tarot.yourEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tm-email-input"
                required
                name="newsletter_email"
                autoComplete="off"
              />
              <button type="submit" className="tm-email-btn">{t('tarot.getFreeGuide')}</button>
            </form>
            <p className="tm-email-note">{t('tarot.noSpam')}</p>
          </>
        )}
      </div>

      {/* Prev/Next Navigation */}
      <div className="tm-card-nav">
        {prevCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${slugFromId(prevCard.id)}`)}>
            ← {prevCard.name}
          </button>
        ) : <div />}
        {nextCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${slugFromId(nextCard.id)}`)}>
            {nextCard.name} →
          </button>
        ) : <div />}
      </div>

      {/* ── Full Card Navigation Grid (NEW) ── */}
      <div className="tm-related">
        <h3 className="tm-related-title">
          {card.arcana === 'major'
            ? t('tarot.allMajorCards')
            : t('tarot.allSuitCards', { suit: t(`tarot.${suitKeyMap[card.suit!]}`) })}
        </h3>
        <div className="tm-related-grid">
          {relatedCards.map(rc => {
            const thumb = getBundledThumbPath(rc.id);
            const isActive = rc.id === card.id;
            return (
              <button
                key={rc.id}
                className={`tm-related-card ${isActive ? 'active' : ''}`}
                onClick={() => { if (!isActive) navigate(`/tarot-meanings/${slugFromId(rc.id)}`); }}
              >
                {thumb ? (
                  <img src={thumb} alt={rc.name} className="tm-related-img" loading="lazy" />
                ) : (
                  <div className="tm-related-placeholder">✦</div>
                )}
                <span className="tm-related-name">{rc.name.replace('of ', '').replace('The ', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="tm-bottom-cta">
        <p className="tm-bottom-text">{t('tarot.experienceInReading', { name: card.name })}</p>
        <a href="/" className="tm-bottom-btn">{t('tarot.tryFreeReading')}</a>
      </div>
    </div>
  );
}
