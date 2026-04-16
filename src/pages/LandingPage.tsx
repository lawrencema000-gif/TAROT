import { useState, useEffect, useRef, useCallback } from 'react';
import { setPageMeta, setWebsiteSchema } from '../utils/seo';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

// ─── Data ──────────────────────────────────────────────────────
const ZODIAC = [
  { symbol: '♈', name: 'Aries', element: 'Fire', dates: 'Mar 21 – Apr 19', trait: 'Bold & Ambitious', desc: 'The fearless leader of the zodiac. Driven by passion and a desire to be first in everything they do.' },
  { symbol: '♉', name: 'Taurus', element: 'Earth', dates: 'Apr 20 – May 20', trait: 'Reliable & Patient', desc: 'Grounded and sensual. Taurus finds comfort in stability, beauty, and the finer things in life.' },
  { symbol: '♊', name: 'Gemini', element: 'Air', dates: 'May 21 – Jun 20', trait: 'Curious & Adaptive', desc: 'The social butterfly with a brilliant mind. Gemini thrives on communication and new experiences.' },
  { symbol: '♋', name: 'Cancer', element: 'Water', dates: 'Jun 21 – Jul 22', trait: 'Intuitive & Nurturing', desc: 'Deeply emotional and protective. Cancer creates safe havens and leads with the heart.' },
  { symbol: '♌', name: 'Leo', element: 'Fire', dates: 'Jul 23 – Aug 22', trait: 'Creative & Confident', desc: 'The natural-born star. Leo radiates warmth, generosity, and an irresistible magnetic energy.' },
  { symbol: '♍', name: 'Virgo', element: 'Earth', dates: 'Aug 23 – Sep 22', trait: 'Analytical & Devoted', desc: 'The perfectionist healer. Virgo sees the details others miss and serves with quiet precision.' },
  { symbol: '♎', name: 'Libra', element: 'Air', dates: 'Sep 23 – Oct 22', trait: 'Harmonious & Fair', desc: 'The seeker of balance. Libra brings beauty, diplomacy, and grace to every relationship.' },
  { symbol: '♏', name: 'Scorpio', element: 'Water', dates: 'Oct 23 – Nov 21', trait: 'Intense & Magnetic', desc: 'The transformer of the zodiac. Scorpio sees beneath the surface and embraces the shadows.' },
  { symbol: '♐', name: 'Sagittarius', element: 'Fire', dates: 'Nov 22 – Dec 21', trait: 'Adventurous & Free', desc: 'The eternal explorer. Sagittarius chases truth, wisdom, and the horizon with boundless optimism.' },
  { symbol: '♑', name: 'Capricorn', element: 'Earth', dates: 'Dec 22 – Jan 19', trait: 'Disciplined & Wise', desc: 'The mountain climber. Capricorn builds empires through patience, ambition, and quiet determination.' },
  { symbol: '♒', name: 'Aquarius', element: 'Air', dates: 'Jan 20 – Feb 18', trait: 'Visionary & Original', desc: 'The revolutionary thinker. Aquarius dreams of a better future and dares to be different.' },
  { symbol: '♓', name: 'Pisces', element: 'Water', dates: 'Feb 19 – Mar 20', trait: 'Empathic & Mystical', desc: 'The dreamer of the zodiac. Pisces flows between worlds, channeling intuition and boundless compassion.' },
];

const CARDS_ROW1 = [
  'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor',
  'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit', 'wheel-of-fortune',
];
const CARDS_ROW2 = [
  'justice', 'the-hanged-man', 'death', 'temperance', 'the-devil',
  'the-tower', 'the-star', 'the-moon', 'the-sun', 'judgement', 'the-world',
];

const HERO_ORBIT = [
  { file: 'the-star.webp', angle: -18 },
  { file: 'the-moon.webp', angle: 54 },
  { file: 'the-sun.webp', angle: 126 },
  { file: 'the-empress.webp', angle: 198 },
  { file: 'the-world.webp', angle: 270 },
];

const EL_COLORS: Record<string, string> = { Fire: '#e85d3a', Earth: '#5d9e5a', Air: '#5b9dd9', Water: '#7b68d4' };

