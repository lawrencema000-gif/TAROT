import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ChevronRight } from 'lucide-react';
import { tarotSpreads, type SpreadCategory } from '../data/tarotSpreads';
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
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-gold" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100">Tarot Spreads</h1>
        </div>
        <p className="text-sm text-mystic-400 max-w-xl">
          {tarotSpreads.length} spreads — from a single daily card to the 10-card Celtic Cross — with position-by-position meanings, when to use each, and example questions.
        </p>
      </header>

      {CATEGORY_ORDER.map(({ id, label, description }) => {
        const inCat = tarotSpreads.filter((s) => s.category === id);
        if (!inCat.length) return null;
        return (
          <section key={id} className="mb-8">
            <h2 className="font-display text-xl text-mystic-100 mb-1">{label}</h2>
            <p className="text-xs text-mystic-500 mb-3">{description}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {inCat.map((spread) => (
                <Link
                  key={spread.slug}
                  to={`/spreads/${spread.slug}`}
                  className="block rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 hover:border-gold/40 hover:bg-mystic-900/60 transition-colors no-underline"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-medium text-mystic-100">{spread.name}</h3>
                    <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-mystic-400 mb-2 leading-relaxed">{spread.shortDescription}</p>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                    <span className="text-gold">{spread.cardCount} cards</span>
                    <span className="text-mystic-600">·</span>
                    <span className="text-mystic-500">{spread.difficulty}</span>
                    <span className="text-mystic-600">·</span>
                    <span className="text-mystic-500">~{spread.durationMin} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
