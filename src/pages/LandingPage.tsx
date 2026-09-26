// The stylesheet ships with this chunk, not with the app: LandingPage is
// lazy-loaded by App.tsx and native never renders it, so main.tsx must not
// import landing.css globally.
import '../styles/landing.css';
import { useState, useEffect, useRef, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronRight, Flame, ListChecks, PenLine } from 'lucide-react';
import { setPageMeta, setWebsiteSchema, setFaqSchema, setHowToSchema } from '../utils/seo';
import { FreeReadingDemo } from '../components/landing/FreeReadingDemo';
import { FreeEmailCourseCard } from '../components/landing/FreeEmailCourseCard';
import { LanguageDropdown } from '../components/i18n/LanguageDropdown';
import { useT } from '../i18n/useT';
import {
  Button,
  Card,
  DeckFan,
  Disclosure,
  EyebrowLabel,
  BrandMark,
  BrandWordmark,
  TarotCardIcon,
  HoroscopeWheelIcon,
} from '../components/ui';
import { ZodiacGlyphPaths, SunIcon } from '../components/icons';
import { fullDeck } from '../data/tarotDeck';
import { prefersReducedMotion } from '../utils/motion';
import type { ZodiacSign } from '../types/astrology';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

// ─── Data ──────────────────────────────────────────────────────
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.arcana.app';

type Element = 'fire' | 'earth' | 'air' | 'water';

/** The twelve signs in wheel order. Names, dates, traits and descriptions live in landing.json. */
const SIGNS: ReadonlyArray<{ sign: ZodiacSign; key: string; element: Element }> = [
  { sign: 'Aries', key: 'aries', element: 'fire' },
  { sign: 'Taurus', key: 'taurus', element: 'earth' },
  { sign: 'Gemini', key: 'gemini', element: 'air' },
  { sign: 'Cancer', key: 'cancer', element: 'water' },
  { sign: 'Leo', key: 'leo', element: 'fire' },
  { sign: 'Virgo', key: 'virgo', element: 'earth' },
  { sign: 'Libra', key: 'libra', element: 'air' },
  { sign: 'Scorpio', key: 'scorpio', element: 'water' },
  { sign: 'Sagittarius', key: 'sagittarius', element: 'fire' },
  { sign: 'Capricorn', key: 'capricorn', element: 'earth' },
  { sign: 'Aquarius', key: 'aquarius', element: 'air' },
  { sign: 'Pisces', key: 'pisces', element: 'water' },
];

/**
 * Element → ink token. Fire is coral, earth is teal, and the two cool
 * elements take the AA text inks for the cosmic tints (the raw blue and
 * violet are fills, 3.5:1 as text). Literal class names so Tailwind
 * emits them.
 */
const ELEMENT_INK: Record<Element, string> = {
  fire: 'text-coral',
  earth: 'text-teal',
  air: 'text-cosmic-blue-ink',
  water: 'text-cosmic-violet-ink',
};

const MAJOR_ARCANA = [
  'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor',
  'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit', 'wheel-of-fortune',
  'justice', 'the-hanged-man', 'death', 'temperance', 'the-devil',
  'the-tower', 'the-star', 'the-moon', 'the-sun', 'judgement', 'the-world',
];

/**
 * Counts the page can stand behind.
 *
 * Quizzes: the registry in src/pages/QuizzesPage.tsx (`const quizzes`) has
 * ten entries that are always on — mood check, MBTI (full and quick), tarot
 * court match, element affinity, shadow archetype, love language, Big Five,
 * Enneagram, attachment — plus twenty-three behind the `ayurveda-dosha` and
 * `extra-quizzes` flags, which this page cannot see. Ten is the floor.
 *
 * Spreads: `allSpreads` in src/data/tarotSpreads.ts is 18 general spreads
 * plus the 22 major-arcana spreads. Not imported: those two data files are
 * ~190KB and this page is the first thing a cold visitor downloads.
 */
const QUIZ_COUNT = 10;
const SPREAD_COUNT = 40;

