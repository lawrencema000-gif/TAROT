import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/useT';
import { LearnEntryTemplate, LearnEntryNotFound, type LearnEntrySection } from '../components/learn/LearnEntryTemplate';
import { getNumerologyEntry, numerologyEntries, type NumerologyCategory, type NumerologyEntry } from '../data/numerologyLearn';
import { localizeNumerologyEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

/** English defaults; the keys live under learn.numerology.kinds. */
const KIND_LABEL: Record<NumerologyCategory, string> = {
  core: 'Core number',
  master: 'Master number',
  compound: 'Compound number',
};

/** The number itself, in Inter at the icon tile's scale: numerals are never set in the display serif. */
function Numeral({ value }: { value: string }) {
  return <span className="font-body text-title font-semibold tabular-nums leading-none">{value}</span>;
}

export function NumerologyEntryPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const source = slug ? getNumerologyEntry(slug) : null;
  const { overlay, ready } = useLearnOverlay('numerology');

  useEffect(() => {
    if (!source) return;
    setPageMeta(`Number ${source.number} — Life Path Meaning`, source.shortDescription);
    removeJsonLd();
    const url = `https://tarotlife.app/numerology/${source.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `Numerology Number ${source.number} — Life Path Meaning`,
      description: source.longDescription,
      url,
      keywords: source.keywords.join(', '),
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      datePublished: '2026-04-29',
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: source.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 3, name: `Number ${source.number}`, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [source]);

  if (!source) {
    return (
      <LearnEntryNotFound
        title={t('learn.numerology.notFound', { defaultValue: 'Number not found' })}
        backLabel={t('learn.numerology.backToHub', { defaultValue: 'All numbers' })}
        onBack={() => navigate('/numerology')}
      />
    );
  }

  const entry = localizeNumerologyEntry(source, overlay);
  const sep = t('learn.listSeparator', { defaultValue: ', ' });
  const numberLabel = (n: string) => t('learn.numerology.numberLabel', { defaultValue: 'Number {{number}}', number: n });

  const sections: LearnEntrySection[] = [
    { title: t('learn.sections.personality', { defaultValue: 'Personality' }), body: entry.personality },
    { title: t('learn.sections.strengths', { defaultValue: 'Strengths' }), body: entry.strengths, list: true },
    { title: t('learn.sections.challenges', { defaultValue: 'Challenges' }), body: entry.challenges, list: true },
    { title: t('learn.sections.inLove', { defaultValue: 'In love' }), body: entry.inLove },
    { title: t('learn.sections.inCareer', { defaultValue: 'In career' }), body: entry.inCareer },
    { title: t('learn.sections.inSpirituality', { defaultValue: 'In spirituality' }), body: entry.inSpirituality },
    { title: t('learn.sections.inHealth', { defaultValue: 'In health' }), body: entry.inHealth },
    { title: t('learn.sections.lifePath', { defaultValue: 'How the life path is calculated' }), body: entry.lifePathExplanation },
    { title: t('learn.sections.tarotConnection', { defaultValue: 'Tarot connection' }), body: entry.tarotConnection },
  ];
  if (entry.famousExamples?.length > 0) {
    sections.push({
      title: t('learn.sections.famousLifePath', { defaultValue: 'Famous life path {{number}}s', number: entry.number }),
      body: entry.famousExamples.join(sep),
    });
  }

  const related = source.relatedEntries
    .map((s) => numerologyEntries.find((x) => x.slug === s))
    .filter((x): x is NumerologyEntry => Boolean(x))
    .map((r) => ({ label: numberLabel(r.number), href: `/numerology/${r.slug}`, symbol: <Numeral value={r.number} /> }));

  return (
    <LearnEntryTemplate
      loading={!ready}
      eyebrow={
        entry.category === 'master'
          ? t('learn.numerology.lifePathMasterEyebrow', { defaultValue: 'Life path number (master)' })
          : t('learn.numerology.lifePathEyebrow', { defaultValue: 'Life path number' })
      }
      title={numberLabel(entry.number)}
      symbol={<Numeral value={entry.number} />}
      lede={entry.shortDescription}
      intro={entry.longDescription}
      facts={[
        { label: t('learn.facts.number', { defaultValue: 'Number' }), value: entry.number },
        { label: t('learn.facts.type', { defaultValue: 'Type' }), value: t(`learn.numerology.kinds.${entry.category}`, { defaultValue: KIND_LABEL[entry.category] }) },
        { label: t('learn.facts.majorArcana', { defaultValue: 'Major Arcana' }), value: entry.tarotMajorArcana },
      ]}
      sections={sections}
      faqs={entry.faqs}
      related={related}
      disclaimer="general"
      backHref="/numerology"
      backLabel={t('learn.numerology.backToHub', { defaultValue: 'All numbers' })}
    />
  );
}
