import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useT } from '../i18n/useT';
import { LearnEntryTemplate, LearnEntryNotFound } from '../components/learn/LearnEntryTemplate';
import { getGlossaryEntry, glossaryEntries, type GlossaryCategory, type GlossaryEntry } from '../data/glossaryLearn';
import { getLocale } from '../i18n/config';
import { localizeGlossaryEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

/** English defaults; the keys live under learn.glossary.categories. */
const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  tarot: 'Tarot',
  astrology: 'Astrology',
  numerology: 'Numerology',
  spirituality: 'Spirituality',
  divination: 'Divination',
  general: 'General',
};

export function GlossaryEntryPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const source = slug ? getGlossaryEntry(slug) : null;
  const { overlay, ready } = useLearnOverlay('glossary');

  useEffect(() => {
    if (!source) return;
    setPageMeta(`${source.term} — Definition`, source.shortDefinition);
    removeJsonLd();
    const url = `https://tarotlife.app/glossary/${source.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `${url}#term`,
      name: source.term,
      description: source.longDefinition,
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
        { '@type': 'ListItem', position: 3, name: source.term, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [source]);

  if (!source) {
    return (
      <LearnEntryNotFound
        title={t('learn.glossary.notFound', { defaultValue: 'Term not found' })}
        backLabel={t('learn.glossary.backToHub', { defaultValue: 'All terms' })}
        onBack={() => navigate('/glossary')}
      />
    );
  }

  const entry = localizeGlossaryEntry(source, overlay);
  const sep = t('learn.listSeparator', { defaultValue: ', ' });
  // English phonetics: shown in English only, never translated.
  const pronunciation = getLocale() === 'en' && entry.pronunciation ? `/${entry.pronunciation}/` : undefined;

  const related = source.relatedEntries
    .map((s) => glossaryEntries.find((x) => x.slug === s))
    .filter((x): x is GlossaryEntry => Boolean(x))
    .map((r) => ({ label: localizeGlossaryEntry(r, overlay).term, href: `/glossary/${r.slug}` }));

  return (
    <LearnEntryTemplate
      loading={!ready}
      eyebrow={t(`learn.glossary.categories.${entry.category}`, { defaultValue: CATEGORY_LABEL[entry.category] })}
      title={entry.term}
      symbol={<BookOpen />}
      lede={entry.shortDefinition}
      intro={entry.longDefinition}
      facts={[
        { label: t('learn.facts.pronunciation', { defaultValue: 'Pronunciation' }), value: pronunciation },
        { label: t('learn.facts.alsoKnownAs', { defaultValue: 'Also known as' }), value: entry.alsoKnownAs?.join(sep) },
      ]}
      sections={entry.origin ? [{ title: t('learn.sections.origin', { defaultValue: 'Origin' }), body: entry.origin }] : []}
      related={related}
      relatedTitle={t('learn.relatedTerms', { defaultValue: 'Related terms' })}
      backHref="/glossary"
      backLabel={t('learn.glossary.backToHub', { defaultValue: 'All terms' })}
    >
      {entry.example && (
        <section>
          <h2 className="heading-display-md heading-strong text-title">{t('learn.sections.usedInContext', { defaultValue: 'Used in context' })}</h2>
          <blockquote className="reading-quote mt-2 !mb-0">{entry.example}</blockquote>
        </section>
      )}
    </LearnEntryTemplate>
  );
}
