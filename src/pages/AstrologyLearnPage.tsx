import { useEffect, type ReactNode } from 'react';
import { Compass } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Page, PageHeader, Section } from '../components/ui';
import { LearnHubRow, LearnHubSkeleton } from '../components/learn/LearnEntryTemplate';
import { astrologyEntries, getAstroEntriesByCategory, type AstroCategory, type AstroEntry } from '../data/astrologyLearn';
import { localizeAstroEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { ZODIAC_ICONS, PLANET_ICONS } from '../components/icons';
import { ASPECT_GLYPHS, isAspectGlyphKey } from '../components/icons/AspectGlyphs';
import type { ZodiacSign, Planet } from '../types/astrology';

const SECTIONS: AstroCategory[] = ['sign', 'planet', 'house', 'aspect'];

/** English defaults for the four section headings; the keys live under learn.astrology.categories. */
const CATEGORY_TEXT: Record<AstroCategory, { label: string; description: string }> = {
  sign: { label: 'Zodiac signs', description: 'The twelve archetypal signs, from Aries to Pisces.' },
  planet: { label: 'Planets', description: 'Ten planets, from the Sun and Moon to the outer planets.' },
  house: { label: 'Houses', description: 'Twelve houses — the areas of life the planets activate.' },
  aspect: { label: 'Aspects', description: 'Relationships between planets — conjunctions, trines, squares.' },
};

/**
 * Every entry renders a drawn glyph: signs and planets from the icon set,
 * aspects from AspectGlyphs (the Unicode ☌ ⚹ ☐ △ ☍ ⚻ are colour emoji or
 * tofu on Android). Houses keep their Roman numeral, which is text and
 * which no platform emojifies.
 */
function astroEntryGlyph(entry: AstroEntry, size: number): ReactNode {
  if (entry.category === 'sign') {
    const Glyph = ZODIAC_ICONS[entry.name as ZodiacSign];
    if (Glyph) return <Glyph size={size} strokeWidth={1.5} />;
  }
  if (entry.category === 'planet') {
    const Glyph = PLANET_ICONS[entry.name as Planet];
    if (Glyph) return <Glyph size={size} strokeWidth={1.5} />;
  }
  if (entry.category === 'aspect' && isAspectGlyphKey(entry.slug)) {
    const Glyph = ASPECT_GLYPHS[entry.slug];
    return <Glyph size={size} />;
  }
  return entry.symbol;
}

export function AstrologyLearnPage() {
  const { t } = useT('app');
  const { overlay, ready } = useLearnOverlay('astrology');

  useEffect(() => {
    setPageMeta(
      'Astrology Learn — Signs, Planets, Houses & Aspects',
      `Complete astrology reference: 12 zodiac signs, 10 planets, 12 houses, and 6 major aspects. ${astrologyEntries.length} entries with rulerships, correspondences, and FAQ.`,
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/astrology',
      name: 'Astrology Learning Hub',
      description: 'Reference library covering signs, planets, houses, and aspects.',
      url: 'https://tarotlife.app/astrology',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: astrologyEntries.length,
        itemListElement: astrologyEntries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: e.name,
          url: `https://tarotlife.app/astrology/${e.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Astrology', item: 'https://tarotlife.app/astrology' },
      ],
    });
  }, []);

  return (
    <Page spacing="lg">
      <PageHeader
        icon={<Compass />}
        title={t('astrologyLearn.title', { defaultValue: 'Astrology' })}
        subtitle={t('learn.astrology.subtitle', {
          defaultValue: '{{count}} entries — every sign, planet, house and aspect with full rulerships, correspondences and frequently asked questions.',
          count: astrologyEntries.length,
        })}
      />

      {SECTIONS.map((id) => {
        const entries = getAstroEntriesByCategory(id);
        if (!entries.length) return null;
        return (
          <Section
            key={id}
            title={t(`learn.astrology.categories.${id}.label`, { defaultValue: CATEGORY_TEXT[id].label })}
            description={t(`learn.astrology.categories.${id}.description`, { defaultValue: CATEGORY_TEXT[id].description })}
            spacing="sm"
          >
            {ready ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {entries.map((entry) => (
                  <LearnHubRow
                    key={entry.slug}
                    href={`/astrology/${entry.slug}`}
                    label={localizeAstroEntry(entry, overlay).name}
                    glyph={astroEntryGlyph(entry, 20)}
                  />
                ))}
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
