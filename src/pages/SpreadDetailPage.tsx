import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Clock, ChevronRight, Play } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { Button, Disclosure, EmptyState, Page, PageHeader, Section } from '../components/ui';
import { SpreadGlyph } from '../components/icons/SpreadGlyph';
import { getSpreadBySlug, getSpreadLayout, allSpreads as tarotSpreads } from '../data/tarotSpreads';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { ct, ctEntry, useContentOverlay } from '../i18n/contentOverlay';
import { rememberPendingSpread } from '../components/readings/tarot/pendingSpread';

/**
 * /spreads/:slug — one spread of the catalogue, public.
 *
 * Every word on the page is the reader's language: the name and the
 * positions' names from spreads.catalog.<slug> (app.json), the prose —
 * the long description, best-for, when to use, the positions' meanings,
 * the example questions, the history and the FAQ — from the `spreads`
 * content overlay keyed by slug, the headings from spreadDetail.*. The
 * JSON-LD stays English: it describes the canonical English page.
 *
 * "Read this spread" starts the reading for a signed-in reader. A visitor
 * is asked to sign up first, and the spread is remembered through it
 * (pendingSpread) instead of being lost on the landing page.
 */
/** The difficulty's English, the default of spreadDetail.difficulty.<level>. */
const DIFFICULTY = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const;

