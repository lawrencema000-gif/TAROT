import { useEffect } from 'react';
import { Gem } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Page, PageHeader, Section } from '../components/ui';
import { LearnHubRow, LearnHubSkeleton } from '../components/learn/LearnEntryTemplate';
import { crystalEntries, getCrystalsByCategory, type CrystalCategory } from '../data/crystalsLearn';
import { learnEnumLabel, localizeCrystalEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: CrystalCategory[] = ['love', 'protection', 'abundance', 'clarity', 'healing', 'spirituality', 'grounding'];

/** English defaults; the keys live under learn.crystals.categories. */
const CATEGORY_TEXT: Record<CrystalCategory, { label: string; description: string }> = {
  love: { label: 'Love & relationships', description: 'Heart-chakra stones for connection and self-love.' },
  protection: { label: 'Protection & grounding', description: 'Stones traditionally used to deflect and root.' },
  abundance: { label: 'Abundance & manifestation', description: 'Stones tied to prosperity and success.' },
  clarity: { label: 'Clarity & communication', description: 'Stones for clear thought, truth and expression.' },
  healing: { label: 'Healing & calm', description: 'Stones for emotional healing and equilibrium.' },
  spirituality: { label: 'Spirituality & intuition', description: 'Stones for the upper chakras and inner work.' },
  grounding: { label: 'Grounding', description: 'Stones that root and steady.' },
};

export function CrystalsPage() {
  const { t } = useT('app');
  const { overlay, ready } = useLearnOverlay('crystals');

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

  const sep = t('learn.listSeparator', { defaultValue: ', ' });

  return (
    <Page spacing="lg">
      <PageHeader
        icon={<Gem />}
        title={t('learn.crystals.title', { defaultValue: 'Crystals' })}
        subtitle={t('learn.crystals.subtitle', {
          defaultValue: '{{count}} stones with metaphysical properties, chakra associations, Mohs hardness, cleansing methods and tarot connections.',
          count: crystalEntries.length,
        })}
      />

      {SECTIONS.map((id) => {
        const entries = getCrystalsByCategory(id);
        if (!entries.length) return null;
        return (
          <Section
            key={id}
            title={t(`learn.crystals.categories.${id}.label`, { defaultValue: CATEGORY_TEXT[id].label })}
            description={t(`learn.crystals.categories.${id}.description`, { defaultValue: CATEGORY_TEXT[id].description })}
            spacing="sm"
          >
            {ready ? (
              <div className="grid sm:grid-cols-2 gap-2">
                {entries.map((entry) => {
                  const shown = localizeCrystalEntry(entry, overlay);
                  return (
                    <LearnHubRow
                      key={entry.slug}
                      href={`/crystals/${entry.slug}`}
                      label={shown.name}
                      meta={`${entry.chakras.map((c) => learnEnumLabel('chakras', c)).join(sep)} · ${t('learn.crystals.mohs', { defaultValue: 'Mohs {{value}}', value: entry.hardness })}`}
                      glyph={<CrystalSwatch color={entry.color} />}
                    />
                  );
                })}
              </div>
            ) : (
              <LearnHubSkeleton rows={Math.min(entries.length, 6)} />
            )}
          </Section>
        );
      })}
    </Page>
  );
}

/** The stone's colour as a disc — the one place a literal colour says what the data says. */
function CrystalSwatch({ color }: { color: string }) {
  return <span className="block w-5 h-5 rounded-full" style={{ background: colorToHex(color) }} />;
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
