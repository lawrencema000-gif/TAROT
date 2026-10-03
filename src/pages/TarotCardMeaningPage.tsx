import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Check, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import {
  AffirmationPanel,
  Button,
  Disclaimer,
  EmptyState,
  Input,
  KeywordRow,
  PageGrid,
  PageHeader,
  Paper,
  ReadingProse,
  TarotFace,
} from '../components/ui';
import { PaperDisclosure } from '../components/readings/tarot/PaperDisclosure';
import { meaningSections } from '../components/readings/tarot/readingText';
import { fullDeck } from '../data/tarotDeck';
import { getEnrichment } from '../data/tarotEnrichment';
import { getBundledFullPath } from '../config/bundledImages';
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
function getYesNo(card: TarotCard, t: (key: string, opts?: Record<string, unknown>) => string, localizedName: string): { verdict: YesNoVerdict; answer: string; explanation: string } {
  const { verdict, keywords } = getYesNoVerdict(card);
  const answer = t(`cardMeaning.yesNo.answer.${verdict}`);
  const kw = keywords.join(
    t('cardMeaning.yesNo.keywordSeparator', { defaultValue: ' and ' }),
  );
  const explanationKey = keywords.length > 0
    ? `cardMeaning.yesNo.explanationKeywords.${verdict}`
    : `cardMeaning.yesNo.explanation.${verdict}`;
  const explanation = t(explanationKey, { name: localizedName, keywords: kw });
  return { verdict, answer, explanation };
}

// Get cards in same group for navigation grid
function getRelatedCards(card: TarotCard): TarotCard[] {
  if (card.arcana === 'major') return fullDeck.filter(c => c.arcana === 'major');
  return fullDeck.filter(c => c.suit === card.suit);
}

/** The verdict pill on paper: the ink tier, never gold text. */
const VERDICT_CLASS: Record<YesNoVerdict, string> = {
  yes: 'bg-ink-teal/10 text-ink-teal',
  no: 'bg-ink-coral/10 text-ink-coral',
  maybe: 'bg-ink-gold/10 text-ink-gold',
};

/** A linked card name on paper: a quiet pill, ink-gold. */
function CardLink({ name }: { name: string }) {
  return (
    <Link
      to={`/tarot-meanings/${cardToSlug(name)}`}
      className="inline-flex items-center rounded-full px-3 h-7 bg-ink-gold/10 text-ink-gold text-caption font-semibold no-underline"
    >
      {name}
    </Link>
  );
}

/**
 * The free email course, offered to a visitor under the reading. Inserts
 * into newsletter_signups (anon INSERT under RLS); a duplicate address is
 * already subscribed and reads as success.
 */
function CardPageCourseSignup() {
  const { t } = useT('app');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
      setError(t('tarot.emailInvalid', { defaultValue: 'Enter a valid email address.' }));
      return;
    }
    setState('sending');
    const { error: insertError } = await supabase.from('newsletter_signups').insert({
      email: address,
      source: 'tarot_card_page',
      course_lead_magnet: 'tarot-fundamentals-3-part',
    });
    if (insertError && insertError.code !== '23505') {
      setState('idle');
      setError(t('tarot.emailFailed', { defaultValue: 'Couldn’t sign you up. Try again in a moment.' }));
      return;
    }
    setState('done');
  };

  return (
    <section className="rounded-card bg-mystic-900 border border-mystic-700/60 p-5 space-y-3" aria-labelledby="card-course-title">
      <h2 id="card-course-title" className="heading-display-md heading-strong text-mystic-100">{t('tarot.freeTarotGuide')}</h2>
      {state === 'done' ? (
        <p className="inline-flex items-center gap-2 text-ui text-teal" role="status">
          <Check className="w-4 h-4" aria-hidden />
          {t('tarot.youreIn')}
        </p>
      ) : (
        <>
          <p className="text-ui text-mystic-300">{t('tarot.freeTarotGuideDesc')}</p>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:items-start" noValidate>
            <div className="flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('tarot.yourEmail')}
                aria-label={t('tarot.yourEmail')}
                icon={<Mail className="w-4 h-4" aria-hidden />}
                error={error ?? undefined}
                autoComplete="email"
                name="newsletter_email"
                disabled={state === 'sending'}
              />
            </div>
            <Button type="submit" variant="gold" loading={state === 'sending'} className="whitespace-nowrap">
              {t('tarot.getFreeGuide')}
            </Button>
          </form>
          <p className="text-caption text-mystic-500">{t('tarot.noSpam')}</p>
        </>
      )}
    </section>
  );
}

