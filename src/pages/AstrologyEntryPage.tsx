import { useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/useT';
import { LearnEntryTemplate, LearnEntryNotFound, type LearnEntryFact, type LearnEntrySection } from '../components/learn/LearnEntryTemplate';
import { getAstroEntry, astrologyEntries, type AstroCategory, type AstroEntry } from '../data/astrologyLearn';
import { learnEnumLabel, learnPlanetName, learnSignName, localizeAstroEntry, useLearnOverlay } from '../i18n/learnOverlay';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { ZODIAC_ICONS, PLANET_ICONS } from '../components/icons';
import { ASPECT_GLYPHS, isAspectGlyphKey } from '../components/icons/AspectGlyphs';
import type { ZodiacSign, Planet } from '../types/astrology';

/** English defaults; the keys live under learn.astrology.kinds. */
const KIND_LABEL: Record<AstroCategory, string> = {
  sign: 'Zodiac sign',
  planet: 'Planet',
  house: 'House',
  aspect: 'Aspect',
};

/**
 * Signs and planets render their drawn glyphs; aspects the AspectGlyphs
 * set. The Unicode astrological symbols are colour emoji on Android.
 * Houses (Roman numerals) keep their text symbol, which no platform
 * emojifies.
 */
function entryGlyph(entry: AstroEntry, size: number): ReactNode {
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

export function AstrologyEntryPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // `source` is the English entry: it drives the SEO head (the shells are
  // English-only) and is what the overlay is applied to for display.
  const source = slug ? getAstroEntry(slug) : null;
  const { overlay, ready } = useLearnOverlay('astrology');

  useEffect(() => {
    if (!source) return;
    setPageMeta(`${source.name} — ${KIND_LABEL[source.category]}`, source.shortDescription);
    removeJsonLd();
    const url = `https://tarotlife.app/astrology/${source.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `${source.name} — ${KIND_LABEL[source.category]}`,
      description: source.longDescription,
      image: 'https://tarotlife.app/image.png',
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      url,
      keywords: source.keywords.join(', '),
      datePublished: '2026-04-29',
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
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
        { '@type': 'ListItem', position: 2, name: 'Astrology', item: 'https://tarotlife.app/astrology' },
        { '@type': 'ListItem', position: 3, name: source.name, item: url },
      ],
    });
    window.scrollTo(0, 0);
  }, [source]);

  if (!source) {
    return (
      <LearnEntryNotFound
        title={t('learn.astrology.notFound', { defaultValue: 'Entry not found' })}
        backLabel={t('learn.astrology.backToHub', { defaultValue: 'All astrology entries' })}
        onBack={() => navigate('/astrology')}
      />
    );
  }

  const entry = localizeAstroEntry(source, overlay);
  const sep = t('learn.listSeparator', { defaultValue: ', ' });

  const facts: LearnEntryFact[] =
    entry.category === 'sign'
      ? [
          { label: t('learn.facts.element', { defaultValue: 'Element' }), value: learnEnumLabel('elements', entry.element) },
          { label: t('learn.facts.modality', { defaultValue: 'Modality' }), value: learnEnumLabel('modalities', entry.modality) },
          { label: t('learn.facts.ruler', { defaultValue: 'Ruler' }), value: learnPlanetName(entry.rulingPlanet) },
          { label: t('learn.facts.dates', { defaultValue: 'Dates' }), value: entry.dates },
          { label: t('learn.facts.body', { defaultValue: 'Body' }), value: entry.bodyPart },
        ]
      : entry.category === 'planet'
        ? [
            { label: t('learn.facts.type', { defaultValue: 'Type' }), value: learnEnumLabel('planetTypes', entry.planetType) },
            { label: t('learn.facts.rules', { defaultValue: 'Rules' }), value: entry.rules?.map(learnSignName).join(sep) },
            { label: t('learn.facts.exalted', { defaultValue: 'Exalted in' }), value: learnSignName(entry.exalted) },
          ]
        : entry.category === 'house'
          ? [
              { label: t('learn.facts.house', { defaultValue: 'House' }), value: entry.houseNumber },
              { label: t('learn.facts.domain', { defaultValue: 'Domain' }), value: entry.domain },
              { label: t('learn.facts.naturalSign', { defaultValue: 'Natural sign' }), value: learnSignName(entry.naturalSign) },
            ]
          : [
              { label: t('learn.facts.angle', { defaultValue: 'Angle' }), value: entry.aspectAngle === undefined ? undefined : `${entry.aspectAngle}°` },
              { label: t('learn.facts.nature', { defaultValue: 'Nature' }), value: learnEnumLabel('aspectNatures', entry.aspectNature) },
            ];

  const sections: LearnEntrySection[] = [
    { title: t('learn.sections.inLove', { defaultValue: 'In love' }), body: entry.inLove },
    { title: t('learn.sections.inCareer', { defaultValue: 'In career' }), body: entry.inCareer },
    { title: t('learn.sections.inSpirituality', { defaultValue: 'In spirituality' }), body: entry.inSpirituality },
    { title: t('learn.sections.strengths', { defaultValue: 'Strengths' }), body: entry.strengths, list: true },
    { title: t('learn.sections.challenges', { defaultValue: 'Challenges' }), body: entry.challenges, list: true },
  ];
  if (entry.famousExamples && entry.famousExamples.length > 0) {
    sections.push({ title: t('learn.sections.famousExamples', { defaultValue: 'Famous examples' }), body: entry.famousExamples.join(sep) });
  }

  const related = source.relatedEntries
    .map((s) => astrologyEntries.find((x) => x.slug === s))
    .filter((x): x is AstroEntry => Boolean(x))
    .map((r) => ({ label: localizeAstroEntry(r, overlay).name, href: `/astrology/${r.slug}`, symbol: entryGlyph(r, 20) }));

  return (
    <LearnEntryTemplate
      loading={!ready}
      eyebrow={t(`learn.astrology.kinds.${entry.category}`, { defaultValue: KIND_LABEL[entry.category] })}
      title={entry.name}
      symbol={entryGlyph(entry, 20)}
      lede={entry.shortDescription}
      intro={entry.longDescription}
      facts={facts}
      sections={sections}
      faqs={entry.faqs}
      related={related}
      disclaimer="astrology"
      backHref="/astrology"
      backLabel={t('learn.astrology.backToHub', { defaultValue: 'All astrology entries' })}
    />
  );
}