// Wheel geometry, in a 520-unit viewBox. Pure numbers, computed once.
const WHEEL = 520;
const WC = WHEEL / 2;
// `arc` is the selection mark: it sits just outside the tick ring, clear of
// the sign buttons, so it reads as a bracket on the rim rather than a halo.
const R = { outer: 230, signs: 190, inner: 145, core: 95, arc: 240 };
function polar(r: number, i: number, offsetDeg = 0) {
  const a = (i * 30 - 90 + offsetDeg) * (Math.PI / 180);
  return { x: WC + Math.cos(a) * r, y: WC + Math.sin(a) * r };
}
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = i * 5 * (Math.PI / 180);
  const major = i % 6 === 0;
  const r1 = R.outer - (major ? 10 : 5);
  return {
    x1: WC + Math.cos(a) * r1, y1: WC + Math.sin(a) * r1,
    x2: WC + Math.cos(a) * R.outer, y2: WC + Math.sin(a) * R.outer,
    major,
  };
});
const SPOKES = SIGNS.map((_, i) => ({ a: polar(R.core, i, -15), b: polar(R.outer, i, -15) }));

// ─── Hooks ─────────────────────────────────────────────────────
/** True once the element has entered the viewport. Never resets: entrances play once. */
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.12) {
  const ref = useRef<T>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    o.observe(el);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, v };
}

// ─── Animated counter ──────────────────────────────────────────
// Starts at `to` (the figure is always correct at rest) and replays the
// count-up once when it scrolls into view. A setInterval is invisible to
// the CSS reduced-motion block, so it checks for itself.
function AnimNum({ to }: { to: number }) {
  const [n, setN] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        if (prefersReducedMotion()) { setN(to); return; }
        let c = 0; const step = to / 30;
        setN(0);
        const iv = setInterval(() => { c += step; if (c >= to) { setN(to); clearInterval(iv); } else setN(Math.floor(c)); }, 40);
      }
    }, { threshold: 0.5 });
    o.observe(el);
    return () => o.disconnect();
  }, [to]);
  return <span ref={ref}>{n}</span>;
}

// ─── Google Play badge ─────────────────────────────────────────
// The official asset, cropped by .lp-play-clip (see landing.css for why).
function PlayBadge({ alt, eager = false }: { alt: string; eager?: boolean }) {
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-play">
      <span className="lp-play-clip">
        <img src="/google-play-badge.png" alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </span>
    </a>
  );
}

