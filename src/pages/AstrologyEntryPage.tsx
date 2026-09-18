import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LearnEntryTemplate, LearnEntryNotFound, type LearnEntrySection } from '../components/learn/LearnEntryTemplate';
import { getAstroEntry, astrologyEntries, type AstroCategory, type AstroEntry } from '../data/astrologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const CATEGORY_LABELS: Record<string, string> = {
  sign: 'Zodiac Sign',
  planet: 'Planet',
  house: 'House',
  aspect: 'Aspect',
};

const FACTS: Record<AstroCategory, (e: AstroEntry) => Array<[string, string | number | undefined]>> = {
  sign: (e) => [['Element', e.element], ['Modality', e.modality], ['Ruler', e.rulingPlanet], ['Dates', e.dates], ['Body', e.bodyPart]],
  planet: (e) => [['Type', e.planetType], ['Rules', e.rules?.join(', ')], ['Exalted', e.exalted]],
  house: (e) => [['House', e.houseNumber], ['Domain', e.domain], ['Natural sign', e.naturalSign]],
  aspect: (e) => [['Angle', e.aspectAngle === undefined ? undefined : `${e.aspectAngle}°`], ['Nature', e.aspectNature]],
};

export function AstrologyEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const entry = slug ? getAstroEntry(slug) : null;

  useEffect(() => {
    if (!entry) return;
    setPageMeta(
      `${entry.name} — ${CATEGORY_LABELS[entry.category] || 'Astrology'}`,
      entry.shortDescription,
    );
    removeJsonLd();
    const url = `https://tarotlife.app/astrology/${entry.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `${entry.name} — ${CATEGORY_LABELS[entry.category] || 'Astrology'}`,
      description: entry.longDescription,
      image: 'https://tarotlife.app/image.png',
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      url,
      keywords: entry.keywords.join(', '),
      datePublished: '2026-04-29',
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
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
        { '@type': 'ListItem', position: 2, name: 'Astrology', item: 'https://tarotlife.app/astrology' },
        { '@type': 'ListItem', position: 3, name: entry.name, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [entry]);

  if (!entry) {
    return <LearnEntryNotFound title="Entry not found" backLabel="Back to Astrology hub" onBack={() => navigate('/astrology')} />;
  }

  const related = entry.relatedEntries
    .map((s) => astrologyEntries.find((x) => x.slug === s))
    .filter((x): x is typeof astrologyEntries[number] => Boolean(x));

  const sections: LearnEntrySection[] = [
    { title: 'In Love', body: entry.inLove },
    { title: 'In Career', body: entry.inCareer },
    { title: 'In Spirituality', body: entry.inSpirituality },
    { title: 'Strengths', body: entry.strengths, list: true },
    { title: 'Challenges', body: entry.challenges, list: true },
  ];
  if (entry.famousExamples && entry.famousExamples.length > 0) {
    sections.push({ title: 'Famous examples', body: entry.famousExamples.join(', ') });
  }

  return (
    <LearnEntryTemplate
      eyebrow={CATEGORY_LABELS[entry.category]}
      title={entry.name}
      symbol={entry.symbol}
      lede={entry.longDescription}
      facts={FACTS[entry.category](entry).map(([label, value]) => ({ label, value }))}
      sections={sections}
      faqs={entry.faqs}
      related={related.map((r) => ({ label: r.name, href: `/astrology/${r.slug}`, symbol: r.symbol }))}
      backHref="/astrology"
      backLabel="All astrology entries"
    />
  );
}
