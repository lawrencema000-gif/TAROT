import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { Section } from '../components/ui';
import { LearnEntryTemplate, LearnEntryNotFound, LearnLinkList } from '../components/learn/LearnEntryTemplate';
import { getCrystalEntry, crystalEntries } from '../data/crystalsLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CrystalEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const entry = slug ? getCrystalEntry(slug) : null;

  useEffect(() => {
    if (!entry) return;
    setPageMeta(
      `${entry.name} — Meaning, Properties & How to Use`,
      entry.shortDescription,
    );
    removeJsonLd();
    const url = `https://tarotlife.app/crystals/${entry.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `${entry.name} — Crystal Meaning`,
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
        { '@type': 'ListItem', position: 2, name: 'Crystals', item: 'https://tarotlife.app/crystals' },
        { '@type': 'ListItem', position: 3, name: entry.name, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [entry]);

  if (!entry) {
    return <LearnEntryNotFound title="Crystal not found" backLabel="Back to crystals" onBack={() => navigate('/crystals')} />;
  }

  const lookup = (slugs: string[]) =>
    slugs
      .map((s) => crystalEntries.find((x) => x.slug === s))
      .filter((x): x is typeof crystalEntries[number] => Boolean(x));
  const related = lookup(entry.relatedEntries);
  const pairsWith = lookup(entry.pairsWith);

  return (
    <LearnEntryTemplate
      eyebrow="Crystal"
      title={entry.name}
      symbol={<Gem />}
      lede={entry.longDescription}
      facts={[
        { label: 'Color', value: entry.color },
        { label: 'Mohs hardness', value: entry.hardness },
        { label: 'Element', value: entry.element },
        { label: 'Chakras', value: entry.chakras.join(', ') },
        { label: 'Zodiac', value: entry.zodiac.join(', ') },
        { label: 'Category', value: capitalize(entry.category) },
      ]}
      sections={[
        { title: 'Metaphysical properties', body: entry.metaphysicalProperties },
        { title: 'In Love', body: entry.inLove },
        { title: 'In Healing', body: entry.inHealing },
        { title: 'In Spirituality', body: entry.inSpirituality },
        { title: 'How to use', body: entry.howToUse, list: true },
        { title: 'Cleansing methods', body: entry.cleansingMethods, list: true },
        { title: 'Tarot connection', body: entry.tarotConnection },
      ]}
      faqs={entry.faqs}
      related={related.map((r) => ({ label: r.name, href: `/crystals/${r.slug}` }))}
      backHref="/crystals"
      backLabel="All crystals"
    >
      {pairsWith.length > 0 && (
        <Section title="Pairs well with">
          <LearnLinkList links={pairsWith.map((c) => ({ label: c.name, href: `/crystals/${c.slug}` }))} />
        </Section>
      )}
    </LearnEntryTemplate>
  );
}
