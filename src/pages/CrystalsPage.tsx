import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gem, ChevronRight } from 'lucide-react';
import { crystalEntries, getCrystalsByCategory, type CrystalCategory } from '../data/crystalsLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: { id: CrystalCategory; label: string; description: string }[] = [
  { id: 'love', label: 'Love & Relationships', description: 'Heart-chakra stones for connection and self-love.' },
  { id: 'protection', label: 'Protection & Grounding', description: 'Stones traditionally used to deflect and root.' },
  { id: 'abundance', label: 'Abundance & Manifestation', description: 'Stones tied to prosperity and success.' },
  { id: 'clarity', label: 'Clarity & Communication', description: 'Stones for clear thought, truth, and expression.' },
  { id: 'healing', label: 'Healing & Calm', description: 'Stones for emotional healing and equilibrium.' },
  { id: 'spirituality', label: 'Spirituality & Intuition', description: 'Stones for the upper chakras and inner work.' },
];

export function CrystalsPage() {
  useEffect(() => {
    setPageMeta(
      'Crystal Meanings — 30 Stones Explained',
      `Comprehensive crystal reference: 30 stones with metaphysical properties, chakra associations, Mohs hardness, and tarot connections.`,
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/crystals',
      name: 'Crystals Learning Hub',
      description: 'Reference library covering 30 crystals across love, protection, abundance, clarity, healing, and spirituality.',
      url: 'https://tarotlife.app/crystals',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: crystalEntries.length,
        itemListElement: crystalEntries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: e.name,
          url: `https://tarotlife.app/crystals/${e.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Crystals', item: 'https://tarotlife.app/crystals' },
      ],
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Gem className="w-5 h-5 text-gold" />
          </div>
          <h1 className="heading-display-xl text-mystic-100">Crystals</h1>
        </div>
        <p className="text-sm text-mystic-400 max-w-xl">
          {crystalEntries.length} stones with metaphysical properties, chakra associations, Mohs hardness, cleansing methods, and tarot connections.
        </p>
      </header>

      {SECTIONS.map(({ id, label, description }) => {
        const entries = getCrystalsByCategory(id);
        if (!entries.length) return null;
        return (
          <section key={id} className="mb-8">
            <h2 className="font-display text-xl text-mystic-100 mb-1">{label}</h2>
            <p className="text-xs text-mystic-500 mb-3">{description}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {entries.map((entry) => (
                <Link
                  key={entry.slug}
                  to={`/crystals/${entry.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: colorToHex(entry.color) }} aria-hidden />
                    <div className="min-w-0">
                      <div className="text-sm text-mystic-100 font-medium">{entry.name}</div>
                      <div className="text-xs text-mystic-500 truncate">{entry.chakras.join(', ')} · Mohs {entry.hardness}</div>
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

function colorToHex(color: string): string {
  const c = color.toLowerCase();
  if (c.includes('pink')) return '#f7c8d4';
  if (c.includes('rose')) return '#e9b9c5';
  if (c.includes('red')) return '#c44545';
  if (c.includes('orange')) return '#e07a35';
  if (c.includes('yellow') || c.includes('gold')) return '#e6c668';
  if (c.includes('green')) return '#5d9e5a';
  if (c.includes('blue')) return '#4d7eb0';
  if (c.includes('purple') || c.includes('violet') || c.includes('amethyst')) return '#9b7ec4';
  if (c.includes('white') || c.includes('clear') || c.includes('selenite')) return '#e8e6f0';
  if (c.includes('black')) return '#2a2a3a';
  if (c.includes('grey') || c.includes('gray') || c.includes('silver')) return '#7a7a8a';
  if (c.includes('brown') || c.includes('tiger')) return '#8a6a4a';
  return '#8a7aa0';
}
