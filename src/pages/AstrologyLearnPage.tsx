import { useEffect } from 'react';
import { useT } from '../i18n/useT';
import { Link } from 'react-router-dom';
import { Compass, ChevronRight } from 'lucide-react';
import { PageHeader, Section } from '../components/ui';
import { astrologyEntries, getAstroEntriesByCategory, type AstroCategory } from '../data/astrologyLearn';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const SECTIONS: { id: AstroCategory; label: string; description: string }[] = [
  { id: 'sign', label: 'Zodiac Signs', description: 'The 12 archetypal signs — from Aries to Pisces.' },
  { id: 'planet', label: 'Planets', description: '10 planets including Sun, Moon, and outer planets.' },
  { id: 'house', label: 'Houses', description: '12 houses — life areas the planets activate.' },
  { id: 'aspect', label: 'Aspects', description: 'Relationships between planets — conjunctions, trines, squares.' },
];

export function AstrologyLearnPage() {
  const { t } = useT('app');
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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <PageHeader
        className="mb-8"
        icon={<Compass />}
        title={t('astrologyLearn.title', { defaultValue: 'Astrology' })}
        subtitle={`${astrologyEntries.length} entries — every sign, planet, house, and aspect with full rulerships, correspondences, and frequently asked questions.`}
      />

      {SECTIONS.map(({ id, label, description }) => {
        const entries = getAstroEntriesByCategory(id);
        if (!entries.length) return null;
        return (
          <Section key={id} title={label} description={description} spacing="sm" className="mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {entries.map((entry) => (
                <Link
                  key={entry.slug}
                  to={`/astrology/${entry.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-mystic-800/60 bg-mystic-900/40 hover:border-gold/40 transition-colors no-underline"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-gold w-6 text-center">{entry.symbol}</span>
                    <span className="text-sm text-mystic-200">{entry.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-mystic-500" />
                </Link>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
