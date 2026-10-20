import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { TarotFace, ListSkeleton } from '../../ui';
import { PlayingCardFace } from '../../cartomancy/PlayingCardFace';
import { CartomancyLayout } from '../../cartomancy/CartomancyLayout';
import { SuitGlyph } from '../../cartomancy/SuitGlyph';
import { cartoCombinations, cartoSummary, cartoTableLabel, cartoVerdict, type CartoFocus } from '../../cartomancy/cartoFlow';
import {
  CartoAiSections,
  CartoCardSections,
  CartoCombinationList,
  CartoVerdictSummary,
  ShareIconButton,
} from '../../cartomancy/CartomancyResultParts';
import { reportShareOutcome, sharePlayingReading, useShareOnce } from '../../cartomancy/shareReading';
import { getPlayingCard, getCartoSpread } from '../../../data/cartomancy';
import { getSpreadBySlug, getSpreadLayout, type SpreadLayoutPosition } from '../../../data/tarotSpreads';
import { SPREAD_LAYOUTS, type SpreadGlyphId } from '../../icons/SpreadGlyph';
import { getAllTarotCards } from '../../../services/tarotCards';
import { encodeReading, buildShareUrl } from '../../../services/shareableReadings';
import { shareOrDownloadCard } from '../../../utils/shareCard';
import { getBundledCardPath } from '../../../config/bundledImages';
import { localizeCardNameSync } from '../../../i18n/localizeCard';
import { localizeCartoSpread, localizePlayingCard } from '../../../i18n/localizePlayingCard';
import { useT } from '../../../i18n/useT';
import { getLocale } from '../../../i18n/config';
import type { TarotCard } from '../../../types';
import type { CartoSpread, PlayingCard, PlayingSuit } from '../../../types/cartomancy';
import type { FocusArea } from './types';
import { TarotReadingResult } from './TarotReadingResult';
import { ResultSheet } from '../../ui';
import { CelticCrossLayout } from '../CelticCrossLayout';
import { tarotPositionLabel, tarotSpreadTitle, LEGACY_SPREAD_KEY } from './spreadLabels';
import { canonicalCardName, cardIdFromName } from './cardSlug';

/**
 * A saved reading, reopened from the Library — read-only, and shareable.
 *
 * The faces on navy, laid out as the spread was dealt — the Celtic Cross
 * by its own cross-and-staff layout (the significator under the crossing
 * card, not hidden by it), a playing-card spread by its own table (the
 * Horseshoe's arc, Two Hearts' pillars, the Romany's 3×7), anything else on
 * the reveal's grid rule — then the reading on paper: for a tarot reading
 * the TarotReadingResult (positions, short meanings, the affirmation) with
 * the saved AI interpretation when one was kept; for a cartomancy reading
 * the live result's own parts (CartomancyResultParts): its verdict, the
 * summary, each card read for the focus it was asked under — continuing
 * where the summary stopped — and the combinations. Share sends the same
 * link the reveal sends. Nothing here writes.
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
  /** When the row was saved (the Library's rows carry it): the shared link's date. */
  created_at?: string;
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