export function SpreadDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useT('app');
  const { user } = useAuth();
  const { overlay } = useContentOverlay('spreads');
  const spread = slug ? getSpreadBySlug(slug) : null;

  useEffect(() => {
    if (!spread) return;
    setPageMeta(
      `${spread.name} Tarot Spread — Position Meanings`,
      `${spread.shortDescription} ${spread.cardCount}-card layout with position-by-position interpretation.`,
    );
    removeJsonLd();
    const url = `https://tarotlife.app/spreads/${spread.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: `How to read the ${spread.name} tarot spread`,
      description: spread.longDescription,
      totalTime: `PT${spread.durationMin}M`,
      url,
      step: spread.positions.map((p, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: p.name,
        text: p.meaning,
      })),
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: spread.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Tarot Spreads', item: 'https://tarotlife.app/spreads' },
        { '@type': 'ListItem', position: 3, name: spread.name, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [spread]);

  if (!spread) {
    return (
      <Page className="py-16">
        <EmptyState
          icon={<Layers />}
          title={t('spreadDetail.notFound', { defaultValue: 'Spread not found' })}
          action={
            <Button variant="outline" onClick={() => navigate('/spreads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />{t('spreadDetail.backToAll', { defaultValue: 'Back to all spreads' })}
            </Button>
          }
        />
      </Page>
    );
  }

  const s = spread.slug;
  // The prose in the reader's language; the English stands for anything the overlay lacks.
  const prose = ctEntry(spread, overlay, s, ['longDescription', 'bestFor', 'whenToUse', 'history', 'exampleQuestions']);
  const name = t(`spreads.catalog.${s}.name`, { defaultValue: spread.name });

  const related = spread.relatedSpreads
    .map((r) => tarotSpreads.find((x) => x.slug === r))
    .filter((x): x is typeof tarotSpreads[number] => Boolean(x));

  const readThisSpread = () => {
    if (user) {
      navigate('/readings', { state: { spreadSlug: s } });
      return;
    }
    rememberPendingSpread(s);
    navigate('/signup');
  };

  return (
    <Page className="py-6 sm:py-10">
      <PageHeader
        backHref="/spreads"
        backLabel={t('spreadDetail.allSpreads', { defaultValue: 'All spreads' })}
        eyebrow={
          <>
            <span className="tabular-nums">{t('readings.cardCount', { count: spread.cardCount, defaultValue: '{{count}} cards' })}</span>
            {' · '}
            {t(`spreadDetail.difficulty.${spread.difficulty}`, { defaultValue: DIFFICULTY[spread.difficulty] })}
            {' · '}
            <Clock className="w-3 h-3 inline" aria-hidden />{' '}
            <span className="tabular-nums">{t('spreadDetail.duration', { n: spread.durationMin, defaultValue: '~{{n}} min' })}</span>
          </>
        }
        title={name}
        subtitle={prose.longDescription}
        icon={<SpreadGlyph layout={getSpreadLayout(spread)} />}
      />

      {/* The catalogue is the product: every spread is castable. The reading
          flow reads `spreadSlug` from router state and starts at the focus
          step with this spread's positions (R5 M-10). */}
      <Button variant="gold" size="lg" fullWidth onClick={readThisSpread}>
        <Play className="w-4 h-4" aria-hidden />
        {user
          ? t('spreadDetail.readThisSpread', { defaultValue: 'Read this spread' })
          : t('spreadDetail.signUpToRead', { defaultValue: 'Sign up to read this spread' })}
      </Button>

      <section className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-3">
          <TarotCardIcon className="w-4 h-4 inline mr-1 text-gold" />
          {t('spreadDetail.bestFor', { defaultValue: 'Best for' })}
        </h2>
        <ul className="reading-copy space-y-1.5">
          {prose.bestFor.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-gold mt-1" aria-hidden>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <Section
        spacing="sm"
        title={<><Layers className="w-5 h-5 inline mr-2 text-gold" />{t('spreadDetail.positionsTitle', { defaultValue: 'Position-by-position meaning' })}</>}
        description={t('spreadDetail.positionsDescription', { defaultValue: 'Each card placed in this spread answers a specific question. Read in order.' })}
      >
        <ol className="space-y-3">
          {spread.positions.map((p, i) => (
            <li key={p.position} className="rounded-control border border-mystic-800/60 bg-mystic-900/40 p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/15 border border-gold/30 text-gold text-caption font-semibold tabular-nums flex items-center justify-center">
                  {p.position}
                </span>
                <div className="flex-1">
                  <h3 className="text-ui font-medium text-mystic-100 mb-1">
                    {t(`spreads.catalog.${s}.positions.${i}`, { defaultValue: p.name })}
                  </h3>
                  <p className="reading-copy">{ct(overlay, `${s}.positions.${i}.meaning`, p.meaning)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <section className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-2">{t('spreadDetail.whenToUse', { defaultValue: 'When to use' })}</h2>
        <p className="reading-copy">{prose.whenToUse}</p>
      </section>

      <Section spacing="sm" title={t('spreadDetail.exampleQuestions', { defaultValue: 'Example questions' })}>
        <ul className="space-y-2">
          {prose.exampleQuestions.map((q, i) => (
            <li key={i} className="reading-copy px-3 py-2 rounded-inset bg-mystic-900/30 border-l-2 border-gold/40">
              {t('spreadDetail.quoted', { text: q, defaultValue: '“{{text}}”' })}
            </li>
          ))}
        </ul>
      </Section>

      {prose.history && (
        <section className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
          <h2 className="heading-display-md text-mystic-100 mb-2">{t('spreadDetail.history', { defaultValue: 'Origin & tradition' })}</h2>
          <p className="reading-copy">{prose.history}</p>
        </section>
      )}

      <Section spacing="sm" title={t('spreadDetail.faq', { defaultValue: 'Frequently asked questions' })}>
        <div className="rounded-card border border-mystic-800/60 bg-mystic-900/40 px-4">
          {spread.faqs.map((f, i) => (
            <Disclosure key={i} variant="row" label={ct(overlay, `${s}.faqs.${i}.q`, f.q)}>
              <p className="reading-copy">{ct(overlay, `${s}.faqs.${i}.a`, f.a)}</p>
            </Disclosure>
          ))}
        </div>
      </Section>

      {related.length > 0 && (
        <Section spacing="sm" title={t('spreadDetail.related', { defaultValue: 'Related spreads' })}>
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/spreads/${r.slug}`} className="flex items-center justify-between p-3 rounded-control border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-ui text-mystic-200">{t(`spreads.catalog.${r.slug}.name`, { defaultValue: r.name })}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" aria-hidden />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
