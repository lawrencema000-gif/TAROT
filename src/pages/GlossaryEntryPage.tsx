import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getGlossaryEntry, glossaryEntries } from '../data/glossaryLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

export function GlossaryEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const entry = slug ? getGlossaryEntry(slug) : null;

  useEffect(() => {
    if (!entry) return;
    setPageMeta(`${entry.term} — Definition`, entry.shortDefinition);
    removeJsonLd();
    const url = `https://tarotlife.app/glossary/${entry.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `${url}#term`,
      name: entry.term,
      description: entry.longDefinition,
      url,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        '@id': 'https://tarotlife.app/glossary#set',
        name: 'Arcana Glossary',
        url: 'https://tarotlife.app/glossary',
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Glossary', item: 'https://tarotlife.app/glossary' },
        { '@type': 'ListItem', position: 3, name: entry.term, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [entry]);

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="heading-display-lg text-mystic-100 mb-2">Term not found</h1>
        <button onClick={() => navigate('/glossary')} className="px-5 py-2 rounded-xl border border-mystic-700 text-mystic-300">
          <ArrowLeft className="w-4 h-4 inline mr-2" />Back to glossary
        </button>
      </div>
    );
  }

  const related = entry.relatedEntries
    .map((s) => glossaryEntries.find((x) => x.slug === s))
    .filter((x): x is typeof glossaryEntries[number] => Boolean(x));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <Link to="/glossary" className="inline-flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300 mb-3 no-underline">
        <ArrowLeft className="w-3 h-3" /> All terms
      </Link>

      <header className="mb-6">
        <span className="text-xs uppercase tracking-wider text-mystic-500">{entry.category}</span>
        <div className="flex items-baseline gap-3 mt-1">
          <h1 className="heading-display-xl text-mystic-100">{entry.term}</h1>
          {entry.pronunciation && (
            <span className="text-sm text-mystic-400 italic">/{entry.pronunciation}/</span>
          )}
        </div>
        {entry.alsoKnownAs && entry.alsoKnownAs.length > 0 && (
          <p className="text-xs text-mystic-500 mt-1">
            Also known as: {entry.alsoKnownAs.join(', ')}
          </p>
        )}
      </header>

      <p className="text-mystic-300 leading-relaxed mb-6">{entry.longDefinition}</p>

      {entry.origin && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-gold mb-2">Origin</h2>
          <p className="text-sm text-mystic-300 leading-relaxed">{entry.origin}</p>
        </section>
      )}

      {entry.example && (
        <section className="rounded-2xl border-l-2 border-gold/40 bg-mystic-900/30 p-4 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gold mb-2">Used in context</h2>
          <p className="text-sm italic text-mystic-300">"{entry.example}"</p>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-mystic-100 mb-3">Related terms</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/glossary/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-sm text-mystic-200">{r.term}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