const FEATURES = [
  { icon: '✦', title: 'Tarot Readings', desc: 'Full 78-card deck with 6 spread types. Celtic Cross, Relationship, Career, Shadow Work — choose your focus and pull your cards.', size: 'large' },
  { icon: '☉', title: 'Daily Horoscope', desc: 'Personalized forecasts with energy scores, love and career insights, planetary transits, and daily affirmations.', size: 'small' },
  { icon: '✎', title: 'Reflective Journal', desc: 'Track mood with 10 emoji moods, tag entries, and link readings to journal entries over time.', size: 'small' },
  { icon: '◈', title: 'Personality Quizzes', desc: 'MBTI, Enneagram, Big Five, Love Language, Attachment Style — six assessments that shape your experience.', size: 'large' },
  { icon: '↑', title: 'Streaks & XP', desc: 'Earn XP, level up through Seeker Ranks, and unlock achievements as you build your daily habit.', size: 'small' },
  { icon: '☽', title: 'Birth Chart', desc: 'Complete natal chart with planetary placements, aspects, and personalized interpretations.', size: 'small' },
];

const FAQ = [
  { q: 'Is Arcana free to use?', a: 'Yes! Arcana is free with 3 daily tarot readings, daily horoscopes, a full journal, and all personality quizzes. Premium unlocks unlimited readings, all 6 spread types, birth charts, and removes ads.' },
  { q: 'How accurate are the tarot readings?', a: 'Arcana uses a full 78-card tarot deck with detailed traditional meanings for every card — upright and reversed. Readings are designed for self-reflection and personal insight.' },
  { q: 'What personality quizzes are available?', a: 'Six assessments: MBTI (16 types), Enneagram (9 types with wings), Big Five personality traits, Love Language, Attachment Style, and a daily Mood Check.' },
  { q: 'Is my journal private?', a: 'Absolutely. Journal entries are stored securely and only visible to you. Premium members can also lock entries with a password.' },
  { q: 'Is there a premium version?', a: 'Yes! Arcana is completely free to use. When you\'re ready, premium unlocks unlimited readings, all spread types, birth chart analysis, and removes ads. You can explore everything before deciding.' },
  { q: 'Does it work on the web?', a: 'Yes! Use Arcana right here on the web, or download the Android app for offline support and push notifications.' },
];

// ─── Hooks ─────────────────────────────────────────────────────
function useReveal(t = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: t });
    o.observe(el);
    return () => o.disconnect();
  }, [t]);
  return { ref, v };
}

// ─── Stars ─────────────────────────────────────────────────────
function Stars() {
  const s = useRef(Array.from({ length: 80 }, (_, i) => ({
    i, x: Math.random() * 100, y: Math.random() * 100,
    sz: 0.4 + Math.random() * 1.8, dur: 2 + Math.random() * 5,
    del: Math.random() * 5, bright: Math.random() > 0.88,
  }))).current;
  return (
    <div className="lp-stars" aria-hidden="true">
      {s.map(st => <div key={st.i} className={`lp-star ${st.bright ? 'bright' : ''}`}
        style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.sz, height: st.sz,
          animationDuration: `${st.dur}s`, animationDelay: `${st.del}s` }} />)}
    </div>
  );
}

// ─── Particles ─────────────────────────────────────────────────
function Particles() {
  const p = useRef(Array.from({ length: 14 }, (_, i) => ({
    i, x: Math.random() * 100, sz: 1 + Math.random() * 2.5,
    dur: 7 + Math.random() * 14, del: Math.random() * 10,
    drift: -40 + Math.random() * 80, op: 0.1 + Math.random() * 0.35,
  }))).current;
  return (
    <div className="lp-particles" aria-hidden="true">
      {p.map(pt => <div key={pt.i} className="lp-particle" style={{
        left: `${pt.x}%`, '--psize': `${pt.sz}px`, '--pdrift': `${pt.drift}px`,
        '--popacity': pt.op, animationDuration: `${pt.dur}s`, animationDelay: `${pt.del}s`,
      } as React.CSSProperties} />)}
    </div>
  );
}

// ─── Hero Word Reveal ──────────────────────────────────────────
function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="lp-word" style={{ animationDelay: `${delay + i * 0.12}s` }}>
          {word}&nbsp;
        </span>
      ))}
    </span>
  );
}

