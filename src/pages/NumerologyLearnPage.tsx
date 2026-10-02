import { useEffect } from 'react';
import { Hash } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Page, PageHeader, Section } from '../components/ui';
import { LearnHubRow, LearnHubSkeleton } from '../components/learn/LearnEntryTemplate';
import { numerologyEntries, getNumerologyByCategory, type NumerologyCategory } from '../data/numerologyLearn';
import { localizeNumerologyEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: NumerologyCategory[] = ['core', 'master'];

/** English defaults; the keys live under learn.numerology.categories. */
const CATEGORY_TEXT: Record<NumerologyCategory, { label: string; description: string }> = {
  core: { label: 'Core numbers (1–9)', description: 'The foundation of every numerological reading.' },
  master: { label: 'Master numbers (11, 22, 33)', description: 'Numbers of heightened spiritual significance, never reduced.' },
  compound: { label: 'Compound numbers', description: 'Two-digit numbers read before they are reduced.' },
};

/** The number itself, in Inter: numerals are never set in the display serif. */
function Numeral({ value }: { value: string }) {
  return <span className="font-body text-ui font-semibold tabular-nums leading-none">{value}</span>;
}

export function NumerologyLearnPage() {
  const { t } = useT('app');
  const { overlay, ready } = useLearnOverlay('numerology');

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
    <Page spacing="lg">
      <PageHeader
        icon={<Hash />}
        title={t('learn.numerology.title', { defaultValue: 'Numerology' })}
        subtitle={t('learn.numerology.subtitle', {
          defaultValue: '{{count}} entries — every life path number with personality, strengths, challenges, tarot correspondence and FAQ, in the Pythagorean tradition.',
          count: numerologyEntries.length,
        })}
      />

      {SECTIONS.map((id) => {
        const entries = getNumerologyByCategory(id);
        if (!entries.length) return null;
        return (
          <Section
            key={id}
            title={t(`learn.numerology.categories.${id}.label`, { defaultValue: CATEGORY_TEXT[id].label })}
            description={t(`learn.numerology.categories.${id}.description`, { defaultValue: CATEGORY_TEXT[id].description })}
            spacing="sm"
          >
            {ready ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {entries.map((entry) => {
                  const shown = localizeNumerologyEntry(entry, overlay);
                  return (
                    <LearnHubRow
                      key={entry.slug}
                      href={`/numerology/${entry.slug}`}
                      label={t('learn.numerology.numberLabel', { defaultValue: 'Number {{number}}', number: entry.number })}
                      meta={shown.tarotMajorArcana}
                      glyph={<Numeral value={entry.number} />}
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
