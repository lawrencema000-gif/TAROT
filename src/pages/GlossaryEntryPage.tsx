import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { PageHeader, Section, EmptyState, Button } from '../components/ui';
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
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          title="Term not found"
          action={
            <Button variant="secondary" onClick={() => navigate('/glossary')}>
              <ArrowLeft className="w-4 h-4" />
              Back to glossary
            </Button>
          }
        />
      </div>
    );
  }

  const related = entry.relatedEntries
    .map((s) => glossaryEntries.find((x) => x.slug === s))
    .filter((x): x is typeof glossaryEntries[number] => Boolean(x));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <PageHeader
        className="mb-6"
        backHref="/glossary"
        backLabel="All terms"
        eyebrow={entry.category}
        title={
          <>
            {entry.term}
            {entry.pronunciation && (
              <span className="ml-3 text-sm font-normal text-mystic-400 italic">
                /{entry.pronunciation}/
              </span>
            )}
          </>
        }
        subtitle={
          entry.alsoKnownAs && entry.alsoKnownAs.length > 0
            ? `Also known as: ${entry.alsoKnownAs.join(', ')}`
            : undefined
        }
      />

      <p className="text-mystic-300 leading-relaxed mb-6">{entry.longDefinition}</p>

      {entry.origin && (
        <Section eyebrow="Origin" spacing="sm" className="mb-6">
          <p className="text-sm text-mystic-300 leading-relaxed">{entry.origin}</p>
        </Section>
      )}

      {entry.example && (
        <section className="rounded-2xl border-l-2 border-gold/40 bg-mystic-900/30 p-4 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gold mb-2">Used in context</h2>
          <p className="text-sm italic text-mystic-300">"{entry.example}"</p>
        </section>
      )}

      {related.length > 0 && (
        <Section title="Related terms" headingLevel="h3" spacing="sm">
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/glossary/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-sm text-mystic-200">{r.term}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
