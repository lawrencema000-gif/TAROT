import { useEffect, useMemo, useState } from 'react';
import { TarotFace, Tag } from '../../ui';
import { PlayingCardFace } from '../../cartomancy/PlayingCardFace';
import { getPlayingCard, getCartoSpread } from '../../../data/cartomancy';
import { getSpreadBySlug, getSpreadLayout, type SpreadLayoutPosition } from '../../../data/tarotSpreads';
import { SPREAD_LAYOUTS, type SpreadGlyphId } from '../../icons/SpreadGlyph';
import { getAllTarotCards } from '../../../services/tarotCards';
import { localizeCardNameSync } from '../../../i18n/localizeCard';
import { useT } from '../../../i18n/useT';
import type { TarotCard } from '../../../types';
import type { PlayingCard } from '../../../types/cartomancy';
import type { FocusArea } from './types';
import { TarotReadingResult } from './TarotReadingResult';
import { ResultSheet, ReadingProse } from '../../ui';
import { splitLede } from './readingText';

/**
 * A saved reading, reopened from the Library — read-only.
 *
 * The faces on navy, laid out as the spread was (the same grid rule as the
 * reveal), then the reading on paper: for a tarot reading the
 * TarotReadingResult (positions, short meanings, the affirmation) with the
 * saved AI interpretation when one was kept; for a cartomancy reading the
 * playing-card faces and the saved interpretation or the cards' own
 * meanings. Nothing here writes.
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
}

const LEGACY_NAME_KEY: Record<string, string> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  relationship: 'relationship',
  career: 'careerSpread',
  shadow: 'shadow',
};

/** True when the row is a cartomancy reading: a `carto-*` spread, or playing-deck cards. */
export function isPlayingReading(row: Pick<SavedReadingRow, 'spread_type' | 'cards'>): boolean {
  return row.spread_type.startsWith('carto-') || (row.cards ?? []).some((c) => c?.deck === 'playing');
}

/** The spread's display name for a saved row, whichever family it came from. */
export function savedSpreadName(
  t: (key: string, opts?: Record<string, unknown>) => string,
  spreadType: string,
): string {
  // The daily draw is titled as the hero names it (its spread name carries a numeral).
  if (spreadType === 'single') return t('readings.dailyDraw.title');
  const legacy = LEGACY_NAME_KEY[spreadType];
  if (legacy) return t(`readings.spreads.${legacy}.name`);
  if (spreadType.startsWith('custom:')) return t('readings.customSpread', { defaultValue: 'Custom spread' });
  const carto = getCartoSpread(spreadType);
  if (carto) return t(`cartomancy.spreads.${carto.slug}.name`, { defaultValue: carto.name });
  const catalogue = getSpreadBySlug(spreadType);
  if (catalogue) return t(`spreads.catalog.${catalogue.slug}.name`, { defaultValue: catalogue.name });
  return spreadType;
}

/** The glyph layout for a saved row's spread, or rows of three. */
export function savedSpreadLayout(spreadType: string, count: number): SpreadLayoutPosition[] {
  if (spreadType in SPREAD_LAYOUTS) return SPREAD_LAYOUTS[spreadType as SpreadGlyphId];
  const catalogue = getSpreadBySlug(spreadType);
  if (catalogue && catalogue.cardCount === count) return getSpreadLayout(catalogue);
  const cols = count <= 3 ? Math.max(1, count) : 3;
  return Array.from({ length: count }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) }));
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
    const cards = rows.map((row) => ({
      card: (row.cardId !== undefined ? getPlayingCard(row.cardId) : undefined) as PlayingCard | undefined,
      row,
    }));
    const ai = reading.interpretation ? splitLede(reading.interpretation) : null;
    return (
      <div className="space-y-6">
        {metaLine && <p className="text-meta text-mystic-400 text-center">{metaLine}</p>}
        <Table layout={layout}>
          {(cell, i) => {
            const { card, row } = cards[i];
            return (
              <div key={i} className="flex flex-col items-center gap-2 min-w-0" style={cell}>
                <div className="w-full aspect-[2/3] rounded-inset overflow-hidden bg-mystic-850 border border-gold/30 text-gold">
                  {card ? (
                    <PlayingCardFace card={card} detail={dense ? 'quiet' : 'full'} reversed={row.reversed} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center">
                      <span className="text-caption text-mystic-300 line-clamp-3">{row.cardName}</span>
                    </div>
                  )}
                </div>
                <p className="text-caption text-mystic-400 text-center leading-tight">{row.position}</p>
              </div>
            );
          }}
        </Table>
        <ResultSheet
          eyebrow={focusLabel || spreadName}
          title={spreadName}
          summary={ai ? ai.lede : undefined}
          headingLevel="h2"
          disclaimer={ai ? 'ai' : 'cartomancy'}
        >
          {ai ? (
            ai.rest ? <ReadingProse lede={false} text={ai.rest} /> : null
          ) : (
            <div className="space-y-6">
              {cards.map(({ card, row }, i) => (
                <section key={i} className="text-center">
                  <Tag tone="neutral" size="md">{row.position}</Tag>
                  <h3 className="heading-display-md heading-strong text-ink mt-3">{card?.name ?? row.cardName}</h3>
                  {card && <p className="reading-copy mt-2 text-left">{row.reversed && card.meaningReversed ? card.meaningReversed : card.meaningUpright}</p>}
                </section>
              ))}
            </div>
          )}
        </ResultSheet>
      </div>
    );
  }

  const resolved = rows.map((row) => {
    const card =
      deck?.find((c) => (row.cardId !== undefined ? c.id === row.cardId : false)) ??
      deck?.find((c) => c.name === row.cardName || c.name === localizeCardNameSync(row.cardName));
    return { row, card };
  });
  const ready = resolved.filter((r): r is { row: SavedCardRow; card: TarotCard } => Boolean(r.card));

  return (
    <div className="space-y-6">
      {metaLine && <p className="text-meta text-mystic-400 text-center">{metaLine}</p>}

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
                <p className="text-caption text-mystic-400 leading-tight">{row.position}</p>
                {row.reversed && <p className="text-caption text-gold leading-tight">{t('readings.revealView.reversed')}</p>}
              </div>
            </div>
          );
        }}
      </Table>

      {ready.length > 0 && (
        <TarotReadingResult
          cards={ready.map((r) => ({ card: r.card, reversed: r.row.reversed }))}
          getPositionLabel={(i) => ready[i]?.row.position ?? ''}
          selectedFocus={focus}
          eyebrow={focusLabel || spreadName}
          title={spreadName}
          aiInterpretation={reading.interpretation ?? null}
          headingLevel="h2"
        />
      )}
    </div>
  );
}
