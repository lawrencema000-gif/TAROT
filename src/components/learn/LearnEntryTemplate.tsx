import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button, Disclaimer, EmptyState, Page, PageHeader, Paper, Section, Skeleton, StarDivider, type DisclaimerKind } from '../ui';
import { useT } from '../../i18n/useT';

/**
 * The one shape every "learn" entry takes.
 *
 * /astrology/:slug, /crystals/:slug, /numerology/:slug and /glossary/:slug
 * were four copies of the same page: a max-w-3xl column, a hand-rolled
 * back link, an icon beside an <h1>, a lede, a boxed facts grid, a boxed
 * section per paragraph, a raw <details> per FAQ and a Related grid. Each
 * copy had drifted a little and none of them imported a primitive. The
 * page is now data: the route builds the arrays and the template renders
 * them, so the four entries cannot disagree about what an entry looks like.
 *
 * Phase 7 puts the part that is READ on Paper. The chrome stays on the
 * canvas — the PageHeader with its back link, the facts table (a quick
 * reference, scanned not read) and the link lists at the foot (navigation)
 * — and one cream sheet carries the lede, the sections, anything the page
 * adds through `children`, and the FAQ, in reading order, closed by the
 * Disclaimer when the entry warrants one (astrology, crystals). One Paper
 * per screen, as the primitive asks.
 *
 * Glyphs are drawn: `symbol` and a link's `symbol` are ReactNodes (a
 * ZodiacIcon, a PlanetIcon, an AspectGlyph, a numeral in Inter), not
 * Unicode text, so nothing here can turn into a colour emoji on Android.
 *
 * `loading` is the overlay round-trip (src/i18n/learnOverlay.ts): a ja/ko/zh
 * reader's first visit waits for that module's translation chunk, and the
 * template shows the chrome with skeleton bars where the title and the
 * reading would be rather than English that then swaps.
 *
 * SEO work (setPageMeta, JSON-LD, scroll-to-top) stays in the page. This
 * is presentation only.
 */

export interface LearnEntryFact {
  label: string;
  /** Rows with an empty value are dropped, so a page can pass optional fields straight through. */
  value: string | number | null | undefined;
}

export interface LearnEntrySection {
  title: string;
  /** A paragraph, or several. With `list`, one bullet per item instead. */
  body: string | string[];
  list?: boolean;
}

export interface LearnEntryFaq {
  q: string;
  a: string;
}

export interface LearnEntryLink {
  label: string;
  href: string;
  /** Drawn glyph shown before the label: a ZodiacIcon, a PlanetIcon, an AspectGlyph. */
  symbol?: ReactNode;
}

export interface LearnEntryLinkSection {
  title: string;
  links: LearnEntryLink[];
}

export interface LearnEntryTemplateProps {
  /** Small gold kicker above the title: the entry's category. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Glyph for the header's icon tile. A string is set in the display serif (a Roman numeral); pass an SVG for an icon. */
  symbol?: ReactNode;
  /** The opening line, in the lede size: the entry's one-sentence description. */
  lede?: ReactNode;
  /**
   * The long description, in reading copy under the lede. It used to be the
   * lede itself, and a 110-word paragraph at 19px read as a wall before the
   * sections began.
   */
  intro?: string | string[];
  /** Quick-reference rows on the canvas, between the header and the paper. */
  facts?: LearnEntryFact[];
  sections?: LearnEntrySection[];
  faqs?: LearnEntryFaq[];
  /** Heading over the FAQ. Default "Frequently asked questions". */
  faqTitle?: string;
  related?: LearnEntryLink[];
  /** Heading over the related list. Default "Related". */
  relatedTitle?: string;
  /** Further link lists on the canvas, before Related ("Pairs well with"). */
  linkSections?: LearnEntryLinkSection[];
  /** Closes the paper. Astrology entries take `astrology`; crystals, which make healing claims, `general`. */
  disclaimer?: DisclaimerKind;
  backHref: string;
  backLabel: string;
  /** The translation overlay is still downloading: skeleton the title and the paper. */
  loading?: boolean;
  /** Anything read-for-meaning that is not a paragraph section. Rendered on the paper after the sections, before the FAQ. */
  children?: ReactNode;
}

