import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Check, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { AffirmationPanel, Button, Disclaimer, EmptyState, Input, KeywordRow, ListSkeleton, PageGrid, PageHeader, Paper, ReadingProse, TarotFace, Disclosure } from '../components/ui';
import { endVisit, keepVisitLanguage, sharedReadingLocale, showVisitIn } from '../services/shareableReadings';
import { affirmationFor, enrichmentFor, firstSentences, focusSections } from '../components/readings/tarot/readingText';
import { cardIdFromName, cardIdFromSlug, cardMeaningPath, cardMeaningSlug } from '../components/readings/tarot/cardSlug';
import { cardYesNo, yesNoVerdict, type YesNoVerdict } from '../components/readings/tarot/cardYesNo';
import { fullDeck } from '../data/tarotDeck';
import { useContentOverlay, ct, type ContentOverlay } from '../i18n/contentOverlay';
import { getBundledFullPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { useT } from '../i18n/useT';
import { localizeCard } from '../i18n/localizeCard';
import { getLocale } from '../i18n/config';
import type { TarotCard } from '../types';

/** Stable URL slugs by id (cardSlug.ts), so a localized name never becomes a link. */
const slugFromId = cardMeaningSlug;
const cardToSlug = (name: string) => {
  const id = cardIdFromName(name);
  return id === undefined ? '' : cardMeaningSlug(id);
};

/** "All speak to …" → "all speak to …" for a clause after a dash; a CJK sentence is left as it is. */
function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
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

/**
 * A linked card name on paper: a quiet pill, ink-gold. The enrichment
 * names its cards in English ("Wheel of Fortune"); the pill shows the card
 * in the reader's language and links by id to its canonical page.
 */
function CardLink({ name }: { name: string }) {
  const id = cardIdFromName(name);
  const en = id === undefined ? undefined : fullDeck.find((c) => c.id === id);
  if (!en || id === undefined) return <span className="inline-flex items-center rounded-full px-3 h-7 bg-ink-gold/10 text-ink-gold text-caption font-semibold">{name}</span>;
  return (
    <Link
      to={cardMeaningPath(id)}
      className="inline-flex items-center rounded-full px-3 h-7 bg-ink-gold/10 text-ink-gold text-caption font-semibold no-underline"
    >
      {localizeCard(en).name}
    </Link>
  );
}

/** One enrichment field in the reader's language: the `enrichment` overlay (`<id>.<field>`) over the English. */
function enrichText(overlay: ContentOverlay | null, id: number, field: string, en: string | undefined): string {
  return en ? ct(overlay, `${id}.${field}`, en) : '';
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
  // At the labels when the text has them, else at the turn to the reversed card.
  const { intro, upright, reversed } = focusSections(text);
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
  const { search, hash } = useLocation();
  const { user } = useAuth();
  const locale = getLocale();

  /*
   * The language the card was shared in (`?hl=`: a card shared from a
   * reading in Japanese, Korean or Chinese, TarotSection — p9 R13), read as
   * the shared reading page reads it (p8 F76, p9 R12). A signed-out visitor
   * in English — the language every first visit starts in, since the
   * detector ignores the browser's — sees the page in it, on this page only
   * (showVisitIn stores nothing). A member who is signed in, or a visitor
   * who reads the app in a language of their own, keeps theirs. Leaving the
   * page ends it (endVisit); the page's own invitation into the app ("Try a
   * free reading") keeps it, since that is a choice where opening a link is
   * not. The card used to open in English under Japanese share text.
   */
  const [visitLocale] = useState(() => {
    const shared = sharedReadingLocale(search);
    return shared && !user && locale === 'en' ? shared : null;
  });
  const [adopting, setAdopting] = useState(visitLocale !== null);
  useEffect(() => {
    if (!visitLocale) return;
    let live = true;
    showVisitIn(visitLocale)
      .catch(() => {})
      .finally(() => {
        if (live) setAdopting(false);
      });
    return () => {
      live = false;
      void endVisit();
    };
    // Once, on arrival: the link's language, before anything is drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `enCard` keeps the English content used for slug lookups, Yes/No classification,
  // and JSON-LD (which should stay English for search indexing).
  // Any slug a link has used for the card resolves (the image table's
  // `wheel-of-fortune` as well as the canonical `the-wheel-of-fortune`).
  const enCard = useMemo(() => {
    const id = cardIdFromSlug(slug);
    return id === undefined ? undefined : fullDeck.find((c) => c.id === id);
  }, [slug]);
  const { overlay: enrichOverlay } = useContentOverlay('enrichment');

  // An older spelling of the slug moves to the canonical one, so the page
  // has one address (the one the sitemap lists) — with the link's query and
  // hash: `?hl`, the language it was shared in, and any campaign tags. The
  // move used to drop them.
  useEffect(() => {
    if (enCard && slug !== cardMeaningSlug(enCard.id)) {
      navigate(`${cardMeaningPath(enCard.id)}${search}${hash}`, { replace: true });
    }
  }, [enCard, slug, navigate, search, hash]);
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
  // The verdict from the English card, explained in the reader's words (cardYesNo).
  const yesNo = enCard && card ? cardYesNo(enCard, card, t) : null;

  useEffect(() => {
    if (!card || !enCard) return;
    // The tab title and description in the reader's language, as the
    // playing-card pages have them. They were English templates around the
    // localized name ("愚者 Tarot Card Meaning — Major Arcana", p10
    // d2-ja-10). The prerendered head the crawlers read stays English
    // (scripts/prerender-meta.mjs), and so does the JSON-LD below.
    const group = card.suit ? t(`tarot.${card.suit}`) : t('tarot.majorArcana');
    setPageMeta(
      t('tarot.seo.cardTitle', { name: card.name, group, defaultValue: '{{name}} Tarot Card Meaning — {{group}}' }),
      t('tarot.seo.cardDesc', {
        name: card.name,
        keywords: card.keywords.join(t('cardMeaning.listSeparator', { defaultValue: ', ' })),
        defaultValue: '{{name}} tarot meaning: {{keywords}}. Upright and reversed interpretations, love, career, yes/no readings.',
      }),
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
    const { verdict, keywordIndexes } = yesNoVerdict(enCard);
    const keywords = keywordIndexes.map((i) => enCard.keywords[i]);
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
  }, [card, enCard, t]);

  // The link's language is on its way (showVisitIn): nothing in English first.
  if (adopting) {
    return (
      <div className="tm-page py-16">
        <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

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
  const enrichment = enrichmentFor(enCard.id);
  const ex = (field: string, en: string | undefined) => enrichText(enrichOverlay, card.id, field, en);
  // In ja/ko/zh only once the overlay has it (affirmationFor).
  const affirmation = affirmationFor(card.id, enrichOverlay);
  const elementName = (el: string) => t(`tarot.elements.${el.toLowerCase()}`, { defaultValue: el });
  // ': ' in English and Korean, '：' after Japanese and Chinese (p10 d2-ja-06).
  const labelSep = t('common:punctuation.labelSeparator', { defaultValue: ': ' });
  const nameList = (names: string[]) =>
    names
      .map((n) => {
        const id = cardIdFromName(n);
        const en = id === undefined ? undefined : fullDeck.find((c) => c.id === id);
        return en ? localizeCard(en).name : n;
      })
      .join(t('cardMeaning.listSeparator', { defaultValue: ', ' }));

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
      <nav className="tm-breadcrumb" aria-label={t('tarot.breadcrumb', { defaultValue: 'Breadcrumb' })}>
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
            {/* lining-nums: "ワンドの3" in the display serif, not an old-style 3 below the line (p8 F80). */}
            <PageHeader as="h1" eyebrow={suitLabel || undefined} title={<span className="lining-nums">{card.name}</span>} className="mb-0 pt-1 min-w-0" />
            {/* Under both on a phone, beside the face from sm up. */}
            <KeywordRow keywords={card.keywords.slice(0, 4)} align="start" className="col-span-2 sm:col-span-1 sm:col-start-2" />
          </div>
          {affirmation && <AffirmationPanel text={affirmation} />}
        </div>

        {/* Quick reference — a table, on the canvas. */}
        <div className="tm-cheatsheet">
          <h2 className="tm-cheatsheet-title heading-display-md text-mystic-100">{t('tarot.quickReference')}</h2>
          <table className="tm-cheatsheet-table">
            <tbody>
              <tr>
                <td className="tm-cs-label">{t('tarot.reversed')}</td>
                <td className="tm-cs-value">{firstSentences(card.meaningReversed, 1)}</td>
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
            context={t('askOracle.context.tarotCard', {
              defaultValue: 'the meaning of {{card}} tarot card for me',
              card: card.name,
            }) as string}
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
                <Disclosure surface="paper" variant="row" lazy label={t('tarot.loveAndRelationships')}>
                  <FocusMeaning text={card.loveMeaning} />
                </Disclosure>
              )}
              {card.careerMeaning && (
                <Disclosure surface="paper" variant="row" lazy label={t('tarot.careerAndFinances')}>
                  <FocusMeaning text={card.careerMeaning} />
                </Disclosure>
              )}
            {enrichment && (
              <div>
                <Disclosure surface="paper" variant="row" lazy label={t('cardMeaning.correspondences', { defaultValue: 'Astrology and numerology' })}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.astrology', { defaultValue: 'Astrological correspondence' })}</h3>
                      <ul className="reading-copy mt-1 list-disc pl-5 marker:text-ink-gold">
                        <li><strong>{t('cardMeaning.element', { defaultValue: 'Element' })}{labelSep}</strong>{elementName(enrichment.element)}</li>
                        {enrichment.planet && <li><strong>{t('cardMeaning.planet', { defaultValue: 'Planet' })}{labelSep}</strong>{ex('planet', enrichment.planet)}</li>}
                        {enrichment.zodiac && <li><strong>{t('cardMeaning.zodiac', { defaultValue: 'Zodiac' })}{labelSep}</strong>{ex('zodiac', enrichment.zodiac)}</li>}
                        {enrichment.decan && <li><strong>{t('cardMeaning.decan', { defaultValue: 'Decan' })}{labelSep}</strong>{ex('decan', enrichment.decan)}</li>}
                        {enrichment.hebrewLetter && <li><strong>{t('cardMeaning.hebrewLetter', { defaultValue: 'Hebrew letter' })}{labelSep}</strong>{ex('hebrewLetter', enrichment.hebrewLetter)}</li>}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.numerology', { defaultValue: 'Numerology' })}</h3>
                      <p className="reading-copy mt-1">{ex('numerology', enrichment.numerology)}</p>
                    </div>
                  </div>
                </Disclosure>

                <Disclosure surface="paper" variant="row" lazy label={t('cardMeaning.combinations', { defaultValue: 'Card combinations' })}>
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.reinforcingCards', { defaultValue: 'Reinforcing cards' })}</h3>
                      <p className="reading-copy mt-1">
                        {t('cardMeaning.reinforcingIntro', { name: card.name, reason: lowerFirst(ex('reinforcingReason', enrichment.reinforcingReason)), defaultValue: 'When {{name}} appears alongside these cards, the reading’s energy intensifies — {{reason}}' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrichment.reinforcingCards.map((c) => <CardLink key={c} name={c} />)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-ui font-semibold text-ink">{t('cardMeaning.opposingCards', { defaultValue: 'Opposing cards' })}</h3>
                      <p className="reading-copy mt-1">
                        {t('cardMeaning.opposingIntro', { name: card.name, reason: lowerFirst(ex('opposingReason', enrichment.opposingReason)), defaultValue: 'These cards create tension with {{name}} — {{reason}}' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrichment.opposingCards.map((c) => <CardLink key={c} name={c} />)}
                      </div>
                    </div>
                  </div>
                </Disclosure>

                {/* Visible FAQ — mirrors the FAQPage JSON-LD so readers see the same Q&A Google does. */}
                <Disclosure surface="paper" variant="row" lazy label={t('cardMeaning.faq', { defaultValue: 'Frequently asked questions' })}>
                  {/* The visible FAQ in the reader's language; the FAQPage JSON-LD above stays English for the index. */}
                  <dl className="space-y-4">
                    {[
                      [
                        t('cardMeaning.faqItems.meaningQ', { name: card.name, defaultValue: 'What does the {{name}} tarot card mean?' }),
                        card.meaningUpright,
                      ],
                      [
                        t('cardMeaning.faqItems.reversedQ', { name: card.name, defaultValue: 'What does the {{name}} mean reversed?' }),
                        card.meaningReversed,
                      ],
                      [
                        t('cardMeaning.faqItems.yesNoQ', { name: card.name, defaultValue: 'Is the {{name}} a yes or no card?' }),
                        t('cardMeaning.faqItems.yesNoA', {
                          answer: t(`cardMeaning.yesNo.answer.${enrichment.yesNo.toLowerCase()}`, { defaultValue: enrichment.yesNo }),
                          reason: ex('yesNoReason', enrichment.yesNoReason),
                          defaultValue: '{{answer}}. {{reason}}',
                        }),
                      ],
                      [
                        t('cardMeaning.faqItems.astrologyQ', { name: card.name, defaultValue: 'What is the astrological correspondence of the {{name}}?' }),
                        [
                          `${elementName(enrichment.element)}`,
                          enrichment.planet ? ex('planet', enrichment.planet) : '',
                          enrichment.zodiac ? ex('zodiac', enrichment.zodiac) : '',
                          enrichment.decan ? ex('decan', enrichment.decan) : '',
                          enrichment.hebrewLetter ? ex('hebrewLetter', enrichment.hebrewLetter) : '',
                        ]
                          .map((v, i) => {
                            const label = [
                              t('cardMeaning.element', { defaultValue: 'Element' }),
                              t('cardMeaning.planet', { defaultValue: 'Planet' }),
                              t('cardMeaning.zodiac', { defaultValue: 'Zodiac' }),
                              t('cardMeaning.decan', { defaultValue: 'Decan' }),
                              t('cardMeaning.hebrewLetter', { defaultValue: 'Hebrew letter' }),
                            ][i];
                            return v ? t('cardMeaning.faqItems.pair', { label, value: v, defaultValue: '{{label}}: {{value}}' }) : '';
                          })
                          .filter(Boolean)
                          .join(t('cardMeaning.faqItems.pairSeparator', { defaultValue: ' · ' })),
                      ],
                      [
                        t('cardMeaning.faqItems.combinationsQ', { name: card.name, defaultValue: 'What cards reinforce or oppose the {{name}}?' }),
                        t('cardMeaning.faqItems.combinationsA', {
                          reinforcing: nameList(enrichment.reinforcingCards),
                          opposing: nameList(enrichment.opposingCards),
                          defaultValue: 'Reinforcing: {{reinforcing}}. Opposing: {{opposing}}.',
                        }),
                      ],
                    ].map(([q, a]) => (
                      <div key={q}>
                        <dt className="text-ui font-semibold text-ink">{q}</dt>
                        <dd className="reading-copy mt-1">{a}</dd>
                      </div>
                    ))}
                  </dl>
                </Disclosure>
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
          {/* Into the app in the language the page was read in (see visitLocale):
              stored before the page loads "/", so the app opens in it. */}
          <a href="/" className="tm-bottom-btn" onClick={() => { void keepVisitLanguage(); }}>{t('tarot.tryFreeReading')}</a>
        </div>
      )}
    </div>
  );
}