/**
 * A love or career meaning on the sheet. Some are written with both
 * orientations inside one string ("UPRIGHT LOVE MEANING: …"); those are cut
 * at the labels and each part gets a quiet sentence-case label instead.
 */
function FocusMeaning({ text }: { text: string }) {
  const { t } = useT('app');
  const { intro, upright, reversed } = meaningSections(text);
  const label = 'text-caption font-semibold uppercase tracking-[0.12em] text-ink-muted mb-1';
  return (
    <div className="space-y-4">
      {intro && <ReadingProse lede={false} text={intro} />}
      {upright && (
        <div>
          <p className={label}>{t('tarot.upright')}</p>
          <ReadingProse lede={false} text={upright} />
        </div>
      )}
      {reversed && (
        <div>
          <p className={label}>{t('tarot.reversed')}</p>
          <ReadingProse lede={false} text={reversed} />
        </div>
      )}
    </div>
  );
}

/**
 * /tarot-meanings/:slug — one card's meaning.
 *
 * The face, the name, the keyword pills and the affirmation, then
 * everything that is READ on ONE Paper: description, upright, reversed,
 * yes or no and the reflection prompt; love and career open on demand
 * beside the correspondences, the
 * combinations and the FAQ (mirroring the FAQPage JSON-LD); the disclaimer
 * and, for a visitor, the free course follow on the canvas. It used to be six stacked navy boxes,
 * 6,486px tall, with the colours written as hex in `style`.
 */
