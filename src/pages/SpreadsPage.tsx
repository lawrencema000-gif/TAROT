import { useEffect } from 'react';
import { useT } from '../i18n/useT';
import { Link } from 'react-router-dom';
import { Layers, ChevronRight } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { PageHeader, Section } from '../components/ui';
import { allSpreads as tarotSpreads, type SpreadCategory } from '../data/tarotSpreads';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const CATEGORY_ORDER: { id: SpreadCategory; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Classic spreads for any question or open inquiry.' },
  { id: 'love', label: 'Love & Relationships', description: 'Spreads tuned to romance, partnership, and connection.' },
  { id: 'career', label: 'Career & Money', description: 'Work decisions, financial flow, and professional direction.' },
  { id: 'daily', label: 'Daily Practice', description: 'Quick spreads for ritual check-ins and weekly forecasts.' },
  { id: 'spiritual', label: 'Spiritual & Shadow', description: 'Inner work, integration, and higher-self guidance.' },
  { id: 'lunar', label: 'Lunar Cycles', description: 'New-moon intention setting and full-moon release.' },
  { id: 'decision', label: 'Decisions', description: 'Crossroads, yes/no nuance, and choice clarification.' },
];

export function SpreadsPage() {
  const { t } = useT('app');
  useEffect(() => {
    setPageMeta(
      'Tarot Spreads — Complete Library',
      'Comprehensive tarot spread library: Celtic Cross, three-card, love, career, lunar cycles, shadow work, and more. Position-by-position meanings.',
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/spreads',
      name: 'Tarot Spreads Library',
      description: `${tarotSpreads.length} tarot spreads with position meanings, example questions, and FAQs.`,
      url: 'https://tarotlife.app/spreads',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tarotSpreads.length,
        itemListElement: tarotSpreads.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.name,
          url: `https://tarotlife.app/spreads/${s.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Tarot Spreads', item: 'https://tarotlife.app/spreads' },
      ],
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-8">
        <PageHeader
          icon={<Layers />}
          title={t('spreads.pageTitle', { defaultValue: 'Tarot spreads' })}
          subtitle={`${tarotSpreads.length} spreads — from a single daily card to the 10-card Celtic Cross — with position-by-position meanings, when to use each, and example questions.`}
        />
        <Link to="/spreads/builder" className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-xl border border-gold/30 bg-gold/10 text-gold text-xs no-underline hover:bg-gold/15">
          <TarotCardIcon className="w-3.5 h-3.5" />
          Design your own custom spread
        </Link>
      </div>

      {CATEGORY_ORDER.map(({ id, label, description }) => {
        const inCat = tarotSpreads.filter((s) => s.category === id);
        if (!inCat.length) return null;
        return (
          <Section key={id} className="mb-8" title={label} description={description} spacing="sm">
            <div className="grid sm:grid-cols-2 gap-3">
              {inCat.map((spread) => (
                <Link
                  key={spread.slug}
                  to={`/spreads/${spread.slug}`}
                  className="block rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 hover:border-gold/40 hover:bg-mystic-900/60 transition-colors no-underline"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="heading-display-md text-mystic-100">{spread.name}</h3>
                    <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="reading-copy mb-2">{spread.shortDescription}</p>
                  <div className="flex items-center gap-2 text-meta uppercase tracking-wider">
                    <span className="text-gold">{spread.cardCount} cards</span>
                    <span className="text-mystic-600">·</span>
                    <span className="text-mystic-400">{spread.difficulty}</span>
                    <span className="text-mystic-600">·</span>
                    <span className="text-mystic-400">~{spread.durationMin} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