// ─── Section scaffolding ───────────────────────────────────────
function Sec({ children, id, className = '' }: { children: ReactNode; id?: string; className?: string }) {
  const { ref, v } = useReveal<HTMLElement>();
  return (
    <section ref={ref} id={id} className={`lp-sec ${v ? 'is-vis' : ''} ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ tag, heading, sub }: { tag: string; heading: string; sub?: string }) {
  return (
    <div className="lp-header">
      <EyebrowLabel rules>{tag}</EyebrowLabel>
      <h2 className="lp-h2 heading-display-xl text-mystic-100">{heading}</h2>
      {sub && <p className="lp-sub text-body text-mystic-400">{sub}</p>}
    </div>
  );
}

// ─── Deck marquee ──────────────────────────────────────────────
// The page's one ambient animation. Decorative: the cards are shown again
// below in the demo and the faces carry no information here, so the whole
// row is hidden from assistive technology rather than announcing 44 images.
function CardMarquee({ cards }: { cards: string[] }) {
  const doubled = [...cards, ...cards];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {doubled.map((card, i) => (
          <div key={`${card}-${i}`} className="lp-marquee-card">
            <img src={`/bundled-cards/major-arcana/${card}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zodiac wheel ──────────────────────────────────────────────
// A static ring drawing with twelve real buttons laid over it. Tap, focus,
// Enter and Space select a sign; the arrow keys walk the ring; Escape
// clears. Nothing rotates.
function ZodiacWheel() {
  const { t } = useT('landing');
  const [active, setActive] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % SIGNS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + SIGNS.length - 1) % SIGNS.length;
    else if (e.key === 'Escape') { setActive(null); return; }
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  const current = active === null ? null : SIGNS[active];
  const ink = current ? ELEMENT_INK[current.element] : 'text-gold';
  const arc = current && active !== null
    ? (() => { const s = polar(R.arc, active, -15); const e = polar(R.arc, active, 15); return `M ${s.x} ${s.y} A ${R.arc} ${R.arc} 0 0 1 ${e.x} ${e.y}`; })()
    : null;

  return (
    <div className="lp-wheel">
      <div className="lp-wheel-stage" role="group" aria-label={t('zodiac.wheelLabel')}>
        <svg viewBox={`0 0 ${WHEEL} ${WHEEL}`} className="lp-wheel-svg text-gold" aria-hidden focusable="false">
          <circle cx={WC} cy={WC} r={R.outer} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={1} />
          {TICKS.map((k, i) => (
            <line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke="currentColor" strokeOpacity={k.major ? 0.3 : 0.12} strokeWidth={k.major ? 1 : 0.5} />
          ))}
          <circle cx={WC} cy={WC} r={R.signs} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} strokeDasharray="2 6" />
          <circle cx={WC} cy={WC} r={R.inner} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={0.5} />
          {SPOKES.map((s, i) => (
            <line key={i} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={0.5} />
          ))}
          {arc && <path d={arc} className={ink} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />}
          <circle cx={WC} cy={WC} r={R.core} fill="rgb(var(--surface-card))" stroke="currentColor" strokeOpacity={0.18} strokeWidth={0.75} />
        </svg>

        {SIGNS.map((s, i) => {
          const { x, y } = polar(R.signs, i);
          const isA = active === i;
          return (
            <button
              key={s.key}
              ref={(el) => { buttons.current[i] = el; }}
              type="button"
              className={`lp-wheel-sign ${isA ? `is-active ${ELEMENT_INK[s.element]}` : 'text-gold/70'}`}
              style={{ left: `${(x / WHEEL) * 100}%`, top: `${(y / WHEEL) * 100}%` }}
              aria-label={t(`zodiac.signs.${s.key}.name`)}
              aria-pressed={isA}
              // One tab stop for the ring (roving tabindex); the arrows walk
              // it and select; a tap toggles, so aria-pressed is truthful.
              tabIndex={i === (active ?? 0) ? 0 : -1}
              onClick={() => setActive(isA ? null : i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <svg viewBox="0 0 32 32" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
                <ZodiacGlyphPaths sign={s.sign} />
              </svg>
            </button>
          );
        })}

        <div className="lp-wheel-centre" aria-hidden="true">
          {current ? (
            <>
              <svg viewBox="0 0 32 32" width={32} height={32} className={ink} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" focusable="false">
                <ZodiacGlyphPaths sign={current.sign} />
              </svg>
              <div className="heading-display-md text-mystic-100">{t(`zodiac.signs.${current.key}.name`)}</div>
              <div className="text-caption text-mystic-400">{t(`zodiac.signs.${current.key}.dates`)}</div>
            </>
          ) : (
            <>
              <span className="text-gold"><SunIcon size={28} /></span>
              <div className="heading-display-md text-mystic-100">{t('zodiac.theZodiac')}</div>
              <div className="text-caption text-mystic-400">{t('zodiac.tapToExplore')}</div>
            </>
          )}
        </div>
      </div>

      <Card padding="md" className="lp-wheel-detail" aria-live="polite">
        {current ? (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-caption font-semibold uppercase tracking-wider ${ink}`}>{t(`zodiac.elements.${current.element}`)}</span>
              <span className="text-caption text-mystic-500">{t(`zodiac.signs.${current.key}.dates`)}</span>
            </div>
            <h3 className="heading-display-md text-mystic-100 mt-2">
              {t(`zodiac.signs.${current.key}.name`)}
              <span className={`text-meta font-body font-medium ml-2 ${ink}`}>{t(`zodiac.signs.${current.key}.trait`)}</span>
            </h3>
            <p className="text-body text-mystic-300 mt-1">{t(`zodiac.signs.${current.key}.desc`)}</p>
          </>
        ) : (
          <p className="text-ui text-mystic-400">{t('zodiac.tapToExplore')}</p>
        )}
      </Card>
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const { ref, v } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`lp-reveal mb-2.5 ${v ? 'is-vis' : ''}`} style={{ transitionDelay: `${index * 50}ms` }}>
      <Disclosure variant="panel" label={<span className="text-ui text-mystic-100">{q}</span>}>
        <p className="text-body text-mystic-300">{a}</p>
      </Disclosure>
    </div>
  );
}

// ─── Bento feature card ────────────────────────────────────────
type TFn = (k: string, o?: Record<string, unknown>) => string;
const FEATURES = [
  { key: 'tarot', size: 'large' },
  { key: 'horoscope', size: 'small' },
  { key: 'journal', size: 'small' },
  { key: 'quizzes', size: 'large' },
  { key: 'streaks', size: 'small' },
  { key: 'birthChart', size: 'small' },
] as const;
const BENTO_ICONS: Record<(typeof FEATURES)[number]['key'], ReactNode> = {
  tarot: <TarotCardIcon className="w-6 h-6" />,
  horoscope: <SunIcon size={24} />,
  journal: <PenLine className="w-6 h-6" strokeWidth={1.6} />,
  quizzes: <ListChecks className="w-6 h-6" strokeWidth={1.6} />,
  streaks: <Flame className="w-6 h-6" strokeWidth={1.6} />,
  birthChart: <HoroscopeWheelIcon className="w-6 h-6" />,
};

function BentoItem({ feature, index, t }: { feature: (typeof FEATURES)[number]; index: number; t: TFn }) {
  const { ref, v } = useReveal<HTMLDivElement>();
  return (
    <Card
      ref={ref}
      padding="lg"
      className={`lp-bento-card lp-reveal ${feature.size} ${v ? 'is-vis' : ''}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="lp-bento-icon text-gold" aria-hidden="true">{BENTO_ICONS[feature.key]}</div>
      <h3 className="heading-display-md text-mystic-100 mb-2">{t(`features.items.${feature.key}.title`)}</h3>
      <p className="text-ui text-mystic-400">{t(`features.items.${feature.key}.desc`)}</p>
    </Card>
  );
}

// ─── Ritual timeline step ──────────────────────────────────────
const RITUAL_STEPS = [
  { n: '01', key: 'horoscope' },
  { n: '02', key: 'card' },
  { n: '03', key: 'journal' },
] as const;
const RITUAL_ICONS: Record<(typeof RITUAL_STEPS)[number]['key'], ReactNode> = {
  horoscope: <SunIcon size={28} />,
  card: <TarotCardIcon className="w-7 h-7" />,
  journal: <PenLine className="w-7 h-7" strokeWidth={1.6} />,
};

function RitualStep({ step, index, t }: { step: (typeof RITUAL_STEPS)[number]; index: number; t: TFn }) {
  const { ref, v } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`lp-timeline-item lp-reveal ${index % 2 === 1 ? 'right' : 'left'} ${v ? 'is-vis' : ''}`}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className="lp-timeline-dot" aria-hidden="true" />
      <Card padding="lg" className="relative overflow-hidden">
        <div className="lp-timeline-watermark" aria-hidden="true">{step.n}</div>
        <div className="text-gold mb-3" aria-hidden="true">{RITUAL_ICONS[step.key]}</div>
        <h3 className="heading-display-md text-mystic-100 mb-1">{t(`ritual.steps.${step.key}.title`)}</h3>
        <p className="text-ui text-mystic-400">{t(`ritual.steps.${step.key}.desc`)}</p>
      </Card>
    </div>
  );
}

// ─── Footer ────────────────────────────────────────────────────
function FooterLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      className="lp-footer-link text-ui text-mystic-300 [@media(hover:hover)]:hover:text-mystic-100"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const { t } = useT(['landing', 'common']);
  const [navSolid, setNavSolid] = useState(false);

  const FAQ_KEYS = ['free', 'accuracy', 'quizzes', 'privacy', 'premium', 'web'] as const;

  const onScroll = useCallback(() => { setNavSolid(window.scrollY > 50); }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Scroll-stop panels while the landing is mounted (see landing.css).
  useEffect(() => {
    document.documentElement.classList.add('lp-snap');
    return () => document.documentElement.classList.remove('lp-snap');
  }, []);

  useEffect(() => {
    setPageMeta(t('meta.title'), t('meta.description'));
    setWebsiteSchema();
    // HowTo schema lets Google generate a "how to" rich card + lets AI
    // answer engines cite the ritual steps when users ask about
    // getting started with tarot apps.
    setHowToSchema();
    setFaqSchema(FAQ_KEYS.map(k => ({
      q: t(`faq.items.${k}.q`),
      a: t(`faq.items.${k}.a`),
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const stats = [
    { key: 'cards', n: fullDeck.length },
    { key: 'spreads', n: SPREAD_COUNT },
    { key: 'quizzes', n: QUIZ_COUNT },
    { key: 'signs', n: SIGNS.length },
  ];

  const navLink = 'lp-nav-link text-ui text-mystic-400 [@media(hover:hover)]:hover:text-mystic-100';

  return (
    <div className="lp-root text-mystic-100">
      <div className="lp-sky" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className={`lp-nav ${navSolid ? 'is-solid' : ''}`}>
        <div className="lp-nav-in">
          <a href="/" className="lp-nav-brand" aria-label={t('nav.home')}>
            <BrandMark size={22} className="text-gold" />
            <BrandWordmark size={17} sparkle={false} className="lp-nav-word" />
          </a>
          <div className="lp-nav-right">
            <a href="/tarot-meanings" className={navLink}>{t('nav.cardMeanings')}</a>
            <a href="#features" className={navLink}>{t('nav.features')}</a>
            <a href="#zodiac" className={navLink}>{t('nav.zodiac')}</a>
            <a href="#faq" className={navLink}>{t('nav.faq')}</a>
            <a href="https://yinyangguardian.com/" target="_blank" rel="noopener noreferrer" className={navLink}>{t('common:nav.shop')}</a>
            <LanguageDropdown />
            <Button variant="ghost" onClick={onSignIn}>{t('common:nav.signIn')}</Button>
            <Button variant="gold" onClick={onGetStarted}>{t('nav.cta')}</Button>
          </div>
        </div>
      </nav>

      <main>
        {/* ── Hero: the deck, the thesis, the draw ── */}
        <section className="lp-hero">
          <div className="lp-hero-in lp-enter">
            <DeckFan size="lg" />
            <EyebrowLabel rules className="mt-4">{t('hero.badge')}</EyebrowLabel>
            <h1 className="lp-hero-h1 heading-display-xl text-mystic-100">
              {t('hero.headlineTop')}
              <br />
              <span className="text-gold">{t('hero.headlineBottom')}</span>
            </h1>
            <p className="text-lede text-mystic-300 max-w-md">{t('hero.sub')}</p>
            <div className="lp-hero-ctas">
              <Button variant="gold" size="lg" onClick={onGetStarted}>
                {t('hero.cta')}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Button>
              <PlayBadge alt={t('play.alt')} eager />
            </div>
            <p className="text-caption text-mystic-500 mt-2">{t('hero.note')}</p>
            <FreeReadingDemo onSignUp={onGetStarted} />
          </div>
        </section>

        <div className="lp-divider" />

        {/* ── What is in the box ── */}
        <Sec className="lp-trust">
          <div className="lp-wrap">
            <div className="lp-trust-grid">
              {stats.map((s) => (
                <div key={s.key} className="lp-trust-item">
                  <div className="font-display text-hero font-medium text-gold"><AnimNum to={s.n} /></div>
                  <div className="text-ui font-medium text-mystic-100 mt-1">{t(`trust.stats.${s.key}.label`)}</div>
                  <div className="text-caption text-mystic-500">{t(`trust.stats.${s.key}.sub`)}</div>
                </div>
              ))}
            </div>
          </div>
        </Sec>

        <div className="lp-divider" />

        {/* ── Free 3-part email course ── */}
        <Sec>
          <FreeEmailCourseCard />
        </Sec>

        <div className="lp-divider" />

        {/* ── Features ── */}
        <Sec id="features">
          <div className="lp-wrap">
            <SectionHeader tag={t('features.tag')} heading={t('features.heading')} sub={t('features.sub')} />
            <div className="lp-bento">
              {FEATURES.map((f, i) => (
                <BentoItem key={f.key} feature={f} index={i} t={t} />
              ))}
            </div>
          </div>
        </Sec>

        <div className="lp-divider" />

        {/* ── The deck ── */}
        <Sec className="lp-showcase">
          <div className="lp-wrap">
            <SectionHeader tag={t('deck.tag')} heading={t('deck.heading')} sub={t('deck.sub')} />
          </div>
          <CardMarquee cards={MAJOR_ARCANA} />
        </Sec>

        <div className="lp-divider" />

        {/* ── Zodiac ── */}
        <Sec id="zodiac">
          <div className="lp-wrap">
            <SectionHeader tag={t('zodiac.tag')} heading={t('zodiac.heading')} sub={t('zodiac.sub')} />
            <ZodiacWheel />
          </div>
        </Sec>

        <div className="lp-divider" />

        {/* ── Daily ritual ── */}
        <Sec>
          <div className="lp-wrap">
            <SectionHeader tag={t('ritual.tag')} heading={t('ritual.heading')} sub={t('ritual.sub')} />
            <div className="lp-timeline">
              <div className="lp-timeline-line" aria-hidden="true" />
              {RITUAL_STEPS.map((s, i) => (
                <RitualStep key={s.n} step={s} index={i} t={t} />
              ))}
            </div>
          </div>
        </Sec>

        <div className="lp-divider" />

        {/* ── FAQ ── */}
        <Sec id="faq">
          <div className="lp-wrap lp-faq-wrap">
            <SectionHeader tag={t('faq.tag')} heading={t('faq.heading')} />
            {FAQ_KEYS.map((k, i) => <FaqItem key={k} q={t(`faq.items.${k}.q`)} a={t(`faq.items.${k}.a`)} index={i} />)}
          </div>
        </Sec>

        <div className="lp-divider" />

        {/* ── Final CTA ── */}
        <Sec className="lp-final">
          <div className="lp-wrap text-center">
            <div className="lp-lockup">
              <BrandMark size={48} className="text-gold" />
              <BrandWordmark size={28} />
            </div>
            <h2 className="heading-display-xl text-mystic-100 mb-3">{t('finalCta.heading')}</h2>
            <p className="text-body text-mystic-400 mb-8">{t('finalCta.sub')}</p>
            <Button variant="gold" size="lg" onClick={onGetStarted}>
              {t('finalCta.cta')}
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Button>
            <div className="mt-4"><PlayBadge alt={t('play.alt')} /></div>
          </div>
        </Sec>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <BrandMark size={22} className="text-gold" />
                <BrandWordmark size={17} sparkle={false} />
              </div>
              <p className="text-caption text-mystic-500">{t('footer.tagline')}</p>
            </div>
            <div>
              <EyebrowLabel align="left" className="block mb-3">{t('footer.groups.learn')}</EyebrowLabel>
              <ul className="space-y-1">
                <li><FooterLink href="/tarot-meanings">{t('footer.links.cardMeanings')}</FooterLink></li>
                <li><FooterLink href="/spreads">{t('footer.links.spreads')}</FooterLink></li>
                <li><FooterLink href="/astrology">{t('footer.links.astrology')}</FooterLink></li>
                <li><FooterLink href="/numerology">{t('footer.links.numerology')}</FooterLink></li>
                <li><FooterLink href="/crystals">{t('footer.links.crystals')}</FooterLink></li>
                <li><FooterLink href="/glossary">{t('footer.links.glossary')}</FooterLink></li>
                <li><FooterLink href="/blog">{t('footer.links.blog')}</FooterLink></li>
              </ul>
            </div>
            <div>
              <EyebrowLabel align="left" className="block mb-3">{t('footer.groups.app')}</EyebrowLabel>
              <ul className="space-y-1">
                <li><FooterLink href="/signup">{t('footer.links.signUp')}</FooterLink></li>
                <li><FooterLink href="/signin">{t('footer.links.signIn')}</FooterLink></li>
                <li><FooterLink href="/spreads/builder">{t('footer.links.spreadBuilder')}</FooterLink></li>
                <li><FooterLink href={PLAY_STORE_URL} external>{t('footer.links.googlePlay')}</FooterLink></li>
              </ul>
            </div>
            <div>
              <EyebrowLabel align="left" className="block mb-3">{t('footer.groups.company')}</EyebrowLabel>
              <ul className="space-y-1">
                <li><FooterLink href="/privacy-policy.html">{t('footer.links.privacy')}</FooterLink></li>
                <li><FooterLink href="mailto:support@arcana.app">{t('footer.links.contact')}</FooterLink></li>
                <li><FooterLink href="https://yinyangguardian.com/" external>{t('footer.links.shopPartner')}</FooterLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-mystic-700 pt-6">
            <p className="text-caption text-mystic-500 mb-1">{t('footer.disclaimer')}</p>
            <p className="text-caption text-mystic-600">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
