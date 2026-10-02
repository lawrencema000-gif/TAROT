import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { Button, Chip, ListRow, ListRowGroup, PageHeader, Section } from '../components/ui';
import { SpreadGlyph } from '../components/icons/SpreadGlyph';
import { allSpreads as tarotSpreads, getSpreadLayout, type SpreadCategory } from '../data/tarotSpreads';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

const CATEGORY_ORDER: { id: SpreadCategory; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Classic spreads for any question or open inquiry.' },
  { id: 'love', label: 'Love & relationships', description: 'Spreads tuned to romance, partnership, and connection.' },
  { id: 'career', label: 'Career & money', description: 'Work decisions, financial flow, and professional direction.' },
  { id: 'daily', label: 'Daily practice', description: 'Quick spreads for ritual check-ins and weekly forecasts.' },
  { id: 'spiritual', label: 'Spiritual & shadow', description: 'Inner work, integration, and higher-self guidance.' },
  { id: 'lunar', label: 'Lunar cycles', description: 'New-moon intention setting and full-moon release.' },
  { id: 'decision', label: 'Decisions', description: 'Crossroads, yes/no nuance, and choice clarification.' },
];

/** The chip row's short labels. */
const CHIP_LABEL: Record<SpreadCategory, string> = {
  general: 'General',
  love: 'Love',
  career: 'Career',
  daily: 'Daily',
  spiritual: 'Spiritual',
  lunar: 'Lunar',
  decision: 'Decision',
};

/**
 * /spreads — the catalogue as the reference app lays it out: category
 * chips over compact two-line rows, each with a glyph of the spread's
 * shape, its name, one line, and the card count. Forty-one identical
 * cards eighteen thousand pixels tall became this (R5 p-2).
 */
export function SpreadsPage() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const [category, setCategory] = useState<SpreadCategory | 'all'>('all');

  useEffect(() => {
    setPageMeta(
      'Tarot Spreads — Complete Library',
      'Comprehensive tarot spread library: Celtic Cross, three-card, love, career, lunar cycles, shadow work, and more. Position-by-position meanings.',
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://tarotlife.app/spreads',
      name: 'Tarot Spreads Library',
      description: `${tarotSpreads.length} tarot spreads with position meanings, example questions, and FAQs.`,
      url: 'https://tarotlife.app/spreads',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tarotSpreads.length,
        itemListElement: tarotSpreads.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.name,
          url: `https://tarotlife.app/spreads/${s.slug}`,
        })),
      },
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tarotlife.app' },
        { '@type': 'ListItem', position: 2, name: 'Tarot Spreads', item: 'https://tarotlife.app/spreads' },
      ],
    });
  }, []);

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.filter((c) => category === 'all' || c.id === category)
        .map((c) => ({ ...c, spreads: tarotSpreads.filter((s) => s.category === c.id) }))
        .filter((c) => c.spreads.length > 0),
    [category],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      <PageHeader
        icon={<Layers />}
        title={t('spreads.pageTitle', { defaultValue: 'Tarot spreads' })}
        subtitle={t('spreads.pageSubtitle', {
          defaultValue: '{{n}} spreads — from a single daily card to the ten-card Celtic Cross — each with position-by-position meanings, when to use it, and example questions.',
          n: tarotSpreads.length,
        })}
      />
      <Button variant="outline" size="sm" onClick={() => navigate('/spreads/builder')}>
        <TarotCardIcon className="w-4 h-4" />
        {t('spreads.designYourOwn', { defaultValue: 'Design your own spread' })}
      </Button>

      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max pb-1" role="group" aria-label={t('spreads.categories', { defaultValue: 'Categories' })}>
          <Chip
            size="sm"
            label={t('readings.categories.all', { defaultValue: 'All' })}
            selected={category === 'all'}
            onSelect={() => setCategory('all')}
          />
          {CATEGORY_ORDER.map((c) => (
            <Chip
              key={c.id}
              size="sm"
              label={t(`readings.categories.${c.id}`, { defaultValue: CHIP_LABEL[c.id] })}
              selected={category === c.id}
              onSelect={() => setCategory(c.id)}
            />
          ))}
        </div>
      </div>

      {sections.map(({ id, label, description, spreads }) => (
        <Section key={id} title={label} description={description} spacing="sm">
          {/* Real anchors for the crawler; a plain click stays in the router. */}
          <ListRowGroup
            onClick={(e) => {
              const a = (e.target as HTMLElement).closest('a[href^="/spreads/"]');
              if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              navigate(a.getAttribute('href')!);
            }}
          >
            {spreads.map((spread) => (
              <ListRow
                key={spread.slug}
                href={`/spreads/${spread.slug}`}
                icon={<SpreadGlyph layout={getSpreadLayout(spread)} className="text-gold" />}
                label={spread.name}
                meta={<span className="line-clamp-2">{spread.shortDescription}</span>}
                value={t('readings.cardCount', { count: spread.cardCount, defaultValue: '{{count}} cards' })}
              />
            ))}
          </ListRowGroup>
        </Section>
      ))}

    </div>
  );
}
