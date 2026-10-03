import { useEffect, useMemo, useState } from 'react';
import { TarotFace, Tag, KeywordRow } from '../../ui';
import { PlayingCardFace } from '../../cartomancy/PlayingCardFace';
import { CartomancyLayout } from '../../cartomancy/CartomancyLayout';
import { cartoPositionLabel, cartoVerdict, verdictTone } from '../../cartomancy/cartoFlow';
import { getPlayingCard, getCartoSpread } from '../../../data/cartomancy';
import { getSpreadBySlug, getSpreadLayout, type SpreadLayoutPosition } from '../../../data/tarotSpreads';
import { SPREAD_LAYOUTS, type SpreadGlyphId } from '../../icons/SpreadGlyph';
import { getAllTarotCards } from '../../../services/tarotCards';
import { localizeCardNameSync } from '../../../i18n/localizeCard';
import { localizeCartoSpread, localizePlayingCard, localizedYesNoLabel } from '../../../i18n/localizePlayingCard';
import { useT } from '../../../i18n/useT';
import type { TarotCard } from '../../../types';
import type { CartoSpread, PlayingCard } from '../../../types/cartomancy';
import type { FocusArea } from './types';
import { TarotReadingResult } from './TarotReadingResult';
import { ResultSheet, ReadingProse } from '../../ui';
import { CelticCrossLayout } from '../CelticCrossLayout';
import { firstSentences, joinSentences, splitLede } from './readingText';
import { tarotPositionLabel, tarotSpreadTitle, LEGACY_SPREAD_KEY } from './spreadLabels';

/**
 * A saved reading, reopened from the Library — read-only.
 *
 * The faces on navy, laid out as the spread was dealt — the Celtic Cross
 * by its own cross-and-staff layout (the significator under the crossing
 * card, not hidden by it), a playing-card spread by its own table (the
 * Horseshoe's arc, Two Hearts' pillars, the Romany's 3×7), anything else on
 * the reveal's grid rule — then the reading on paper: for a tarot reading
 * the TarotReadingResult (positions, short meanings, the affirmation) with
 * the saved AI interpretation when one was kept; for a cartomancy reading
 * its verdict, and each card read for the focus it was asked under, as the
 * live result read it. Nothing here writes.
 */

export interface SavedCardRow {
  cardId?: number;
  cardName: string;
  reversed: boolean;
  position: string;
  /** `playing` for a cartomancy reading (written by CartomancySection). */
  deck?: 'tarot' | 'playing';
}

export interface SavedReadingRow {
  id: string;
  date: string;
  spread_type: string;
  focus_area: string | null;
  cards: SavedCardRow[];
  interpretation?: string | null;
  /** The question typed on the focus step, when one was (rows saved before 2026-10 have none). */
  question?: string | null;
}

/** True when the row is a cartomancy reading: a `carto-*` spread, or playing-deck cards. */
export function isPlayingReading(row: Pick<SavedReadingRow, 'spread_type' | 'cards'>): boolean {
  return row.spread_type.startsWith('carto-') || (row.cards ?? []).some((c) => c?.deck === 'playing');
}

/**
 * The spread's display name for a saved row, whichever family it came
 * from: a playing-card spread by the cartomancy corpus (the Library holds
 * the sheet until it is in), a tarot spread as the reveal names it.
 */
export function savedSpreadName(
  t: (key: string, opts?: Record<string, unknown>) => string,
  spreadType: string,
): string {
  const carto = getCartoSpread(spreadType);
  if (carto) return localizeCartoSpread(carto).name;
  if (spreadType in LEGACY_SPREAD_KEY || spreadType.startsWith('custom:') || getSpreadBySlug(spreadType)) {
    return tarotSpreadTitle(t, spreadType);
  }
  return spreadType;
}

/** A playing-card spread's shape as glyph cells, for the Library row's icon. */
function cartoGlyphLayout(spread: CartoSpread, count: number): SpreadLayoutPosition[] | null {
  const { layout } = spread;
  const cells =
    layout.kind === 'arc'
      ? // the arc, flattened to a stair: ends low, centre high
        layout.cells.map((c) => ({ x: c.index, y: c.index === 3 ? 0 : c.index === 2 || c.index === 4 ? 1 : 2 }))
      : layout.kind === 'row'
        ? layout.cells.map((c) => ({ x: c.col, y: 0 }))
        : layout.cells.map((c) => ({ x: c.span && c.span > 1 ? (layout.cols - 1) / 2 : c.col, y: c.row }));
  return cells.length === count ? cells : null;
}

