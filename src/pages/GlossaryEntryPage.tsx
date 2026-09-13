import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Section } from '../components/ui';
import { LearnEntryTemplate, LearnEntryNotFound } from '../components/learn/LearnEntryTemplate';
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
    return <LearnEntryNotFound title="Term not found" backLabel="Back to glossary" onBack={() => navigate('/glossary')} />;
  }

  const related = entry.relatedEntries
    .map((s) => glossaryEntries.find((x) => x.slug === s))
    .filter((x): x is typeof glossaryEntries[number] => Boolean(x));

  return (
    <LearnEntryTemplate
      eyebrow={entry.category}
      title={entry.term}
      symbol={<BookOpen />}
      lede={entry.longDefinition}
      facts={[
        { label: 'Pronunciation', value: entry.pronunciation ? `/${entry.pronunciation}/` : undefined },
        { label: 'Also known as', value: entry.alsoKnownAs?.join(', ') },
      ]}
      sections={entry.origin ? [{ title: 'Origin', body: entry.origin }] : []}
      related={related.map((r) => ({ label: r.term, href: `/glossary/${r.slug}` }))}
      relatedTitle="Related terms"
      backHref="/glossary"
      backLabel="All terms"
    >
      {entry.example && (
        <Section title="Used in context">
          <blockquote className="reading-quote">{entry.example}</blockquote>
        </Section>
      )}
    </LearnEntryTemplate>
  );
}
