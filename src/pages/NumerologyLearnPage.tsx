import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hash, ChevronRight } from 'lucide-react';
import { numerologyEntries, getNumerologyByCategory, type NumerologyCategory } from '../data/numerologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: { id: NumerologyCategory; label: string; description: string }[] = [
  { id: 'core', label: 'Core Numbers (1–9)', description: 'The foundation of every numerological reading.' },
  { id: 'master', label: 'Master Numbers (11, 22, 33)', description: 'Numbers of heightened spiritual significance — never reduced.' },
];

export function NumerologyLearnPage() {
  useEffect(() => {
    setPageMeta(
      'Numerology — Life Path Numbers Explained',
      `Complete numerology reference: 9 core numbers + 3 master numbers (11, 22, 33). Pythagorean tradition, life-path meanings, tarot correspondences.`,
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/numerology',
      name: 'Numerology Learning Hub',
      description: 'Reference library covering core numbers (1-9) and master numbers (11, 22, 33).',
      url: 'https://tarotlife.app/numerology',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: numerologyEntries.length,
        itemListElement: numerologyEntries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: e.number,
          url: `https://tarotlife.app/numerology/${e.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Numerology', item: 'https://tarotlife.app/numerology' },
      ],
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Hash className="w-5 h-5 text-gold" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100">Numerology</h1>
        </div>
        <p className="text-sm text-mystic-400 max-w-xl">
          {numerologyEntries.length} entries — every life-path number with personality, strengths, challenges, tarot correspondence, and FAQ. Pythagorean tradition.
        </p>
      </header>

      {SECTIONS.map(({ id, label, description }) => {
        const entries = getNumerologyByCategory(id);
        if (!entries.length) return null;
        return (
          <section key={id} className="mb-8">
            <h2 className="font-display text-xl text-mystic-100 mb-1">{label}</h2>
            <p className="text-xs text-mystic-500 mb-3">{description}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {entries.map((entry) => (
                <Link
                  key={entry.slug}
                  to={`/numerology/${entry.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-display text-gold w-8 text-center">{entry.number}</span>
                    <div>
                      <div className="text-sm text-mystic-100 font-medium">Number {entry.number}</div>
                      <div className="text-xs text-mystic-500 truncate">{entry.tarotMajorArcana}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
