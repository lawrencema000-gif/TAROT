import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Page, PageHeader, Section, EmptyState, Input } from '../components/ui';
import { LearnHubSkeleton } from '../components/learn/LearnEntryTemplate';
import { glossaryEntries, getGlossaryByCategory, type GlossaryCategory, type GlossaryEntry } from '../data/glossaryLearn';
import { getLocale } from '../i18n/config';
import { localizeGlossaryEntry, useLearnOverlay, type LearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: GlossaryCategory[] = ['tarot', 'astrology', 'numerology', 'spirituality', 'divination', 'general'];

/** English defaults; the keys live under learn.glossary.categories. */
const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  tarot: 'Tarot',
  astrology: 'Astrology',
  numerology: 'Numerology',
  spirituality: 'Spirituality',
  divination: 'Divination',
  general: 'General',
};

export function GlossaryPage() {
  const { t } = useT('app');
  const [query, setQuery] = useState('');
  const { overlay, ready } = useLearnOverlay('glossary');

  useEffect(() => {
    setPageMeta(
      'Glossary — Tarot, Astrology, Numerology Terms',
      `${glossaryEntries.length} terms with definitions across tarot, astrology, numerology, spirituality, and divination.`,
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/glossary',
      name: 'Glossary',
      description: `Reference dictionary of ${glossaryEntries.length} terms.`,
      url: 'https://tarotlife.app/glossary',
      mainEntity: {
        '@type': 'DefinedTermSet',
        name: 'Arcana Glossary',
        hasDefinedTerm: glossaryEntries.map((e) => ({
          '@type': 'DefinedTerm',
          name: e.term,
          description: e.shortDefinition,
          url: `https://tarotlife.app/glossary/${e.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Glossary', item: 'https://tarotlife.app/glossary' },
      ],
    });
  }, []);

  // Search matches the term and short definition in the language on screen
  // AND in English, so a Japanese reader who types "querent" still finds 相談者.
  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return glossaryEntries.filter((e) => {
      const shown = localizeGlossaryEntry(e, overlay);
      return [e.term, e.shortDefinition, shown.term, shown.shortDefinition].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, overlay]);

  const placeholder = t('learn.glossary.search.placeholder', { defaultValue: 'Search terms' });

  return (
    <Page spacing="lg">
      <PageHeader
        icon={<BookOpen />}
        title={t('learn.glossary.title', { defaultValue: 'Glossary' })}
        subtitle={t('learn.glossary.subtitle', {
          defaultValue: '{{count}} terms across tarot, astrology, numerology, spirituality and divination, with origins, examples and cross-references.',
          count: glossaryEntries.length,
        })}
      />

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        icon={<Search />}
        autoComplete="off"
      />

      {!ready ? (
        <LearnHubSkeleton rows={6} />
      ) : filtered ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title={t('learn.glossary.search.noMatch', { defaultValue: 'No terms match' })}
            description={t('learn.glossary.search.noMatchDesc', {
              defaultValue: 'Nothing in the glossary matches “{{query}}”. Try a shorter word.',
              query: query.trim(),
            })}
          />
        ) : (
          <Section
            eyebrow={t('learn.glossary.search.matches', { defaultValue: '{{count}} matches', count: filtered.length })}
            spacing="sm"
            contentClassName="space-y-2"
          >
            {filtered.map((entry) => (
              <GlossaryRow key={entry.slug} entry={entry} overlay={overlay} />
            ))}
          </Section>
        )
      ) : (
        SECTIONS.map((id) => {
          const entries = getGlossaryByCategory(id);
          if (!entries.length) return null;
          return (
            <Section
              key={id}
              title={t(`learn.glossary.categories.${id}`, { defaultValue: CATEGORY_LABEL[id] })}
              spacing="sm"
              contentClassName="space-y-2"
            >
              {entries.map((entry) => (
                <GlossaryRow key={entry.slug} entry={entry} overlay={overlay} />
              ))}
            </Section>
          );
        })
      )}
    </Page>
  );
}

const rowClass =
  'block px-4 py-3 rounded-control border border-mystic-700 bg-mystic-850 no-underline ' +
  'transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-500 active:bg-mystic-800 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950';

/** A term with its one-line definition. The pronunciation is English phonetics and shows only in English. */
function GlossaryRow({ entry, overlay }: { entry: GlossaryEntry; overlay: LearnOverlay<'glossary'> | null }) {
  const shown = localizeGlossaryEntry(entry, overlay);
  const showPronunciation = getLocale() === 'en' && Boolean(entry.pronunciation);
  return (
    <Link to={`/glossary/${entry.slug}`} className={rowClass}>
      <span className="flex items-baseline gap-2 min-w-0">
        <span className="text-ui font-medium text-mystic-100 truncate">{shown.term}</span>
        {showPronunciation && <span className="text-caption text-mystic-500 italic shrink-0">/{entry.pronunciation}/</span>}
      </span>
      <span className="block text-meta text-mystic-400 mt-0.5 line-clamp-2">{shown.shortDefinition}</span>
    </Link>
  );
}