// ─── Hero Orbiting Cards ───────────────────────────────────────
function OrbitCards() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="lp-orbit">
      <div className="lp-orbit-ring" />
      <div className="lp-orbit-glow" />
      {HERO_ORBIT.map((c, i) => (
        <div key={c.file}
          className={`lp-orbit-card ${hovered === i ? 'hovered' : ''}`}
          style={{ '--angle': `${c.angle}deg`, '--i': i } as React.CSSProperties}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}>
          <img src={`/bundled-cards/major-arcana/${c.file}`} alt="" loading="eager" />
        </div>
      ))}
      {/* Center moon */}
      <div className="lp-orbit-moon">☽</div>
    </div>
  );
}

// ─── Marquee ───────────────────────────────────────────────────
function CardMarquee({ cards, reverse = false }: { cards: string[]; reverse?: boolean }) {
  const doubled = [...cards, ...cards];
  return (
    <div className={`lp-marquee ${reverse ? 'reverse' : ''}`}>
      <div className="lp-marquee-track">
        {doubled.map((card, i) => (
          <div key={`${card}-${i}`} className="lp-marquee-card">
            <img src={`/bundled-cards/major-arcana/${card}.webp`} alt={card.replace(/-/g, ' ')} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Counter ──────────────────────────────────────────
function AnimNum({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        let c = 0; const step = to / 30;
        const iv = setInterval(() => { c += step; if (c >= to) { setN(to); clearInterval(iv); } else setN(Math.floor(c)); }, 40);
      }
    }, { threshold: 0.5 });
    o.observe(el);
    return () => o.disconnect();
  }, [to]);
  return <span ref={ref}>{n}</span>;
}

// ─── Zodiac Wheel ──────────────────────────────────────────────
function ZodiacWheel() {
  const [active, setActive] = useState<number | null>(null);
  const svgSize = 520; const cx = svgSize / 2; const cy = svgSize / 2;
  const rOuter = 230; const rSigns = 190; const rInner = 145; const rCore = 95; const rCenter = 55;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5) * (Math.PI / 180);
    const isMajor = i % 6 === 0;
    const r1 = rOuter - (isMajor ? 10 : 5); const r2 = rOuter;
    return { x1: cx + Math.cos(angle) * r1, y1: cy + Math.sin(angle) * r1, x2: cx + Math.cos(angle) * r2, y2: cy + Math.sin(angle) * r2, major: isMajor };
  });

  return (
    <div className="lp-chart-wrap">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="lp-chart-svg" aria-label="Zodiac wheel">
        <defs>
          <radialGradient id="zg-cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(212,168,83,0.15)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={rCenter + 30} fill="url(#zg-cg)" />
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(212,168,83,0.08)" strokeWidth="1" className="lp-chart-ring-outer" />
        {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? 'rgba(212,168,83,0.2)' : 'rgba(212,168,83,0.07)'} strokeWidth={t.major ? 1 : 0.5} />)}
        <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="rgba(212,168,83,0.05)" strokeWidth="0.5" strokeDasharray="2 6" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={rCore} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        {ZODIAC.map((_, i) => { const a = ((i * 30) - 90) * (Math.PI / 180); return <line key={i} x1={cx + Math.cos(a) * rCore} y1={cy + Math.sin(a) * rCore} x2={cx + Math.cos(a) * rOuter} y2={cy + Math.sin(a) * rOuter} stroke="rgba(212,168,83,0.04)" strokeWidth="0.5" />; })}
        {ZODIAC.map((s, i) => {
          const a = ((i * 30) - 90) * (Math.PI / 180);
          const sa = ((i * 30) - 105) * (Math.PI / 180); const ea = ((i * 30) - 75) * (Math.PI / 180);
          const x = cx + Math.cos(a) * rSigns; const y = cy + Math.sin(a) * rSigns;
          const isA = active === i; const col = EL_COLORS[s.element];
          return (
            <g key={s.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer' }}>
              {isA && <path d={`M ${cx + Math.cos(sa) * rSigns} ${cy + Math.sin(sa) * rSigns} A ${rSigns} ${rSigns} 0 0 1 ${cx + Math.cos(ea) * rSigns} ${cy + Math.sin(ea) * rSigns}`} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" style={{ transition: 'all 0.4s' }} />}
              {isA && <circle cx={x} cy={y} r={24} fill={col} opacity={0.08} />}
              <circle cx={x} cy={y} r={20} fill={isA ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'} stroke={isA ? col : 'rgba(212,168,83,0.1)'} strokeWidth={isA ? 1.5 : 0.5} style={{ transition: 'all 0.35s' }} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={isA ? 18 : 15} fill={isA ? col : 'rgba(212,168,83,0.6)'} style={{ transition: 'all 0.35s', fontFamily: 'serif' }}>{s.symbol}</text>
              {isA && <text x={cx + Math.cos(a) * (rOuter + 20)} y={cy + Math.sin(a) * (rOuter + 20)} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={col} fontWeight={500} fontFamily="'Cormorant Garamond', serif" letterSpacing="0.05em">{s.name}</text>}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={rCenter} fill="rgba(5,5,8,0.8)" stroke="rgba(212,168,83,0.08)" strokeWidth="0.5" />
        <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke="rgba(212,168,83,0.1)" strokeWidth="0.5" />
        <line x1={cx} y1={cy - 20} x2={cx} y2={cy + 20} stroke="rgba(212,168,83,0.1)" strokeWidth="0.5" />
        {[0, 90, 180, 270].map(d => { const a = d * (Math.PI / 180); return <circle key={d} cx={cx + Math.cos(a) * 15} cy={cy + Math.sin(a) * 15} r={1.5} fill="rgba(212,168,83,0.3)" />; })}
      </svg>
      <div className="lp-chart-center-info">
        {active !== null ? (<>
          <div className="lp-chart-ci-sym" style={{ color: EL_COLORS[ZODIAC[active].element] }}>{ZODIAC[active].symbol}</div>
          <div className="lp-chart-ci-name">{ZODIAC[active].name}</div>
          <div className="lp-chart-ci-trait" style={{ color: EL_COLORS[ZODIAC[active].element] }}>{ZODIAC[active].trait}</div>
          <div className="lp-chart-ci-dates">{ZODIAC[active].dates}</div>
        </>) : (<>
          <div className="lp-chart-ci-sym" style={{ color: 'var(--g)', fontSize: '1.6rem' }}>☉</div>
          <div className="lp-chart-ci-name">The Zodiac</div>
          <div className="lp-chart-ci-el" style={{ opacity: 0.35 }}>Hover to explore</div>
        </>)}
      </div>
      {active !== null && (
        <div className="lp-chart-popup" style={{ '--el-color': EL_COLORS[ZODIAC[active].element] } as React.CSSProperties}>
          <div className="lp-chart-popup-header">
            <span className="lp-chart-popup-sym">{ZODIAC[active].symbol}</span>
            <div>
              <div className="lp-chart-popup-name">{ZODIAC[active].name}</div>
              <div className="lp-chart-popup-meta">{ZODIAC[active].element} · {ZODIAC[active].dates}</div>
            </div>
          </div>
          <div className="lp-chart-popup-trait">{ZODIAC[active].trait}</div>
          <div className="lp-chart-popup-desc">{ZODIAC[active].desc}</div>
        </div>
      )}
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────
function FaqItem({ q, a, i: idx }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  const { ref, v } = useReveal();
  return (
    <div ref={ref} className={`lp-faq ${open ? 'open' : ''} ${v ? 'vis' : ''}`} style={{ transitionDelay: `${idx * 60}ms` }}>
      <button className="lp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span><span className="lp-faq-plus">+</span>
      </button>
      <div className="lp-faq-a"><p>{a}</p></div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────
function Sec({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
  const { ref, v } = useReveal();
  return <section ref={ref} id={id} className={`lp-sec ${v ? 'vis' : ''} ${className}`}>{children}</section>;
}

// ─── Google Play Badge ─────────────────────────────────────────
function PlayBadge() {
  return (
    <a href="https://play.google.com/store/apps/details?id=com.arcana.app" target="_blank" rel="noopener noreferrer" className="lp-play-badge">
      <svg className="lp-play-badge-icon" viewBox="0 0 24 24" fill="none">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
        <path d="M17.556 8.235L5.016.907a1.005 1.005 0 00-1.02-.011l9.796 11.1 3.764-3.76z" fill="#34A853"/>
        <path d="M17.556 15.765l-3.764-3.761-9.796 11.1c.325.186.727.2 1.064-.012l12.496-7.327z" fill="#EA4335"/>
        <path d="M21.395 10.486l-3.84-2.25-4.149 4.149 4.108 4.108 3.88-2.279c.779-.457.779-1.578.001-1.728z" fill="#FBBC05"/>
      </svg>
      <span className="lp-play-badge-text">
        <span className="lp-play-badge-label">Get it on</span>
        <span className="lp-play-badge-store">Google Play</span>
      </span>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [navSolid, setNavSolid] = useState(false);

  const onScroll = useCallback(() => { setNavSolid(window.scrollY > 50); }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    setPageMeta('Daily Tarot, Horoscope & Journal');
    setWebsiteSchema();
  }, []);

  return (
    <div className="lp-root">
      {/* Noise overlay */}
      <div className="lp-noise" aria-hidden="true" />
      <Stars />
      <Particles />

      {/* ── Nav ── */}
      <nav className={`lp-nav ${navSolid ? 'solid' : ''}`}>
        <div className="lp-nav-in">
          <div className="lp-nav-brand"><span className="lp-nav-moon">☽</span><span className="lp-nav-name">Arcana</span></div>
          <div className="lp-nav-right">
            <a href="/tarot-meanings" className="lp-nav-link">Card Meanings</a>
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#zodiac" className="lp-nav-link">Zodiac</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <button onClick={onSignIn} className="lp-nav-btn">Sign In</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-orb o1" /><div className="lp-hero-orb o2" /><div className="lp-hero-orb o3" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge"><span className="lp-hero-badge-dot" />Personalized tarot & astrology</div>
          <h1 className="lp-hero-h1">
            <WordReveal text="Know yourself." className="lp-hero-line1" />
            <br />
            <WordReveal text="One ritual a day." className="lp-shimmer" delay={0.5} />
          </h1>
          <p className="lp-hero-sub lp-fade-in" style={{ animationDelay: '1.2s' }}>
            Daily tarot readings, personalized horoscopes, reflective journaling, and personality quizzes — all in one beautifully crafted app.
          </p>
          <div className="lp-hero-ctas lp-fade-in" style={{ animationDelay: '1.6s' }}>
            <button onClick={onGetStarted} className="lp-btn-gold">
              <span className="lp-btn-gold-glow" />Get Started Free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <PlayBadge />
          </div>
          <p className="lp-hero-note lp-fade-in" style={{ animationDelay: '1.9s' }}>Free to start · No credit card required</p>
        </div>

        <div className="lp-hero-visual lp-fade-in" style={{ animationDelay: '0.8s' }}>
          <OrbitCards />
        </div>
      </section>

      {/* ── Gradient divider ── */}
      <div className="lp-divider" />

      {/* ── Trust ── */}
      <Sec className="lp-trust">
        <div className="lp-wrap">
          <div className="lp-trust-grid">
            {[{ n: 78, l: 'Tarot Cards', s: 'Full traditional deck' }, { n: 6, l: 'Spread Types', s: 'Daily to Celtic Cross' }, { n: 5, l: 'Personality Tests', s: 'MBTI, Enneagram & more' }, { n: 12, l: 'Zodiac Signs', s: 'Updated daily' }].map(st => (
              <div key={st.l} className="lp-trust-item">
                <div className="lp-trust-num"><AnimNum to={st.n} /></div>
                <div className="lp-trust-label">{st.l}</div>
                <div className="lp-trust-sub">{st.s}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      <div className="lp-divider" />

      {/* ── Features (Bento) ── */}
      <Sec id="features">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">Features</span>
            <h2 className="lp-h2">A complete spiritual toolkit</h2>
            <p className="lp-sub">Everything you need for your daily practice, designed to help you grow one day at a time.</p>
          </div>
          <div className="lp-bento">
            {FEATURES.map((f, i) => {
              const { ref, v } = useReveal();
              return (
                <div ref={ref} key={f.title} className={`lp-bento-card ${f.size} ${v ? 'vis' : ''}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="lp-bento-icon">{f.icon}</div>
                  <h3 className="lp-bento-title">{f.title}</h3>
                  <p className="lp-bento-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Sec>

      <div className="lp-divider" />

      {/* ── Card Showcase (Dual Marquee) ── */}
      <Sec className="lp-showcase">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">The Deck</span>
            <h2 className="lp-h2">78 beautifully illustrated cards</h2>
            <p className="lp-sub">Every card in the traditional tarot, with detailed interpretations for upright and reversed positions.</p>
          </div>
        </div>
        <CardMarquee cards={CARDS_ROW1} />
        <CardMarquee cards={CARDS_ROW2} reverse />
      </Sec>

      <div className="lp-divider" />

      {/* ── Zodiac ── */}
      <Sec id="zodiac">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">The Zodiac</span>
            <h2 className="lp-h2">Written in the stars</h2>
            <p className="lp-sub">Personalized horoscopes for all 12 signs, updated daily with cosmic precision.</p>
          </div>
          <ZodiacWheel />
        </div>
      </Sec>

      <div className="lp-divider" />

      {/* ── Daily Ritual (Timeline) ── */}
      <Sec>
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">Your Daily Ritual</span>
            <h2 className="lp-h2">Three steps. Every day.</h2>
            <p className="lp-sub">Complete all three to maintain your streak and level up through Seeker Ranks.</p>
          </div>
          <div className="lp-timeline">
            {[
              { n: '01', icon: '☉', title: 'Read Your Horoscope', desc: 'Start with your personalized daily forecast. See your energy score and what the cosmos has in store.' },
              { n: '02', icon: '🂠', title: 'Pull Your Card', desc: 'Draw a tarot card for daily guidance. Reflect on its meaning and how it connects to your current chapter.' },
              { n: '03', icon: '✎', title: 'Write a Reflection', desc: 'Journal your thoughts using a guided prompt or free-write. Link your entry to today\'s reading.' },
            ].map((s, i) => {
              const { ref, v } = useReveal();
              return (
                <div ref={ref} key={s.n} className={`lp-timeline-item ${i % 2 === 1 ? 'right' : 'left'} ${v ? 'vis' : ''}`} style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="lp-timeline-dot" />
                  <div className="lp-timeline-card">
                    <div className="lp-timeline-watermark">{s.n}</div>
                    <div className="lp-timeline-icon">{s.icon}</div>
                    <h3 className="lp-timeline-title">{s.title}</h3>
                    <p className="lp-timeline-desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
            <div className="lp-timeline-line" />
          </div>
        </div>
      </Sec>

      <div className="lp-divider" />

      {/* ── FAQ ── */}
      <Sec id="faq">
        <div className="lp-wrap lp-faq-wrap">
          <div className="lp-header"><span className="lp-tag">FAQ</span><h2 className="lp-h2">Common questions</h2></div>
          {FAQ.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} i={i} />)}
        </div>
      </Sec>

      <div className="lp-divider" />

      {/* ── Final CTA ── */}
      <Sec className="lp-cta-final">
        <div className="lp-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-cta-moon-wrap">
            <div className="lp-cta-moon">☽</div>
            <div className="lp-cta-ray r1" /><div className="lp-cta-ray r2" /><div className="lp-cta-ray r3" /><div className="lp-cta-ray r4" />
          </div>
          <h2 className="lp-h2" style={{ marginBottom: 12 }}>Begin your journey</h2>
          <p className="lp-sub" style={{ marginBottom: 40 }}>Start your first daily ritual today.</p>
          <button onClick={onGetStarted} className="lp-btn-gold lp-btn-lg">
            <span className="lp-btn-gold-glow" />Get Started Free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{ marginTop: 20 }}><PlayBadge /></div>
        </div>
      </Sec>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <div className="lp-footer-brand"><span className="lp-nav-moon">☽</span><span className="lp-nav-name">Arcana</span></div>
            <div className="lp-footer-links">
              <a href="/privacy-policy.html">Privacy Policy</a>
              <a href="/blog">Blog</a>
              <a href="mailto:support@arcana.app">Contact</a>
              <a href="https://play.google.com/store/apps/details?id=com.arcana.app" target="_blank" rel="noopener noreferrer">Google Play</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>For entertainment and self-reflection purposes only.</p>
            <p>&copy; 2026 Arcana. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
