import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getNumerologyEntry, numerologyEntries } from '../data/numerologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

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
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-mystic-100 mb-2">Number not found</h1>
        <button onClick={() => navigate('/numerology')} className="px-5 py-2 rounded-xl border border-mystic-700 text-mystic-300">
          <ArrowLeft className="w-4 h-4 inline mr-2" />Back to numerology
        </button>
      </div>
    );
  }

  const related = entry.relatedEntries
    .map((s) => numerologyEntries.find((x) => x.slug === s))
    .filter((x): x is typeof numerologyEntries[number] => Boolean(x));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <Link to="/numerology" className="inline-flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300 mb-3 no-underline">
        <ArrowLeft className="w-3 h-3" /> All numbers
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-5xl font-display text-gold leading-none">{entry.number}</span>
          <div>
            <span className="text-xs uppercase tracking-wider text-mystic-500">Life Path Number {entry.category === 'master' ? '(Master)' : ''}</span>
            <h1 className="font-display text-2xl text-mystic-100">Number {entry.number}</h1>
          </div>
        </div>
        <p className="text-mystic-300 leading-relaxed mt-3">{entry.longDescription}</p>
      </header>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-4">
        <h2 className="text-xs uppercase tracking-wider text-gold mb-2">Personality</h2>
        <p className="text-sm text-mystic-300 leading-relaxed">{entry.personality}</p>
      </section>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <ListSection title="Strengths" items={entry.strengths} accent="gold" />
        <ListSection title="Challenges" items={entry.challenges} accent="cosmic-blue" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Section title="In Love">{entry.inLove}</Section>
        <Section title="In Career">{entry.inCareer}</Section>
        <Section title="In Spirituality">{entry.inSpirituality}</Section>
        <Section title="In Health">{entry.inHealth}</Section>
      </div>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-gold mb-2">How life-path is calculated</h2>
        <p className="text-sm text-mystic-300 leading-relaxed">{entry.lifePathExplanation}</p>
      </section>

      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-4 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-gold mb-1">Tarot connection</h2>
        <p className="font-display text-lg text-mystic-100 mb-2">{entry.tarotMajorArcana}</p>
        <p className="text-sm text-mystic-300 leading-relaxed">{entry.tarotConnection}</p>
      </section>

      {entry.famousExamples?.length > 0 && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gold mb-2">Famous Life Path {entry.number}s</h2>
          <p className="text-sm text-mystic-300">{entry.famousExamples.join(', ')}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-display text-lg text-mystic-100 mb-3">Frequently asked questions</h2>
        <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-1 divide-y divide-mystic-800/60">
          {entry.faqs.map((f, i) => (
            <details key={i} className="px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-mystic-100">{f.q}</summary>
              <p className="mt-2 text-sm text-mystic-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-mystic-100 mb-3">Related</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/numerology/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <span className="text-sm text-mystic-200">Number {r.number}</span>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
      <h3 className="text-xs uppercase tracking-wider text-gold mb-2">{title}</h3>
      <p className="text-sm text-mystic-300 leading-relaxed">{children}</p>
    </div>
  );
}

function ListSection({ title, items, accent }: { title: string; items: string[]; accent: 'gold' | 'cosmic-blue' }) {
  const dotClass = accent === 'gold' ? 'text-gold' : 'text-cosmic-blue';
  return (
    <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
      <h3 className="text-sm font-medium text-mystic-100 mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-sm text-mystic-300 flex items-start gap-2">
            <span className={`mt-1 ${dotClass}`}>•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