export function TarotCardMeaningPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  if (!card || !enCard) {
    return (
      <div className="tm-page py-16">
        <EmptyState
          title={t('tarot.cardNotFound')}
          action={
            <Button variant="outline" onClick={() => navigate('/tarot-meanings')}>{t('tarot.backToAllCards')}</Button>
          }
        />
      </div>
    );
  }

  const suitKeyMap: Record<string, string> = { wands: 'wands', cups: 'cups', swords: 'swords', pentacles: 'pentacles' };
  const suitLabel = card.suit
    ? t('tarot.suitMinorLabel', { suit: t(`tarot.${suitKeyMap[card.suit]}`) })
    : t('tarot.majorArcana');
  const elementKey = card.suit === 'wands' ? 'fire' : card.suit === 'cups' ? 'water' : card.suit === 'swords' ? 'air' : card.suit === 'pentacles' ? 'earth' : 'spirit';
  const enrichment = getEnrichment(enCard.name);

  const relatedTitle = card.arcana === 'major'
    ? t('tarot.allMajorCards')
    : t('tarot.allSuitCards', { suit: t(`tarot.${suitKeyMap[card.suit!]}`) });

  // The deck rail: previous/next and the whole arcana or suit. Beside the
  // reading on desktop, below it on a phone — the same order the page had
  // as one column, so nothing moves for the reader who never sees a rail.
  const aside = (
    <>
      <nav className="tm-card-nav" aria-label={t('tarot.prevNext', { defaultValue: 'Previous and next card' })}>
        {prevCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${slugFromId(prevCard.id)}`)}>
            <ChevronLeft className="w-4 h-4 inline -ml-1 mr-0.5" aria-hidden />
            {prevCard.name}
          </button>
        ) : <div />}
        {nextCard ? (
          <button className="tm-card-nav-btn" onClick={() => navigate(`/tarot-meanings/${slugFromId(nextCard.id)}`)}>
            {nextCard.name}
            <ChevronRight className="w-4 h-4 inline ml-0.5 -mr-1" aria-hidden />
          </button>
        ) : <div />}
      </nav>

      <div className="tm-related">
        <h2 className="tm-related-title">{relatedTitle}</h2>
        <div className="tm-related-grid">
          {relatedCards.map(rc => {
            const isActive = rc.id === card.id;
            return (
              <button
                key={rc.id}
                className={`tm-related-card ${isActive ? 'active' : ''}`}
                onClick={() => { if (!isActive) navigate(`/tarot-meanings/${slugFromId(rc.id)}`); }}
                aria-label={rc.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <TarotFace card={rc} size="sm" detail="quiet" loading="lazy" alt="" className="tm-related-face" />
                <span className="tm-related-name">{rc.name.replace('of ', '').replace('The ', '')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="tm-page">
      {/* Breadcrumb */}
      <nav className="tm-breadcrumb" aria-label="Breadcrumb">
        <Link to="/tarot-meanings">{t('tarot.allCards')}</Link>
        <ChevronRight className="tm-breadcrumb-sep" aria-hidden />
        {card.suit && (
          <>
            <Link to={`/tarot-meanings?suit=${card.suit}`}>{t(`tarot.${suitKeyMap[card.suit]}`)}</Link>
            <ChevronRight className="tm-breadcrumb-sep" aria-hidden />
          </>
        )}
        <span className="tm-breadcrumb-current">{card.name}</span>
      </nav>

      <PageGrid
        aside={aside}
        asideLabel={relatedTitle}
        asideClassName="lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto scrollbar-hide"
      >
      <div className="space-y-6 pb-8">
        {/* The card: face, name, keywords, affirmation. */}
        <div className="space-y-5">
          {/* Face beside the name at every width: on a phone the face used
              to stand alone above the fold, 336 px of it. */}
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[14rem_minmax(0,1fr)] gap-x-4 sm:gap-x-6 gap-y-4 items-start">
            <div className="sm:row-span-2">
              <TarotFace card={card} size="fill" radius="card" loading="eager" alt="" />
            </div>
            <PageHeader as="h1" eyebrow={suitLabel || undefined} title={card.name} className="mb-0 pt-1 min-w-0" />
            {/* Under both on a phone, beside the face from sm up. */}
            <KeywordRow keywords={card.keywords.slice(0, 4)} className="col-span-2 sm:col-span-1 sm:col-start-2 !justify-start" />
          </div>
          {enrichment?.affirmation && <AffirmationPanel text={enrichment.affirmation} />}
        </div>

        {/* Quick reference — a table, on the canvas. */}
        <div className="tm-cheatsheet">
          <h2 className="tm-cheatsheet-title heading-display-md text-mystic-100">{t('tarot.quickReference')}</h2>
          <table className="tm-cheatsheet-table">
            <tbody>
              <tr>
                <td className="tm-cs-label">{t('tarot.reversed')}</td>
                <td className="tm-cs-value">{card.meaningReversed.split('.')[0]}.</td>
              </tr>
              {yesNo && (
                <tr>
                  <td className="tm-cs-label">{t('tarot.yesOrNo')}</td>
                  <td className="tm-cs-value">
                    <span className={`tm-yesno ${yesNo.verdict}`}>{yesNo.answer}</span>
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

        {user && (
          <AskOracleButton
            variant="card"
            context={`the meaning of ${card.name} tarot card for me`}
            label={t('tarot.askOracleCta', { defaultValue: 'Read this card for me' }) as string}
          />
        )}

        {/* Everything that is read, on one sheet. */}
        <Paper as="article" tail>
          <div className="space-y-6">
            <section>
              <h2 className="heading-display-md heading-strong text-ink">{t('tarot.cardDescription')}</h2>
              <p className="reading-copy mt-2">{card.description}</p>
            </section>

            <section>
              <h2 className="heading-display-md heading-strong text-ink inline-flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-ink-teal" aria-hidden />
                {t('tarot.uprightMeaning')}
              </h2>
              <p className="reading-copy mt-2">{card.meaningUpright}</p>
            </section>

            <section>
              <h2 className="heading-display-md heading-strong text-ink inline-flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-ink-gold" aria-hidden />
                {t('tarot.reversedMeaning')}
              </h2>
              <p className="reading-copy mt-2">{card.meaningReversed}</p>
            </section>

            {yesNo && (
              <section>
                <h2 className="heading-display-md heading-strong text-ink">{t('tarot.yesOrNoReading')}</h2>
                <div className="mt-2 flex items-start gap-3">
                  <span className={`shrink-0 inline-flex items-center rounded-full px-3 h-7 text-caption font-semibold uppercase tracking-[0.12em] ${VERDICT_CLASS[yesNo.verdict]}`}>
                    {yesNo.answer}
                  </span>
                  <p className="reading-copy">{yesNo.explanation}</p>
                </div>
              </section>
            )}

            {card.reflectionPrompt && (
              <section>
                <h2 className="heading-display-md heading-strong text-ink">{t('tarot.reflectionPrompt')}</h2>
                <blockquote className="reading-quote mt-2">{card.reflectionPrompt}</blockquote>
              </section>
            )}

            {/* The situational readings and the reference material open on
                demand; the crawler copy carries all of it (scripts/seo-body.mjs). */}
            <div>
              {card.loveMeaning && (
                <PaperDisclosure label={t('tarot.loveAndRelationships')}>
                  <FocusMeaning text={card.loveMeaning} />
                </PaperDisclosure>
              )}
              {card.careerMeaning && (
                <PaperDisclosure label={t('tarot.careerAndFinances')}>
                  <FocusMeaning text={card.careerMeaning} />
                </PaperDisclosure>
              )}
            {enrichment && (
              <div>
                <PaperDisclosure label={t('cardMeaning.correspondences', { defaultValue: 'Astrology and numerology' })}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.astrology', { defaultValue: 'Astrological correspondence' })}</h3>
                      <ul className="reading-copy mt-1 list-disc pl-5 marker:text-ink-gold">
                        <li><strong>{t('cardMeaning.element', { defaultValue: 'Element' })}:</strong> {enrichment.element}</li>
                        {enrichment.planet && <li><strong>{t('cardMeaning.planet', { defaultValue: 'Planet' })}:</strong> {enrichment.planet}</li>}
                        {enrichment.zodiac && <li><strong>{t('cardMeaning.zodiac', { defaultValue: 'Zodiac' })}:</strong> {enrichment.zodiac}</li>}
                        {enrichment.decan && <li><strong>{t('cardMeaning.decan', { defaultValue: 'Decan' })}:</strong> {enrichment.decan}</li>}
                        {enrichment.hebrewLetter && <li><strong>{t('cardMeaning.hebrewLetter', { defaultValue: 'Hebrew letter' })}:</strong> {enrichment.hebrewLetter}</li>}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.numerology', { defaultValue: 'Numerology' })}</h3>
                      <p className="reading-copy mt-1">{enrichment.numerology}</p>
                    </div>
                  </div>
                </PaperDisclosure>

                <PaperDisclosure label={t('cardMeaning.combinations', { defaultValue: 'Card combinations' })}>
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.reinforcingCards', { defaultValue: 'Reinforcing cards' })}</h3>
                      <p className="reading-copy mt-1">
                        {t('cardMeaning.reinforcingIntro', { name: card.name, reason: enrichment.reinforcingReason.toLowerCase(), defaultValue: 'When {{name}} appears alongside these cards, the reading’s energy intensifies — {{reason}}' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrichment.reinforcingCards.map((c) => <CardLink key={c} name={c} />)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.opposingCards', { defaultValue: 'Opposing cards' })}</h3>
                      <p className="reading-copy mt-1">
                        {t('cardMeaning.opposingIntro', { name: card.name, reason: enrichment.opposingReason.toLowerCase(), defaultValue: 'These cards create tension with {{name}} — {{reason}}' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrichment.opposingCards.map((c) => <CardLink key={c} name={c} />)}
                      </div>
                    </div>
                  </div>
                </PaperDisclosure>

                {/* Visible FAQ — mirrors the FAQPage JSON-LD so readers see the same Q&A Google does. */}
                <PaperDisclosure label={t('cardMeaning.faq', { defaultValue: 'Frequently asked questions' })}>
                  <dl className="space-y-4">
                    {[
                      [`What does the ${enCard.name} tarot card mean?`, enCard.meaningUpright],
                      [`What does the ${enCard.name} mean reversed?`, enCard.meaningReversed],
                      [`Is the ${enCard.name} a yes or no card?`, `${enrichment.yesNo}. ${enrichment.yesNoReason}`],
                      [
                        `What is the astrological correspondence of the ${enCard.name}?`,
                        `${enCard.name} corresponds to the element of ${enrichment.element}` +
                          (enrichment.planet ? `, the planet ${enrichment.planet}` : '') +
                          (enrichment.zodiac ? `, and the sign of ${enrichment.zodiac}` : '') +
                          (enrichment.decan ? ` (decan: ${enrichment.decan})` : '') +
                          (enrichment.hebrewLetter ? `. The Hebrew letter is ${enrichment.hebrewLetter}.` : '.'),
                      ],
                      [
                        `What cards reinforce or oppose the ${enCard.name}?`,
                        `Reinforcing: ${enrichment.reinforcingCards.join(', ')}. Opposing: ${enrichment.opposingCards.join(', ')}.`,
                      ],
                    ].map(([q, a]) => (
                      <div key={q}>
                        <dt className="text-ui font-semibold text-ink">{q}</dt>
                        <dd className="reading-copy mt-1">{a}</dd>
                      </div>
                    ))}
                  </dl>
                </PaperDisclosure>
              </div>
            )}
            </div>
          </div>
        </Paper>
        <Disclaimer kind="tarot" tail />

        {/* The free course, for a visitor: the same signup as the landing page
            (newsletter_signups, delivered by send-newsletter-course). It used
            to say "You're in" without sending the address anywhere. */}
        {!user && <CardPageCourseSignup />}
      </div>
      </PageGrid>

      {/* Bottom CTA — for a visitor; a signed-in reader has the tab bar. */}
      {!user && (
        <div className="tm-bottom-cta">
          <p className="tm-bottom-text">{t('tarot.experienceInReading', { name: card.name })}</p>
          <a href="/" className="tm-bottom-btn">{t('tarot.tryFreeReading')}</a>
        </div>
      )}
    </div>
  );
}
