import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LearnEntryTemplate, LearnEntryNotFound, type LearnEntrySection } from '../components/learn/LearnEntryTemplate';
import { getNumerologyEntry, numerologyEntries, type NumerologyCategory } from '../data/numerologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const CATEGORY_LABELS: Record<NumerologyCategory, string> = {
  core: 'Core number',
  master: 'Master number',
  compound: 'Compound number',
};

export function NumerologyEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const entry = slug ? getNumerologyEntry(slug) : null;

  useEffect(() => {
    if (!entry) return;
    setPageMeta(
      `Number ${entry.number} — Life Path Meaning`,
      entry.shortDescription,
    );
    removeJsonLd();
    const url = `https://tarotlife.app/numerology/${entry.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `Numerology Number ${entry.number} — Life Path Meaning`,
      description: entry.longDescription,
      url,
      keywords: entry.keywords.join(', '),
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      datePublished: '2026-04-29',
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entry.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Numerology', item: 'https://tarotlife.app/numerology' },
        { '@type': 'ListItem', position: 3, name: `Number ${entry.number}`, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [entry]);

  if (!entry) {
    return <LearnEntryNotFound title="Number not found" backLabel="Back to numerology" onBack={() => navigate('/numerology')} />;
  }

  const related = entry.relatedEntries
    .map((s) => numerologyEntries.find((x) => x.slug === s))
    .filter((x): x is typeof numerologyEntries[number] => Boolean(x));

  const sections: LearnEntrySection[] = [
    { title: 'Personality', body: entry.personality },
    { title: 'Strengths', body: entry.strengths, list: true },
    { title: 'Challenges', body: entry.challenges, list: true },
    { title: 'In Love', body: entry.inLove },
    { title: 'In Career', body: entry.inCareer },
    { title: 'In Spirituality', body: entry.inSpirituality },
    { title: 'In Health', body: entry.inHealth },
    { title: 'How life-path is calculated', body: entry.lifePathExplanation },
    { title: 'Tarot connection', body: entry.tarotConnection },
  ];
  if (entry.famousExamples?.length > 0) {
    sections.push({ title: `Famous Life Path ${entry.number}s`, body: entry.famousExamples.join(', ') });
  }

  return (
    <LearnEntryTemplate
      eyebrow={`Life Path Number ${entry.category === 'master' ? '(Master)' : ''}`}
      title={`Number ${entry.number}`}
      symbol={entry.number}
      lede={entry.longDescription}
      facts={[
        { label: 'Number', value: entry.number },
        { label: 'Type', value: CATEGORY_LABELS[entry.category] },
        { label: 'Major Arcana', value: entry.tarotMajorArcana },
      ]}
      sections={sections}
      faqs={entry.faqs}
      related={related.map((r) => ({ label: `Number ${r.number}`, href: `/numerology/${r.slug}` }))}
      backHref="/numerology"
      backLabel="All numbers"
    />
  );
}
