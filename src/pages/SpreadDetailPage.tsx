import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Clock, ChevronRight } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { Button, Disclosure, EmptyState, Page, PageHeader, Section } from '../components/ui';
import { getSpreadBySlug, allSpreads as tarotSpreads } from '../data/tarotSpreads';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

export function SpreadDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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
          title="Spread not found"
          action={
            <Button variant="outline" onClick={() => navigate('/spreads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back to all spreads
            </Button>
          }
        />
      </Page>
    );
  }

  const related = spread.relatedSpreads
    .map((s) => tarotSpreads.find((x) => x.slug === s))
    .filter((x): x is typeof tarotSpreads[number] => Boolean(x));

  return (
    <Page className="py-6 sm:py-10">
      <PageHeader
        backHref="/spreads"
        backLabel="All spreads"
        eyebrow={
          <>
            {spread.cardCount} cards · {spread.difficulty} ·{' '}
            <Clock className="w-3 h-3 inline" /> ~{spread.durationMin} min
          </>
        }
        title={spread.name}
        subtitle={spread.longDescription}
      />

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-3"><TarotCardIcon className="w-4 h-4 inline mr-1 text-gold" />Best for</h2>
        <ul className="reading-copy space-y-1.5">
          {spread.bestFor.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-gold mt-1">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <Section
        spacing="sm"
        title={<><Layers className="w-5 h-5 inline mr-2 text-gold" />Position-by-position meaning</>}
        description="Each card placed in this spread answers a specific question. Read in order."
      >
        <ol className="space-y-3">
          {spread.positions.map((p) => (
            <li key={p.position} className="rounded-xl border border-mystic-800/60 bg-mystic-900/40 p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/15 border border-gold/30 text-gold text-sm font-display flex items-center justify-center">
                  {p.position}
                </span>
                <div className="flex-1">
                  <h3 className="text-ui font-medium text-mystic-100 mb-1">{p.name}</h3>
                  <p className="reading-copy">{p.meaning}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-2">When to use</h2>
        <p className="reading-copy">{spread.whenToUse}</p>
      </section>

      <Section spacing="sm" title="Example questions">
        <ul className="space-y-2">
          {spread.exampleQuestions.map((q, i) => (
            <li key={i} className="reading-copy italic px-3 py-2 rounded-lg bg-mystic-900/30 border-l-2 border-gold/40">
              "{q}"
            </li>
          ))}
        </ul>
      </Section>

      {spread.history && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
          <h2 className="heading-display-md text-mystic-100 mb-2">Origin & tradition</h2>
          <p className="reading-copy">{spread.history}</p>
        </section>
      )}

      <Section spacing="sm" title="Frequently asked questions">
        <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 px-4">
          {spread.faqs.map((f, i) => (
            <Disclosure key={i} variant="row" label={f.q}>
              <p className="reading-copy">{f.a}</p>
            </Disclosure>
          ))}
        </div>
      </Section>

      {related.length > 0 && (
        <Section spacing="sm" title="Related spreads">
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/spreads/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-sm text-mystic-200">{r.name}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
