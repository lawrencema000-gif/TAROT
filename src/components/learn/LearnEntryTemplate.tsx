import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button, Disclosure, EmptyState, PageHeader, Section } from '../ui';

/**
 * The one shape every "learn" entry takes.
 *
 * /astrology/:slug, /crystals/:slug, /numerology/:slug and /glossary/:slug
 * were four copies of the same page: a max-w-3xl column, a hand-rolled
 * back link, an icon beside an <h1>, a lede, a boxed facts grid, a boxed
 * section per paragraph, a raw <details> per FAQ and a Related grid. Each
 * copy had drifted a little (three different Fact paddings, h1 at two
 * sizes, four category-specific fact boxes on astrology alone) and none
 * of them imported a primitive. The page is now data: the route builds
 * the arrays and the template renders them on PageHeader, Section and
 * Disclosure, so the four entries cannot disagree about what an entry
 * looks like.
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
  /** Glyph shown before the label, in gold. A zodiac symbol, a card number. */
  symbol?: string;
}

export interface LearnEntryTemplateProps {
  /** Small gold kicker above the title: the entry's category. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Glyph for the header's icon tile. A string is set in the display serif; pass an SVG for an icon. */
  symbol?: ReactNode;
  /** The opening paragraph, under the title. */
  lede?: ReactNode;
  facts?: LearnEntryFact[];
  sections?: LearnEntrySection[];
  faqs?: LearnEntryFaq[];
  related?: LearnEntryLink[];
  /** Heading over the related list. Default "Related". */
  relatedTitle?: string;
  backHref: string;
  backLabel: string;
  /** Anything the entry needs that is not a paragraph section. Rendered after the sections, before the FAQs. */
  children?: ReactNode;
}

const FRAME = 'rounded-2xl border border-mystic-700';

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
      <ul className="reading-copy list-disc pl-5 marker:text-gold space-y-1">
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
      {links.map((l) => (
        <li key={l.href}>
          <Link to={l.href} className={linkClass}>
            <span className="flex items-center gap-3 min-w-0">
              {l.symbol && (
                <span className="shrink-0 font-display text-lg leading-none text-gold" aria-hidden>
                  {l.symbol}
                </span>
              )}
              <span className="truncate">{l.label}</span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
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
    <div className="max-w-2xl mx-auto px-4 py-16">
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
    </div>
  );
}

export function LearnEntryTemplate({
  eyebrow,
  title,
  symbol,
  lede,
  facts = [],
  sections = [],
  faqs = [],
  related = [],
  relatedTitle = 'Related',
  backHref,
  backLabel,
  children,
}: LearnEntryTemplateProps) {
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
      <span className="font-display text-xl leading-none">{symbol}</span>
    ) : (
      symbol
    );

  const shownFacts = facts
    .filter((f) => f.value !== undefined && f.value !== null && f.value !== '')
    .map((f) => ({ label: f.label, value: String(f.value) }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      {/* Title and opening paragraph are one group: the lede belongs to its
          title, closer to it than to the facts table below. In the subtitle
          slot it rendered at 14px mystic-400; loose in the space-y-8 column
          it sat 32px from the title. */}
      <div className="space-y-3">
        <PageHeader
          as="h1"
          eyebrow={eyebrow}
          title={title}
          backHref={backHref}
          onBack={handleBack}
          backLabel={backLabel}
          icon={icon}
        />
        {lede && <p className="reading-lede">{lede}</p>}
      </div>

      {shownFacts.length > 0 && <FactsTable facts={shownFacts} />}

      {sections.map((s) => (
        <Section key={s.title} title={s.title}>
          <SectionBody body={s.body} list={s.list} />
        </Section>
      ))}

      {children}

      {faqs.length > 0 && (
        <Section title="Frequently asked questions">
          <div className={`${FRAME} px-4`}>
            {faqs.map((f, i) => (
              <Disclosure key={i} variant="row" label={f.q}>
                <div className="reading-copy">
                  <p>{f.a}</p>
                </div>
              </Disclosure>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section title={relatedTitle}>
          <LearnLinkList links={related} />
        </Section>
      )}
    </div>
  );
}
