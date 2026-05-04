import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Clock, Sparkles, ChevronRight } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="heading-display-lg text-mystic-100 mb-2">Spread not found</h1>
        <button onClick={() => navigate('/spreads')} className="px-5 py-2 rounded-xl border border-mystic-700 text-mystic-300 hover:text-mystic-100">
          <ArrowLeft className="w-4 h-4 inline mr-2" />Back to all spreads
        </button>
      </div>
    );
  }

  const related = spread.relatedSpreads
    .map((s) => tarotSpreads.find((x) => x.slug === s))
    .filter((x): x is typeof tarotSpreads[number] => Boolean(x));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <Link to="/spreads" className="inline-flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300 mb-3 no-underline">
        <ArrowLeft className="w-3 h-3" /> All spreads
      </Link>

      <header className="mb-6">
        <h1 className="heading-display-xl text-mystic-100 mb-2">{spread.name}</h1>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-mystic-500 mb-3">
          <span className="text-gold">{spread.cardCount} cards</span>
          <span>·</span>
          <span>{spread.difficulty}</span>
          <span>·</span>
          <span><Clock className="w-3 h-3 inline" /> ~{spread.durationMin} min</span>
        </div>
        <p className="text-mystic-300 leading-relaxed">{spread.longDescription}</p>
      </header>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
        <h2 className="text-sm font-medium text-mystic-300 mb-3"><Sparkles className="w-4 h-4 inline mr-1 text-gold" />Best for</h2>
        <ul className="space-y-1.5">
          {spread.bestFor.map((b, i) => (
            <li key={i} className="text-sm text-mystic-300 flex items-start gap-2">
              <span className="text-gold mt-1">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-display text-xl text-mystic-100 mb-1"><Layers className="w-5 h-5 inline mr-2 text-gold" />Position-by-position meaning</h2>
        <p className="text-xs text-mystic-500 mb-3">Each card placed in this spread answers a specific question. Read in order.</p>
        <ol className="space-y-3">
          {spread.positions.map((p) => (
            <li key={p.position} className="rounded-xl border border-mystic-800/60 bg-mystic-900/40 p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/15 border border-gold/30 text-gold text-sm font-display flex items-center justify-center">
                  {p.position}
                </span>
                <div className="flex-1">
                  <h3 className="font-medium text-mystic-100 mb-1">{p.name}</h3>
                  <p className="text-sm text-mystic-400 leading-relaxed">{p.meaning}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
        <h2 className="text-sm font-medium text-mystic-300 mb-2">When to use</h2>
        <p className="text-sm text-mystic-300 leading-relaxed">{spread.whenToUse}</p>
      </section>

      <section className="mb-6">
        <h2 className="font-display text-lg text-mystic-100 mb-3">Example questions</h2>
        <ul className="space-y-2">
          {spread.exampleQuestions.map((q, i) => (
            <li key={i} className="text-sm italic text-mystic-300 px-3 py-2 rounded-lg bg-mystic-900/30 border-l-2 border-gold/40">
              "{q}"
            </li>
          ))}
        </ul>
      </section>

      {spread.history && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <h2 className="text-sm font-medium text-mystic-300 mb-2">Origin & tradition</h2>
          <p className="text-sm text-mystic-400 leading-relaxed">{spread.history}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-display text-lg text-mystic-100 mb-3">Frequently asked questions</h2>
        <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-1 divide-y divide-mystic-800/60">
          {spread.faqs.map((f, i) => (
            <details key={i} className="px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-mystic-100">{f.q}</summary>
              <p className="mt-2 text-sm text-mystic-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-lg text-mystic-100 mb-3">Related spreads</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/spreads/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-sm text-mystic-200">{r.name}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
