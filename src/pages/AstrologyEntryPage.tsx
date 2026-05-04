import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getAstroEntry, astrologyEntries } from '../data/astrologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const CATEGORY_LABELS: Record<string, string> = {
  sign: 'Zodiac Sign',
  planet: 'Planet',
  house: 'House',
  aspect: 'Aspect',
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
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="heading-display-lg text-mystic-100 mb-2">Entry not found</h1>
        <button onClick={() => navigate('/astrology')} className="px-5 py-2 rounded-xl border border-mystic-700 text-mystic-300 hover:text-mystic-100">
          <ArrowLeft className="w-4 h-4 inline mr-2" />Back to Astrology hub
        </button>
      </div>
    );
  }

  const related = entry.relatedEntries
    .map((s) => astrologyEntries.find((x) => x.slug === s))
    .filter((x): x is typeof astrologyEntries[number] => Boolean(x));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <Link to="/astrology" className="inline-flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300 mb-3 no-underline">
        <ArrowLeft className="w-3 h-3" /> All astrology entries
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl text-gold">{entry.symbol}</span>
          <div>
            <span className="text-xs uppercase tracking-wider text-mystic-500">{CATEGORY_LABELS[entry.category]}</span>
            <h1 className="heading-display-xl text-mystic-100">{entry.name}</h1>
          </div>
        </div>
        <p className="text-mystic-300 leading-relaxed">{entry.longDescription}</p>
      </header>

      {/* Sign-specific facts */}
      {entry.category === 'sign' && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="Element" value={entry.element ?? '—'} />
            <Fact label="Modality" value={entry.modality ?? '—'} />
            <Fact label="Ruler" value={entry.rulingPlanet ?? '—'} />
            <Fact label="Dates" value={entry.dates ?? '—'} />
            <Fact label="Body" value={entry.bodyPart ?? '—'} />
          </div>
        </section>
      )}

      {/* Planet-specific facts */}
      {entry.category === 'planet' && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="Type" value={entry.planetType ?? '—'} />
            <Fact label="Rules" value={entry.rules?.join(', ') ?? '—'} />
            <Fact label="Exalted" value={entry.exalted ?? '—'} />
          </div>
        </section>
      )}

      {/* House-specific facts */}
      {entry.category === 'house' && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="House" value={String(entry.houseNumber ?? '—')} />
            <Fact label="Domain" value={entry.domain ?? '—'} />
            <Fact label="Natural sign" value={entry.naturalSign ?? '—'} />
          </div>
        </section>
      )}

      {/* Aspect-specific facts */}
      {entry.category === 'aspect' && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="Angle" value={`${entry.aspectAngle ?? '—'}°`} />
            <Fact label="Nature" value={entry.aspectNature ?? '—'} />
          </div>
        </section>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Section title="In Love">{entry.inLove}</Section>
        <Section title="In Career">{entry.inCareer}</Section>
        <Section title="In Spirituality">{entry.inSpirituality}</Section>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <ListSection title="Strengths" items={entry.strengths} accent="gold" />
        <ListSection title="Challenges" items={entry.challenges} accent="cosmic-blue" />
      </div>

      {entry.famousExamples && entry.famousExamples.length > 0 && (
        <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
          <h2 className="text-sm font-medium text-mystic-300 mb-2">Famous examples</h2>
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
              <Link key={r.slug} to={`/astrology/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-base text-gold">{r.symbol}</span>
                  <span className="text-sm text-mystic-200">{r.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-mystic-500" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-mystic-500 mb-0.5">{label}</div>
      <div className="text-mystic-100">{value}</div>
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
