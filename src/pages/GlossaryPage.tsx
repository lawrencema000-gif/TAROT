import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { glossaryEntries, getGlossaryByCategory, type GlossaryCategory } from '../data/glossaryLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: { id: GlossaryCategory; label: string }[] = [
  { id: 'tarot', label: 'Tarot' },
  { id: 'astrology', label: 'Astrology' },
  { id: 'numerology', label: 'Numerology' },
  { id: 'spirituality', label: 'Spirituality' },
  { id: 'divination', label: 'Divination' },
  { id: 'general', label: 'General' },
];

export function GlossaryPage() {
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return glossaryEntries.filter(
      (e) => e.term.toLowerCase().includes(q) || e.shortDefinition.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-gold" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100">Glossary</h1>
        </div>
        <p className="text-sm text-mystic-400 max-w-xl">
          {glossaryEntries.length} terms across tarot, astrology, numerology, spirituality, and divination — with origins, examples, and cross-references.
        </p>
      </header>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mystic-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none text-sm"
        />
      </div>

      {filtered ? (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-mystic-500 mb-3">
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </h2>
          <div className="space-y-2">
            {filtered.map((entry) => (
              <GlossaryRow key={entry.slug} entry={entry} />
            ))}
          </div>
        </section>
      ) : (
        SECTIONS.map(({ id, label }) => {
          const entries = getGlossaryByCategory(id);
          if (!entries.length) return null;
          return (
            <section key={id} className="mb-8">
              <h2 className="font-display text-xl text-mystic-100 mb-3">{label}</h2>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <GlossaryRow key={entry.slug} entry={entry} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function GlossaryRow({ entry }: { entry: typeof glossaryEntries[number] }) {
  return (
    <Link
      to={`/glossary/${entry.slug}`}
      className="block p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-medium text-mystic-100">{entry.term}</span>
            {entry.pronunciation && <span className="text-[11px] text-mystic-500 italic">/{entry.pronunciation}/</span>}
          </div>
          <p className="text-xs text-mystic-400 leading-relaxed">{entry.shortDefinition}</p>
        </div>
      </div>
    </Link>
  );
}