/** The glyph layout for a saved row's spread (when it has as many cells as the row has cards), or rows of three. */
export function savedSpreadLayout(spreadType: string, count: number): SpreadLayoutPosition[] {
  const glyph = spreadType in SPREAD_LAYOUTS ? SPREAD_LAYOUTS[spreadType as SpreadGlyphId] : null;
  if (glyph && glyph.length === count) return glyph;
  const carto = getCartoSpread(spreadType);
  const cartoCells = carto ? cartoGlyphLayout(carto, count) : null;
  if (cartoCells) return cartoCells;
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
 * The sheet's first line: the focus and the day, and Share at its right
 * (the reveal's share control, with its busy state) when the reading can
 * be shared. A reading reopened from the Library could not be shared at
 * all (p8 F58, F75).
 */
function SheetHead({ metaLine, share }: { metaLine: string; share?: ReactNode }) {
  if (!share) return metaLine ? <p className="text-meta text-mystic-400 text-center">{metaLine}</p> : null;
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
      <span aria-hidden />
      <p className="text-meta text-mystic-400 text-center">{metaLine}</p>
      {share}
    </div>
  );
}

/** When the reading was made, for its shared link: the moment it was saved, else its calendar day. */
function readingWhen(reading: SavedReadingRow): string {
  return reading.created_at || reading.date;
}

/** A saved focus ('Love', 'Career', 'Money', …) as the playing deck reads it. */
function cartoFocusOf(focus: string | null): CartoFocus {
  return focus === 'Love' ? 'love' : focus === 'Career' || focus === 'Money' ? 'career' : 'general';
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
  const { sharing, shareOnce } = useShareOnce();
  const rows = reading.cards ?? [];
  const spread = getCartoSpread(reading.spread_type);
  // The caller (LibrarySection) holds this sheet until the corpus is in.
  const localSpread = spread ? localizeCartoSpread(spread) : null;
  const focus = cartoFocusOf(reading.focus_area);
  const cards = rows.map((row) => {
    const source = row.cardId !== undefined ? getPlayingCard(row.cardId) : undefined;
    return { row, source, card: source ? localizePlayingCard(source) : undefined };
  });
  const dealt = cards
    .map((c, index) => ({ ...c, index }))
    .filter((c): c is { row: SavedCardRow; source: PlayingCard; card: PlayingCard; index: number } => Boolean(c.source && c.card));
  const complete = rows.length > 0 && dealt.length === rows.length;
  const table = dealt.map((d) => d.source);
  // Read as the live table read it: from the spread in the reader's language,
  // whose Wish labels are the corpus's (the English spread said "Favored").
  const verdict = localSpread && complete ? cartoVerdict(localSpread, table) : null;
  const combinations = localSpread && complete ? cartoCombinations(localSpread, table) : [];
  const ai = reading.interpretation?.trim() ? reading.interpretation : null;
  const reversedLabel = t('readings.revealView.reversed');
  // The live table's names, in the reader's language now; a table of five
  // from a three-position spread numbered card by card (p8 F18). Never the
  // label stored with the row, frozen in the language it was saved in.
  const positionOf = (i: number) =>
    cartoTableLabel(
      localSpread,
      rows.length,
      i,
      (n) => t('readings.selectView.cardN', { n, defaultValue: 'Card {{n}}' }),
      (n) => t('readings.positions.generic', { index: n }),
    );
  const summary = cartoSummary(
    ai,
    dealt.map((d) => ({ card: d.card, reversed: d.row.reversed })),
    focus,
    (name, sentence) => t('cartomancy.result.summaryLead', { name, sentence, defaultValue: '{{name}}: {{sentence}}' }),
  );
  const summaryHeading = t('common:resultSheet.summaryHeading', { defaultValue: 'Reading summary' });
  const firstSuited = table.find((c) => c.suit !== 'joker');

  const share = () =>
    shareOnce(() =>
      sharePlayingReading(
        {
          spreadSlug: reading.spread_type,
          spreadName,
          cards: dealt.map((d) => ({ card: d.source, reversed: d.row.reversed })),
          featured: 0,
          question: question ?? undefined,
          date: readingWhen(reading),
          localize: (card) => localizePlayingCard(card),
        },
        t,
      ),
    );

  const face = (index: number, quiet: boolean, radius: string) => {
    const { source, row } = cards[index] ?? {};
    return (
      <div className={`w-full aspect-[2/3] ${radius} overflow-hidden bg-mystic-850 border border-gold/30 text-gold [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}>
        {source ? (
          <PlayingCardFace card={source} detail={quiet ? 'quiet' : 'full'} reversed={row?.reversed} />
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
      <SheetHead metaLine={metaLine} share={complete ? <ShareIconButton onShare={share} sharing={sharing} /> : undefined} />
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
        glyph={firstSuited ? <SuitGlyph suit={firstSuited.suit as PlayingSuit} size={28} /> : undefined}
        eyebrow={question ? t('readings.result.yourQuestion', { defaultValue: 'Your question' }) : focusLabel || spreadName}
        title={question ?? spreadName}
        summary={verdict ? undefined : summary || undefined}
        summaryHeading={summaryHeading}
        headingLevel="h2"
        disclaimer={ai ? 'ai' : 'cartomancy'}
      >
        <div className="space-y-7">
          {verdict && localSpread && <CartoVerdictSummary spread={localSpread} verdict={verdict} summary={summary} heading={summaryHeading} />}
          {ai ? (
            <CartoAiSections text={ai} />
          ) : (
            <CartoCardSections
              cards={dealt.map((d) => ({ source: d.source, card: d.card, reversed: d.row.reversed }))}
              focus={focus}
              positionLabel={(i) => positionOf(dealt[i]?.index ?? i)}
            />
          )}
          <CartoCombinationList hits={combinations} localize={(card) => localizePlayingCard(card)} />
        </div>
      </ResultSheet>
    </div>
  );
}

/**
 * The card a tarot row names, as far as the row alone says: its id (or the
 * id of its English name, for rows saved before ids were kept) and its
 * English name, which TarotFace shows in the reader's language. Enough to
 * draw the face from the bundled art at once; the reading under it waits
 * for the deck. Null when the row names no card the deck has (a name saved
 * in another language before ids were kept, until the deck resolves it).
 */
function faceFromRow(row: SavedCardRow): TarotCard | null {
  const id = typeof row.cardId === 'number' && row.cardId >= 0 && row.cardId <= 77 ? row.cardId : cardIdFromName(row.cardName);
  if (id === undefined) return null;
  return {
    id,
    name: canonicalCardName(id),
    arcana: id <= 21 ? 'major' : 'minor',
    keywords: [],
    meaningUpright: '',
    meaningReversed: '',
    description: '',
  };
}

/**
 * A placeholder for a card no one can name yet, in a layout that takes
 * TarotCard faces (the Celtic Cross): TarotFace draws a card it has no art
 * for as its name on the navy panel, with an empty plate.
 */
function placeholderCard(row: SavedCardRow): TarotCard {
  return {
    id: -1,
    name: localizeCardNameSync(row.cardName),
    arcana: 'major',
    keywords: [],
    meaningUpright: '',
    meaningReversed: '',
    description: '',
  };
}

/**
 * A saved reading, read-only. The Sheet's title is the spread's name (the
 * caller sets it); the first line here is the focus and the date, in the
 * sans, with Share; the ResultSheet below carries the eyebrow and title.
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
  const { sharing, shareOnce } = useShareOnce();

  // The tarot deck, for the meanings (and for names saved before ids were
  // kept): by id when the row carries one, by name otherwise. It comes back
  // in the language on screen, so a language change reads it again; read
  // once, the reading kept the language it was opened in (p10 d1-en-01).
  // The deck on hand stays until the new one is in.
  const locale = getLocale();
  const [deck, setDeck] = useState<TarotCard[] | null>(null);
  useEffect(() => {
    if (playing) return;
    let live = true;
    getAllTarotCards().then((cards) => {
      if (live) setDeck(cards);
    });
    return () => {
      live = false;
    };
  }, [playing, locale]);

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
    // The face needs no deck: the row names the card (its bundled art and
    // its name), so the table is drawn at once, not after a 1 MB fetch.
    const named = faceFromRow(row);
    const card =
      (named ? deck?.find((c) => c.id === named.id) : undefined) ??
      deck?.find((c) => c.name === row.cardName || c.name === localizeCardNameSync(row.cardName));
    return { row, card, face: card ?? named, index };
  });
  const ready = resolved.filter((r): r is typeof r & { card: TarotCard } => Boolean(r.card));
  // A known spread's positions are named in the reader's language now (the
  // row kept the names in the language it was saved in); a custom spread's
  // names are the reader's own, as saved.
  const knownSpread = reading.spread_type in LEGACY_SPREAD_KEY || Boolean(getSpreadBySlug(reading.spread_type));
  const positionOf = (index: number) =>
    knownSpread ? tarotPositionLabel(t, reading.spread_type, index) : rows[index]?.position ?? '';
  // The Celtic Cross is always laid as the reveal lays it, all ten face up.
  // It used to wait for every card to resolve against the deck and showed
  // the glyph table meanwhile, which puts the crossing card on top of the
  // significator, with their labels printed over each other (p8 O#42); a
  // card nothing names yet sits in its own slot as a placeholder.
  const celtic = reading.spread_type === 'celtic-cross' && rows.length === 10;

  // Share needs every card's id (the link) and the deck (the image's keyword).
  const ids = resolved.map((r) => r.face?.id);
  const shareable = rows.length > 0 && ids.every((id): id is number => id !== undefined);
  const share = () =>
    shareOnce(async () => {
      const featured = resolved[0];
      if (!deck || !featured?.card || !ids.every((id): id is number => id !== undefined)) return;
      const url = buildShareUrl(
        encodeReading({
          spreadSlug: reading.spread_type,
          cards: ids.map((id, i) => ({ id, reversed: rows[i].reversed })),
          question: question ?? undefined,
          date: readingWhen(reading),
        }),
      );
      const text = `${t('readings.shareText', { defaultValue: 'My {{spread}} tarot reading on Arcana', spread: spreadName })}\n${url}`;
      const outcome = await shareOrDownloadCard(
        {
          variant: 'tarot',
          cardName: featured.card.name,
          orientation: featured.row.reversed ? 'reversed' : 'upright',
          keyword: featured.card.keywords?.[0] ?? '',
          cardImageUrl: getBundledCardPath(featured.card.id) || featured.card.imageUrl,
        },
        `arcana-reading-${reading.spread_type.replace(/[^a-z0-9-]/gi, '-')}.png`,
        text,
      );
      await reportShareOutcome(outcome, text, t);
    });

  return (
    <div className="space-y-6">
      <SheetHead
        metaLine={metaLine}
        share={shareable ? <ShareIconButton onShare={share} sharing={sharing} disabled={!deck || !resolved[0]?.card} /> : undefined}
      />

      {celtic ? (
        <CelticCrossLayout
          drawnCards={resolved.map((r) => ({
            card: r.face ?? placeholderCard(r.row),
            // A placeholder's name stays upright to be read.
            reversed: r.face ? r.row.reversed : false,
            revealed: true,
          }))}
          getPositionLabel={positionOf}
        />
      ) : (
        <Table layout={layout}>
          {(cell, i) => {
            const { row, face } = resolved[i] ?? { row: rows[i], face: null };
            return (
              <div key={i} className="flex flex-col items-center gap-2 min-w-0" style={cell}>
                {face ? (
                  <TarotFace
                    card={face}
                    size="fill"
                    detail={dense ? 'quiet' : 'full'}
                    reversed={row?.reversed}
                    reversedTag={false}
                    radius={rows.length === 1 ? 'card' : 'inset'}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-inset bg-mystic-850 border border-gold/30 flex items-center justify-center p-2 text-center">
                    <span className="text-caption text-mystic-300 line-clamp-3">{row ? localizeCardNameSync(row.cardName) : ''}</span>
                  </div>
                )}
                <div className="text-center min-w-0 w-full">
                  <p className="text-caption text-mystic-400 leading-tight">{positionOf(i)}</p>
                  {row?.reversed && <p className="text-caption text-gold leading-tight">{t('readings.revealView.reversed')}</p>}
                </div>
              </div>
            );
          }}
        </Table>
      )}

      {deck === null ? (
        // The reading's text comes with the deck; the faces above did not wait for it.
        <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
          <ListSkeleton count={2} />
        </div>
      ) : (
        ready.length > 0 && (
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
        )
      )}
    </div>
  );
}