const FRAME = 'rounded-card border border-mystic-700';

/** A string glyph in the display serif — a house's Roman numeral. */
function LearnGlyph({ symbol, className = '' }: { symbol: string | number; className?: string }) {
  return (
    <span className={`shrink-0 font-display leading-none text-title ${className}`} aria-hidden>
      {symbol}
    </span>
  );
}

function FactsTable({ facts }: { facts: Array<LearnEntryFact & { value: string }> }) {
  return (
    <dl className={`${FRAME} divide-y divide-mystic-700 overflow-hidden`}>
      {facts.map((f) => (
        <div key={f.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 px-4 py-2.5">
          <dt className="text-meta text-mystic-400">{f.label}</dt>
          <dd className="text-ui text-mystic-100 min-w-0">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionBody({ body, list }: Pick<LearnEntrySection, 'body' | 'list'>) {
  const items = Array.isArray(body) ? body : [body];
  if (list) {
    return (
      <ul className="reading-copy list-disc pl-5 marker:text-ink-gold space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="reading-copy">
      {items.map((item, i) => (
        <p key={i}>{item}</p>
      ))}
    </div>
  );
}

const linkClass =
  'flex items-center justify-between gap-3 min-h-[48px] py-2 ' +
  'text-ui text-mystic-200 no-underline transition-colors duration-fast ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:text-gold active:text-gold ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950 rounded-lg';

/**
 * A plain list of internal links. Real anchors, because these are the
 * internal links the SEO pages exist to carry — a Chip is a button.
 */
export function LearnLinkList({ links }: { links: LearnEntryLink[] }) {
  return (
    <ul className="divide-y divide-mystic-700 border-y border-mystic-700">
      {links.map(({ href, label, symbol }) => (
        <li key={href}>
          <Link to={href} className={linkClass}>
            <span className="flex items-center gap-3 min-w-0">
              {symbol && (
                <span className="shrink-0 w-5 h-5 inline-flex items-center justify-center text-mystic-300 [&>svg]:w-5 [&>svg]:h-5" aria-hidden>
                  {typeof symbol === 'string' || typeof symbol === 'number' ? <LearnGlyph symbol={symbol} className="text-ui" /> : symbol}
                </span>
              )}
              <span className="truncate">{label}</span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const hubRowClass =
  'flex items-center gap-3 min-h-[56px] px-3 py-2.5 rounded-control border border-mystic-700 bg-mystic-850 no-underline ' +
  'transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-500 active:bg-mystic-800 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950';

/**
 * One row of a learn hub (the four index pages): a drawn glyph in a tile,
 * the entry's name, an optional second line, a chevron. A react-router
 * Link, so the four hubs navigate client-side and crawl as anchors.
 */
export function LearnHubRow({ href, label, meta, glyph }: { href: string; label: ReactNode; meta?: ReactNode; glyph?: ReactNode }) {
  return (
    <Link to={href} className={hubRowClass}>
      {glyph && (
        <span
          className="w-9 h-9 shrink-0 rounded-inset bg-mystic-800 text-mystic-200 inline-flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"
          aria-hidden
        >
          {typeof glyph === 'string' || typeof glyph === 'number' ? <LearnGlyph symbol={glyph} className="text-ui" /> : glyph}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui font-medium text-mystic-100">{label}</span>
        {meta && <span className="block truncate text-meta text-mystic-400">{meta}</span>}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />
    </Link>
  );
}

/** The rows a hub shows while its translation overlay downloads. */
export function LearnHubSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={56} className="rounded-control" />
      ))}
    </div>
  );
}

/** The 404 branch every entry route needs: a title and one way back to the hub. */
export function LearnEntryNotFound({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <Page spacing="lg" className="py-16">
      <EmptyState
        as="h1"
        title={title}
        action={
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Button>
        }
      />
    </Page>
  );
}

function PaperSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3 py-2">
      <Skeleton height={22} width="92%" />
      <Skeleton height={22} width="78%" />
      <Skeleton height={16} width="100%" className="mt-6" />
      <Skeleton height={16} width="96%" />
      <Skeleton height={16} width="88%" />
      <Skeleton height={16} width="60%" />
    </div>
  );
}

export function LearnEntryTemplate({
  eyebrow,
  title,
  symbol,
  lede,
  intro,
  facts = [],
  sections = [],
  faqs = [],
  faqTitle,
  related = [],
  relatedTitle,
  linkSections = [],
  disclaimer,
  backHref,
  backLabel,
  loading = false,
  children,
}: LearnEntryTemplateProps) {
  const { t } = useT('app');
  const navigate = useNavigate();
  // The back control is a real anchor (crawlable, middle-clickable); a plain
  // left click navigates client-side like react-router's Link does.
  const handleBack = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(backHref);
  };
  const icon =
    symbol === undefined || symbol === null ? undefined : typeof symbol === 'string' || typeof symbol === 'number' ? (
      <LearnGlyph symbol={symbol} />
    ) : (
      symbol
    );

  const shownFacts = facts
    .filter((f) => f.value !== undefined && f.value !== null && f.value !== '')
    .map((f) => ({ label: f.label, value: String(f.value) }));

  const hasBody = sections.length > 0 || faqs.length > 0 || Boolean(children);

  return (
    <Page spacing="lg">
      <PageHeader
        as="h1"
        eyebrow={eyebrow}
        title={loading ? <Skeleton height={34} width={220} className="rounded-inset" /> : title}
        backHref={backHref}
        onBack={handleBack}
        backLabel={backLabel}
        icon={icon}
      />

      {!loading && shownFacts.length > 0 && <FactsTable facts={shownFacts} />}

      {loading ? (
        <PaperSkeleton />
      ) : (
        <>
          <Paper as="article" tail={Boolean(disclaimer)}>
            {lede && <p className="reading-lede">{lede}</p>}
            {intro && (
              <div className={lede ? 'mt-4' : ''}>
                <SectionBody body={intro} />
              </div>
            )}
            {(lede || intro) && hasBody && <StarDivider />}
            {hasBody && (
              <div className="space-y-7">
                {sections.map((s) => (
                  <section key={s.title}>
                    {/* text-title pins the serif at 22px: heading-display-md
                        clamps to 18px at phone width, one point above the
                        17px body it heads, and eight sections at that size
                        read as a wall. */}
                    <h2 className="heading-display-md heading-strong text-title">{s.title}</h2>
                    <div className="mt-2">
                      <SectionBody body={s.body} list={s.list} />
                    </div>
                  </section>
                ))}

                {children}

                {faqs.length > 0 && (
                  <section>
                    <h2 className="heading-display-md heading-strong text-title">
                      {faqTitle ?? t('learn.faq', { defaultValue: 'Frequently asked questions' })}
                    </h2>
                    <dl className="mt-2 divide-y divide-paper-hairline">
                      {faqs.map((f, i) => (
                        <div key={i} className="py-3 last:pb-0">
                          <dt className="text-body font-semibold text-ink">{f.q}</dt>
                          <dd className="reading-copy mt-1">{f.a}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            )}
          </Paper>
          {disclaimer && <Disclaimer kind={disclaimer} tail />}
        </>
      )}

      {!loading &&
        linkSections.map((group) => (
          <Section key={group.title} title={group.title}>
            <LearnLinkList links={group.links} />
          </Section>
        ))}

      {!loading && related.length > 0 && (
        <Section title={relatedTitle ?? t('learn.related', { defaultValue: 'Related' })}>
          <LearnLinkList links={related} />
        </Section>
      )}
    </Page>
  );
}