/** The glyph layout for a saved row's spread, or rows of three. */
export function savedSpreadLayout(spreadType: string, count: number): SpreadLayoutPosition[] {
  if (spreadType in SPREAD_LAYOUTS) return SPREAD_LAYOUTS[spreadType as SpreadGlyphId];
  const carto = getCartoSpread(spreadType);
  const cartoCells = carto ? cartoGlyphLayout(carto, count) : null;
  if (cartoCells) return cartoCells;
  const catalogue = getSpreadBySlug(spreadType);
  if (catalogue && catalogue.cardCount === count) return getSpreadLayout(catalogue);
  const cols = count <= 3 ? Math.max(1, count) : 3;
  return Array.from({ length: count }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) }));
}

function localizeIfFound(card: PlayingCard | undefined): PlayingCard | undefined {
  return card ? localizePlayingCard(card) : undefined;
}

/** The reveal's table rule: the layout on a grid, doubled for half-cells. */
function Table({
  layout: raw,
  children,
}: {
  layout: SpreadLayoutPosition[];
  children: (cell: React.CSSProperties, i: number) => React.ReactNode;
}) {
  // Glyph layouts sit on a centred field (a lone card at x 1, y 1): pull to the corner.
  const minX = Math.min(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const layout = raw.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  const fractional = layout.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y));
  const scale = fractional ? 2 : 1;
  const across = Math.max(...layout.map((p) => p.x)) + 1;
  const cols = Math.round(across * scale);
  const width = across <= 1 ? 'max-w-[10rem]' : across <= 2 ? 'max-w-[15.75rem]' : across <= 3 ? 'max-w-sm' : 'max-w-md';
  return (
    <div className={`grid gap-x-3 gap-y-4 mx-auto w-full ${width}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {layout.map((p, i) =>
        children(
          {
            gridColumn: `${Math.round(p.x * scale) + 1} / span ${scale}`,
            gridRow: `${Math.round(p.y * scale) + 1} / span ${scale}`,
          },
          i,
        ),
      )}
    </div>
  );
}

/** The verdict pill on paper, as the live result shows it. */
const VERDICT_FILL = {
  yes: 'bg-ink-teal text-paper',
  no: 'bg-ink-coral text-paper',
  between: 'bg-ink-gold text-paper',
} as const;

/** A saved focus ('Love', 'Career', 'Money', …) as the playing deck reads it. */
function cartoFocusOf(focus: string | null): 'love' | 'career' | 'general' {
  return focus === 'Love' ? 'love' : focus === 'Career' || focus === 'Money' ? 'career' : 'general';
}

/**
 * The meaning a playing card is read by under a focus — its love or career
 * meaning when it has one, else its upright or reversed meaning — the rule
 * the live result applies, so the saved reading says what was read.
 */
function cartoMeaning(card: PlayingCard, reversed: boolean, focus: 'love' | 'career' | 'general'): { text: string; focused: boolean } {
  const focused = focus === 'love' ? card.loveMeaning : focus === 'career' ? card.careerMeaning : undefined;
  if (focused) return { text: focused, focused: true };
  return { text: reversed ? card.meaningReversed ?? card.meaningUpright : card.meaningUpright, focused: false };
}

function SavedPlayingReading({
  reading,
  metaLine,
  focusLabel,
  spreadName,
  question,
}: {
  reading: SavedReadingRow;
  metaLine: string;
  focusLabel: string;
  spreadName: string;
  question: string | null;
}) {
  const { t } = useT('app');
  const rows = reading.cards ?? [];
  const spread = getCartoSpread(reading.spread_type);
  const localSpread = spread ? localizeCartoSpread(spread) : null;
  const focus = cartoFocusOf(reading.focus_area);
  // The caller (LibrarySection) holds this sheet until the corpus is in.
  const cards = rows.map((row) => ({
    card: row.cardId !== undefined ? localizeIfFound(getPlayingCard(row.cardId)) : undefined,
    row,
  }));
  const dealt = cards.filter((c): c is { card: PlayingCard; row: SavedCardRow } => Boolean(c.card));
  const verdict = spread && dealt.length === rows.length ? cartoVerdict(spread, dealt.map((d) => d.card)) : null;
  const ai = reading.interpretation ? splitLede(reading.interpretation) : null;
  const reversedLabel = t('readings.revealView.reversed');
  // Positions in the reader's language now, not the one the row was saved in.
  const positionOf = (i: number) => cartoPositionLabel(localSpread, i, () => rows[i]?.position ?? '');
  const summary =
    ai?.lede ||
    (dealt.length === 1
      ? firstSentences(cartoMeaning(dealt[0].card, dealt[0].row.reversed, focus).text, 2)
      : joinSentences(
          dealt.slice(0, 3).map(({ card, row }) => {
            const first = firstSentences(cartoMeaning(card, row.reversed, focus).text, 1);
            return first.toLowerCase().includes(card.name.toLowerCase())
              ? first
              : t('readings.result.cardLead', { name: card.name, sentence: first, defaultValue: '{{name}}: {{sentence}}' });
          }),
        ));

  const face = (index: number, quiet: boolean, radius: string) => {
    const { card, row } = cards[index] ?? {};
    return (
      <div className={`w-full aspect-[2/3] ${radius} overflow-hidden bg-mystic-850 border border-gold/30 text-gold [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}>
        {card ? (
          <PlayingCardFace card={card} detail={quiet ? 'quiet' : 'full'} reversed={row?.reversed} />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center">
            <span className="text-caption text-mystic-300 line-clamp-3">{row?.cardName}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {metaLine && <p className="text-meta text-mystic-400 text-center">{metaLine}</p>}
      {localSpread ? (
        <CartomancyLayout
          spread={localSpread}
          count={rows.length}
          renderTile={(i, { tile, number }) => (
            <div className="relative">
              {face(i, tile === 'sm' || tile === 'xs', tile === 'hero' ? 'rounded-card' : 'rounded-inset')}
              {number !== undefined && (
                <span
                  className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gold text-mystic-950 text-caption font-semibold tabular-nums flex items-center justify-center"
                  aria-hidden
                >
                  {number}
                </span>
              )}
            </div>
          )}
          captionFor={(i, { named }) => (
            <>
              {named && <p className="text-caption text-mystic-400 leading-tight">{positionOf(i)}</p>}
              {rows[i]?.reversed && <p className="text-caption text-gold leading-tight">{reversedLabel}</p>}
            </>
          )}
          legend={{
            label: positionOf,
            trailing: (i) => {
              const name = cards[i]?.card?.name ?? rows[i]?.cardName;
              return rows[i]?.reversed ? (
                <>
                  <span>{name}</span>
                  <span className="text-caption text-gold">{reversedLabel}</span>
                </>
              ) : (
                name
              );
            },
          }}
        />
      ) : (
        <Table layout={savedSpreadLayout(reading.spread_type, rows.length)}>
          {(cell, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-0" style={cell}>
              {face(i, rows.length > 3, 'rounded-inset')}
              <p className="text-caption text-mystic-400 text-center leading-tight">{positionOf(i)}</p>
            </div>
          )}
        </Table>
      )}
      <ResultSheet
        eyebrow={question ? t('readings.result.yourQuestion', { defaultValue: 'Your question' }) : focusLabel || spreadName}
        title={question ?? spreadName}
        summary={summary || undefined}
        headingLevel="h2"
        disclaimer={ai ? 'ai' : 'cartomancy'}
      >
        {verdict && spread && (
          <div className="text-center mb-7">
            <span className={`inline-flex items-center rounded-full px-5 py-2 text-ui font-semibold ${VERDICT_FILL[verdictTone(verdict)]}`}>
              {verdict.kind === 'yes-no'
                ? localizedYesNoLabel(spread.slug, verdict.outcome.result, verdict.outcome.label)
                : verdict.outcome.label}
            </span>
          </div>
        )}
        {ai ? (
          ai.rest ? <ReadingProse lede={false} text={ai.rest} /> : null
        ) : (
          <div className="space-y-6">
            {cards.map(({ card, row }, i) => {
              const meaning = card ? cartoMeaning(card, row.reversed, focus) : null;
              return (
                <section key={i} className="text-center">
                  <Tag tone="neutral" size="md">{positionOf(i)}</Tag>
                  <h3 className="heading-display-md heading-strong text-ink mt-3">
                    {card?.name ?? row.cardName}
                    {row.reversed && <span className="ml-2 text-meta font-sans font-medium tracking-normal text-ink-coral">{reversedLabel}</span>}
                  </h3>
                  {card && card.keywords.length > 0 && <KeywordRow keywords={card.keywords} className="mt-3" />}
                  {meaning && <p className="reading-copy mt-3 text-left">{meaning.text}</p>}
                  {/* A focus meaning reads the card upright; a reversed card adds its reversed meaning. */}
                  {card && meaning?.focused && row.reversed && card.meaningReversed && (
                    <p className="reading-copy mt-2 text-left">{card.meaningReversed}</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </ResultSheet>
    </div>
  );
}

/**
 * A saved reading, read-only. The Sheet's title is the spread's name (the
 * caller sets it); the first line here is the focus and the date, in the
 * sans, and the ResultSheet below carries the eyebrow and title.
 */
export function SavedReadingSheet({ reading, dateLabel }: { reading: SavedReadingRow; dateLabel?: string }) {
  const { t } = useT('app');
  const playing = isPlayingReading(reading);
  const rows = reading.cards ?? [];
  const layout = useMemo(() => savedSpreadLayout(reading.spread_type, rows.length), [reading.spread_type, rows.length]);
  const spreadName = savedSpreadName(t, reading.spread_type);
  const focus = (reading.focus_area as FocusArea | null) ?? null;
  const focusLabel = focus ? t(`readings.focusAreas.${focus.toLowerCase()}`, { defaultValue: focus }) : '';
  const metaLine = [focusLabel, dateLabel].filter(Boolean).join(' · ');
  // The question titles the reading, as it did on the live reveal.
  const question = reading.question?.trim() || null;
  // More than three cards across: faces too narrow for a name on the plate (as in the reveal).
  const dense = layout.length > 0 && Math.max(...layout.map((p) => p.x)) - Math.min(...layout.map((p) => p.x)) + 1 > 3;

  // The tarot deck, for the faces and the meanings: by id when the row
  // carries one, by (English) name for rows saved before ids were kept.
  const [deck, setDeck] = useState<TarotCard[] | null>(null);
  useEffect(() => {
    if (playing) return;
    let live = true;
    getAllTarotCards().then((cards) => { if (live) setDeck(cards); });
    return () => { live = false; };
  }, [playing]);

  if (playing) {
    return (
      <SavedPlayingReading
        reading={reading}
        metaLine={metaLine}
        focusLabel={focusLabel}
        spreadName={spreadName}
        question={question}
      />
    );
  }

  const resolved = rows.map((row, index) => {
    const card =
      deck?.find((c) => (row.cardId !== undefined ? c.id === row.cardId : false)) ??
      deck?.find((c) => c.name === row.cardName || c.name === localizeCardNameSync(row.cardName));
    return { row, card, index };
  });
  const ready = resolved.filter((r): r is { row: SavedCardRow; card: TarotCard; index: number } => Boolean(r.card));
  // A known spread's positions are named in the reader's language now (the
  // row kept the names in the language it was saved in); a custom spread's
  // names are the reader's own, as saved.
  const knownSpread = reading.spread_type in LEGACY_SPREAD_KEY || Boolean(getSpreadBySlug(reading.spread_type));
  const positionOf = (index: number) =>
    knownSpread ? tarotPositionLabel(t, reading.spread_type, index) : rows[index]?.position ?? '';
  // The Celtic Cross is laid as the reveal lays it, all ten face up.
  const celtic = reading.spread_type === 'celtic-cross' && rows.length === 10 && ready.length === 10;

  return (
    <div className="space-y-6">
      {metaLine && <p className="text-meta text-mystic-400 text-center">{metaLine}</p>}

      {celtic ? (
        <CelticCrossLayout
          drawnCards={ready.map((r) => ({ card: r.card, reversed: r.row.reversed, revealed: true }))}
          getPositionLabel={(i) => positionOf(ready[i]?.index ?? i)}
        />
      ) : (
        <Table layout={layout}>
          {(cell, i) => {
            const { row, card } = resolved[i];
            return (
              <div key={i} className="flex flex-col items-center gap-2 min-w-0" style={cell}>
                {card ? (
                  <TarotFace
                    card={card}
                    size="fill"
                    detail={dense ? 'quiet' : 'full'}
                    reversed={row.reversed}
                    reversedTag={false}
                    radius={rows.length === 1 ? 'card' : 'inset'}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-inset bg-mystic-850 border border-gold/30 flex items-center justify-center p-2 text-center">
                    <span className="text-caption text-mystic-300 line-clamp-3">{localizeCardNameSync(row.cardName)}</span>
                  </div>
                )}
                <div className="text-center min-w-0 w-full">
                  <p className="text-caption text-mystic-400 leading-tight">{positionOf(i)}</p>
                  {row.reversed && <p className="text-caption text-gold leading-tight">{t('readings.revealView.reversed')}</p>}
                </div>
              </div>
            );
          }}
        </Table>
      )}

      {ready.length > 0 && (
        <TarotReadingResult
          cards={ready.map((r) => ({ card: r.card, reversed: r.row.reversed }))}
          getPositionLabel={(i) => positionOf(ready[i]?.index ?? i)}
          selectedFocus={focus}
          question={question}
          eyebrow={focusLabel || spreadName}
          title={spreadName}
          aiInterpretation={reading.interpretation ?? null}
          headingLevel="h2"
        />
      )}
    </div>
  );
}
