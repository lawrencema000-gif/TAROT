import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { useT } from '../i18n/useT';
import { LearnEntryTemplate, LearnEntryNotFound } from '../components/learn/LearnEntryTemplate';
import { getCrystalEntry, crystalEntries, type CrystalCategory, type CrystalEntry } from '../data/crystalsLearn';
import { learnEnumLabel, learnSignName, localizeCrystalEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

/** English defaults; the keys live under learn.crystals.categories.*.label. */
const CATEGORY_LABEL: Record<CrystalCategory, string> = {
  love: 'Love & relationships',
  protection: 'Protection & grounding',
  abundance: 'Abundance & manifestation',
  clarity: 'Clarity & communication',
  healing: 'Healing & calm',
  spirituality: 'Spirituality & intuition',
  grounding: 'Grounding',
};

export function CrystalEntryPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const source = slug ? getCrystalEntry(slug) : null;
  const { overlay, ready } = useLearnOverlay('crystals');

  useEffect(() => {
    if (!source) return;
    setPageMeta(`${source.name} — Meaning, Properties & How to Use`, source.shortDescription);
    removeJsonLd();
    const url = `https://tarotlife.app/crystals/${source.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `${source.name} — Crystal Meaning`,
      description: source.longDescription,
      url,
      keywords: source.keywords.join(', '),
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      datePublished: '2026-04-29',
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: source.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 3, name: source.name, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [source]);

  if (!source) {
    return (
      <LearnEntryNotFound
        title={t('learn.crystals.notFound', { defaultValue: 'Crystal not found' })}
        backLabel={t('learn.crystals.backToHub', { defaultValue: 'All crystals' })}
        onBack={() => navigate('/crystals')}
      />
    );
  }

  const entry = localizeCrystalEntry(source, overlay);
  const sep = t('learn.listSeparator', { defaultValue: ', ' });

  const lookup = (slugs: string[]) =>
    slugs
      .map((s) => crystalEntries.find((x) => x.slug === s))
      .filter((x): x is CrystalEntry => Boolean(x))
      .map((c) => ({ label: localizeCrystalEntry(c, overlay).name, href: `/crystals/${c.slug}` }));
  const related = lookup(source.relatedEntries);
  const pairsWith = lookup(source.pairsWith);

  return (
    <LearnEntryTemplate
      loading={!ready}
      eyebrow={t('learn.crystals.kind', { defaultValue: 'Crystal' })}
      title={entry.name}
      symbol={<Gem />}
      lede={entry.shortDescription}
      intro={entry.longDescription}
      facts={[
        { label: t('learn.facts.color', { defaultValue: 'Color' }), value: entry.color },
        { label: t('learn.facts.hardness', { defaultValue: 'Mohs hardness' }), value: entry.hardness },
        { label: t('learn.facts.element', { defaultValue: 'Element' }), value: learnEnumLabel('elements', entry.element) },
        { label: t('learn.facts.chakras', { defaultValue: 'Chakras' }), value: entry.chakras.map((c) => learnEnumLabel('chakras', c)).join(sep) },
        { label: t('learn.facts.zodiac', { defaultValue: 'Zodiac' }), value: entry.zodiac.map(learnSignName).join(sep) },
        { label: t('learn.facts.category', { defaultValue: 'Category' }), value: t(`learn.crystals.categories.${entry.category}.label`, { defaultValue: CATEGORY_LABEL[entry.category] }) },
      ]}
      sections={[
        { title: t('learn.sections.metaphysicalProperties', { defaultValue: 'Metaphysical properties' }), body: entry.metaphysicalProperties },
        { title: t('learn.sections.inLove', { defaultValue: 'In love' }), body: entry.inLove },
        { title: t('learn.sections.inHealing', { defaultValue: 'In healing' }), body: entry.inHealing },
        { title: t('learn.sections.inSpirituality', { defaultValue: 'In spirituality' }), body: entry.inSpirituality },
        { title: t('learn.sections.howToUse', { defaultValue: 'How to use' }), body: entry.howToUse, list: true },
        { title: t('learn.sections.cleansingMethods', { defaultValue: 'Cleansing methods' }), body: entry.cleansingMethods, list: true },
        { title: t('learn.sections.tarotConnection', { defaultValue: 'Tarot connection' }), body: entry.tarotConnection },
      ]}
      faqs={entry.faqs}
      linkSections={pairsWith.length > 0 ? [{ title: t('learn.sections.pairsWith', { defaultValue: 'Pairs well with' }), links: pairsWith }] : []}
      related={related}
      disclaimer="general"
      backHref="/crystals"
      backLabel={t('learn.crystals.backToHub', { defaultValue: 'All crystals' })}
    />
  );
}
