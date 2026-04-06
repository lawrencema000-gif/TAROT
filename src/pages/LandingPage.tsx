import { useState, useEffect, useRef, useCallback } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

// ─── Real Data ─────────────────────────────────────────────────
const ZODIAC_SIGNS = [
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

const HERO_CARDS = [
  { name: 'The Star', file: 'the-star.webp' },
  { name: 'The Moon', file: 'the-moon.webp' },
  { name: 'The Sun', file: 'the-sun.webp' },
  { name: 'The Empress', file: 'the-empress.webp' },
  { name: 'The Magician', file: 'the-magician.webp' },
];

const CARD_FAN = [
  { file: 'the-fool.webp', rotation: -18, x: -100, delay: 0 },
  { file: 'the-high-priestess.webp', rotation: -9, x: -50, delay: 0.1 },
  { file: 'the-star.webp', rotation: 0, x: 0, delay: 0.2 },
  { file: 'the-moon.webp', rotation: 9, x: 50, delay: 0.3 },
  { file: 'the-world.webp', rotation: 18, x: 100, delay: 0.4 },
];

// ─── Scroll Reveal Hook ────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Animated Number ───────────────────────────────────────────
function AnimNum({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        let c = 0;
        const step = to / 30;
        const iv = setInterval(() => {
          c += step;
          if (c >= to) { setN(to); clearInterval(iv); }
          else setN(Math.floor(c));
        }, 40);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{n}{suffix}</span>;
}

// ─── Star Field ────────────────────────────────────────────────
function Stars() {
  const stars = useRef(
    Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 1.8,
      dur: 2 + Math.random() * 5,
      delay: Math.random() * 5,
      bright: Math.random() > 0.85,
    }))
  ).current;

  return (
    <div className="lp-stars" aria-hidden="true">
      {stars.map(s => (
        <div
          key={s.id}
          className={`lp-star ${s.bright ? 'bright' : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Particles ─────────────────────────────────────────────────
function Particles() {
  const p = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 1 + Math.random() * 2,
      dur: 8 + Math.random() * 12,
      delay: Math.random() * 10,
      drift: -40 + Math.random() * 80,
      opacity: 0.1 + Math.random() * 0.35,
    }))
  ).current;

  return (
    <div className="lp-particles" aria-hidden="true">
      {p.map(pt => (
        <div
          key={pt.id}
          className="lp-particle"
          style={{
            left: `${pt.x}%`,
            '--psize': `${pt.size}px`,
            '--pdrift': `${pt.drift}px`,
            '--popacity': pt.opacity,
            animationDuration: `${pt.dur}s`,
            animationDelay: `${pt.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Zodiac Celestial Chart ────────────────────────────────────
const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#e85d3a',
  Earth: '#5d9e5a',
  Air: '#5b9dd9',
  Water: '#7b68d4',
};

function ZodiacWheel() {
  const [active, setActive] = useState<number | null>(null);
  const svgSize = 520;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  // Radii for different rings
  const rOuter = 230;
  const rSigns = 190;
  const rInner = 145;
  const rCore = 95;
  const rCenter = 55;

  // Tick marks around outer ring
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5) * (Math.PI / 180);
    const isMajor = i % 6 === 0;
    const r1 = rOuter - (isMajor ? 10 : 5);
    const r2 = rOuter;
    return {
      x1: cx + Math.cos(angle) * r1,
      y1: cy + Math.sin(angle) * r1,
      x2: cx + Math.cos(angle) * r2,
      y2: cy + Math.sin(angle) * r2,
      major: isMajor,
    };
  });

  return (
    <div className="lp-chart-wrap">
      <svg
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="lp-chart-svg"
        aria-label="Zodiac wheel"
      >
        <defs>
          {/* Gold radial glow for center */}
          <radialGradient id="zg-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212,168,83,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Outer ring gradient */}
          <linearGradient id="zg-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(212,168,83,0.12)" />
            <stop offset="50%" stopColor="rgba(212,168,83,0.04)" />
            <stop offset="100%" stopColor="rgba(212,168,83,0.12)" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx={cx} cy={cy} r={rCenter + 30} fill="url(#zg-center-glow)" />

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(212,168,83,0.08)" strokeWidth="1" className="lp-chart-ring-outer" />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.major ? 'rgba(212,168,83,0.2)' : 'rgba(212,168,83,0.07)'}
            strokeWidth={t.major ? 1 : 0.5}
          />
        ))}

        {/* Sign ring */}
        <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="rgba(212,168,83,0.05)" strokeWidth="0.5" strokeDasharray="2 6" />

        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* Core ring */}
        <circle cx={cx} cy={cy} r={rCore} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

        {/* Dividing lines from center through each sign */}
        {ZODIAC_SIGNS.map((_, i) => {
          const angle = ((i * 30) - 90) * (Math.PI / 180);
          return (
            <line key={i}
              x1={cx + Math.cos(angle) * rCore}
              y1={cy + Math.sin(angle) * rCore}
              x2={cx + Math.cos(angle) * rOuter}
              y2={cy + Math.sin(angle) * rOuter}
              stroke="rgba(212,168,83,0.04)" strokeWidth="0.5"
            />
          );
        })}

        {/* Element arc segments behind each sign */}
        {ZODIAC_SIGNS.map((s, i) => {
          const startAngle = ((i * 30) - 105) * (Math.PI / 180);
          const endAngle = ((i * 30) - 75) * (Math.PI / 180);
          const r = rSigns;
          const isActive = active === i;
          return (
            <path key={`arc-${i}`}
              d={`M ${cx + Math.cos(startAngle) * r} ${cy + Math.sin(startAngle) * r} A ${r} ${r} 0 0 1 ${cx + Math.cos(endAngle) * r} ${cy + Math.sin(endAngle) * r}`}
              fill="none"
              stroke={isActive ? ELEMENT_COLORS[s.element] : 'transparent'}
              strokeWidth={isActive ? 3 : 0}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.4s, stroke-width 0.4s' }}
            />
          );
        })}

        {/* Zodiac signs */}
        {ZODIAC_SIGNS.map((s, i) => {
          const angle = ((i * 30) - 90) * (Math.PI / 180);
          const x = cx + Math.cos(angle) * rSigns;
          const y = cy + Math.sin(angle) * rSigns;
          const isActive = active === i;
          const elColor = ELEMENT_COLORS[s.element];

          return (
            <g key={s.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow behind active sign */}
              {isActive && (
                <circle cx={x} cy={y} r={24} fill={elColor} opacity={0.08}
                  style={{ transition: 'opacity 0.3s' }}
                />
              )}
              {/* Sign circle */}
              <circle cx={x} cy={y} r={20}
                fill={isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'}
                stroke={isActive ? elColor : 'rgba(212,168,83,0.1)'}
                strokeWidth={isActive ? 1.5 : 0.5}
                style={{ transition: 'all 0.35s' }}
              />
              {/* Symbol */}
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                fontSize={isActive ? 18 : 15}
                fill={isActive ? elColor : 'rgba(212,168,83,0.6)'}
                style={{ transition: 'all 0.35s', fontFamily: 'serif' }}
              >
                {s.symbol}
              </text>
              {/* Name label (outside ring, only when active) */}
              {isActive && (
                <text
                  x={cx + Math.cos(angle) * (rOuter + 20)}
                  y={cy + Math.sin(angle) * (rOuter + 20)}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={11} fill={elColor} fontWeight={500}
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  letterSpacing="0.05em"
                  style={{ opacity: 0.9 }}
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Center decoration */}
        <circle cx={cx} cy={cy} r={rCenter} fill="rgba(5,5,8,0.8)" stroke="rgba(212,168,83,0.08)" strokeWidth="0.5" />

        {/* Center cross-hair lines */}
        <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke="rgba(212,168,83,0.1)" strokeWidth="0.5" />
        <line x1={cx} y1={cy - 20} x2={cx} y2={cy + 20} stroke="rgba(212,168,83,0.1)" strokeWidth="0.5" />

        {/* Small dots at cardinal points */}
        {[0, 90, 180, 270].map(deg => {
          const a = deg * (Math.PI / 180);
          return <circle key={deg} cx={cx + Math.cos(a) * 15} cy={cy + Math.sin(a) * 15} r={1.5} fill="rgba(212,168,83,0.3)" />;
        })}
      </svg>

      {/* Center info overlay */}
      <div className="lp-chart-center-info">
        {active !== null ? (
          <>
            <div className="lp-chart-ci-sym" style={{ color: ELEMENT_COLORS[ZODIAC_SIGNS[active].element] }}>
              {ZODIAC_SIGNS[active].symbol}
            </div>
            <div className="lp-chart-ci-name">{ZODIAC_SIGNS[active].name}</div>
            <div className="lp-chart-ci-trait" style={{ color: ELEMENT_COLORS[ZODIAC_SIGNS[active].element] }}>
              {ZODIAC_SIGNS[active].trait}
            </div>
            <div className="lp-chart-ci-dates">{ZODIAC_SIGNS[active].dates}</div>
          </>
        ) : (
          <>
            <div className="lp-chart-ci-sym" style={{ color: 'var(--g)', fontSize: '1.6rem' }}>☉</div>
            <div className="lp-chart-ci-name">The Zodiac</div>
            <div className="lp-chart-ci-el" style={{ opacity: 0.35 }}>Hover to explore</div>
          </>
        )}
      </div>

      {/* Popup card for hovered sign */}
      {active !== null && (
        <div className="lp-chart-popup" style={{ '--el-color': ELEMENT_COLORS[ZODIAC_SIGNS[active].element] } as React.CSSProperties}>
          <div className="lp-chart-popup-header">
            <span className="lp-chart-popup-sym">{ZODIAC_SIGNS[active].symbol}</span>
            <div>
              <div className="lp-chart-popup-name">{ZODIAC_SIGNS[active].name}</div>
              <div className="lp-chart-popup-meta">{ZODIAC_SIGNS[active].element} · {ZODIAC_SIGNS[active].dates}</div>
            </div>
          </div>
          <div className="lp-chart-popup-trait">{ZODIAC_SIGNS[active].trait}</div>
          <div className="lp-chart-popup-desc">{ZODIAC_SIGNS[active].desc}</div>
        </div>
      )}
    </div>
  );
}

// ─── Card Fan (Hero) ───────────────────────────────────────────
function CardFan() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="lp-cardfan">
      {CARD_FAN.map((card, i) => (
        <div
          key={card.file}
          className={`lp-cardfan-card ${hoveredIdx === i ? 'hovered' : ''}`}
          style={{
            '--rot': `${card.rotation}deg`,
            '--tx': `${card.x}px`,
            '--delay': `${card.delay}s`,
            zIndex: hoveredIdx === i ? 10 : 5 - Math.abs(i - 2),
          } as React.CSSProperties}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <img
            src={`/bundled-cards/major-arcana/${card.file}`}
            alt=""
            className="lp-cardfan-img"
            loading="eager"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`lp-fcard ${visible ? 'vis' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="lp-fcard-icon">{icon}</div>
      <h3 className="lp-fcard-title">{title}</h3>
      <p className="lp-fcard-desc">{desc}</p>
    </div>
  );
}

// ─── FAQ Item ──────────────────────────────────────────────────
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq ${open ? 'open' : ''}`}>
      <button className="lp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className="lp-faq-plus">+</span>
      </button>
      <div className="lp-faq-a"><p>{a}</p></div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────
function Sec({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <section ref={ref} id={id} className={`lp-sec ${visible ? 'vis' : ''} ${className}`}>
      {children}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [navSolid, setNavSolid] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const onScroll = useCallback(() => {
    setScrollY(window.scrollY);
    setNavSolid(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <div className="lp-root">
      <Stars />
      <Particles />

      {/* ── Nav ── */}
      <nav className={`lp-nav ${navSolid ? 'solid' : ''}`}>
        <div className="lp-nav-in">
          <div className="lp-nav-brand">
            <span className="lp-nav-moon">☽</span>
            <span className="lp-nav-name">Arcana</span>
          </div>
          <div className="lp-nav-right">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#zodiac" className="lp-nav-link">Zodiac</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <button onClick={onSignIn} className="lp-nav-btn">Sign In</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg-glow" style={{ transform: `translateY(${scrollY * 0.12}px)` }} />
        <div className="lp-hero-orb o1" />
        <div className="lp-hero-orb o2" />
        <div className="lp-hero-orb o3" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" />
            Personalized tarot & astrology
          </div>

          <h1 className="lp-hero-h1">
            Know yourself.
            <br />
            <span className="lp-shimmer">One ritual a day.</span>
          </h1>

          <p className="lp-hero-sub">
            Daily tarot readings, personalized horoscopes, reflective
            journaling, and personality quizzes — all in one beautifully crafted app.
          </p>

          <div className="lp-hero-ctas">
            <button onClick={onGetStarted} className="lp-btn-gold">
              <span className="lp-btn-gold-glow" />
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <a
              href="https://play.google.com/store/apps/details?id=com.arcana.app"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn-ghost"
            >
              Download for Android
            </a>
          </div>

          <p className="lp-hero-note">Free forever · No credit card required</p>
        </div>

        <div className="lp-hero-visual" style={{ transform: `translateY(${scrollY * -0.08}px)` }}>
          <CardFan />
        </div>
      </section>

      {/* ── Logos / Trust Strip ── */}
      <Sec className="lp-trust">
        <div className="lp-wrap">
          <div className="lp-trust-grid">
            {[
              { n: '78', l: 'Tarot Cards', sub: 'Full traditional deck' },
              { n: '6', l: 'Spread Types', sub: 'From daily to Celtic Cross' },
              { n: '5', l: 'Personality Tests', sub: 'MBTI, Enneagram & more' },
              { n: '12', l: 'Zodiac Signs', sub: 'Updated daily' },
            ].map(s => (
              <div key={s.l} className="lp-trust-item">
                <div className="lp-trust-num"><AnimNum to={parseInt(s.n)} /></div>
                <div className="lp-trust-label">{s.l}</div>
                <div className="lp-trust-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── Features ── */}
      <Sec id="features">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">Features</span>
            <h2 className="lp-h2">A complete spiritual toolkit</h2>
            <p className="lp-sub">Everything you need for your daily practice, designed to help you grow one day at a time.</p>
          </div>
          <div className="lp-fgrid">
            {[
              { icon: '🃏', title: 'Tarot Readings', desc: 'Full 78-card deck with detailed upright and reversed meanings. 6 spread types including Celtic Cross, Relationship, Career Decision, and Shadow Work.' },
              { icon: '✨', title: 'Daily Horoscope', desc: 'Personalized forecasts with energy scores, mood analysis, love and career insights, planetary transits, and daily affirmations.' },
              { icon: '📓', title: 'Reflective Journal', desc: 'Write freely or use guided prompts. Track mood with 10 emoji moods, tag entries, and link to your tarot readings.' },
              { icon: '🧠', title: 'Personality Quizzes', desc: 'MBTI, Enneagram, Big Five, Love Language, and Attachment Style. Results shape your entire experience.' },
              { icon: '🔥', title: 'Streaks & XP', desc: 'Build daily habits. Earn XP, level up through Seeker Ranks, and unlock achievements as you grow.' },
              { icon: '🌙', title: 'Birth Chart', desc: 'Enter your birth details for your complete natal chart with planetary placements and personalized interpretations.' },
            ].map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 80} />
            ))}
          </div>
        </div>
      </Sec>

      {/* ── Card Showcase ── */}
      <Sec className="lp-showcase">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">The Deck</span>
            <h2 className="lp-h2">78 beautifully illustrated cards</h2>
            <p className="lp-sub">Every card in the traditional Rider-Waite tradition, with detailed interpretations for upright and reversed positions.</p>
          </div>
          <div className="lp-showcase-scroll">
            {[
              'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor',
              'the-hierophant', 'the-lovers', 'the-chariot', 'strength', 'the-hermit',
              'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance',
              'the-devil', 'the-tower', 'the-star', 'the-moon', 'the-sun', 'judgement', 'the-world',
            ].map((card) => (
              <div key={card} className="lp-showcase-card">
                <img
                  src={`/bundled-cards/major-arcana/${card}.webp`}
                  alt={card.replace(/-/g, ' ').replace('the ', 'The ')}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* ── Zodiac ── */}
      <Sec id="zodiac" className="lp-zodiac-sec">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">The Zodiac</span>
            <h2 className="lp-h2">Written in the stars</h2>
            <p className="lp-sub">Personalized horoscopes for all 12 signs, updated daily with cosmic precision.</p>
          </div>
          <ZodiacWheel />
        </div>
      </Sec>

      {/* ── Ritual Steps ── */}
      <Sec>
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">Your Daily Ritual</span>
            <h2 className="lp-h2">Three steps. Every day.</h2>
            <p className="lp-sub">Complete all three to maintain your streak and level up through Seeker Ranks.</p>
          </div>
          <div className="lp-steps">
            {[
              { n: '01', icon: '☉', title: 'Read Your Horoscope', desc: 'Start with your personalized daily forecast. See your energy score and what the cosmos has in store.' },
              { n: '02', icon: '🂠', title: 'Pull Your Card', desc: 'Draw a tarot card for daily guidance. Reflect on its meaning and how it connects to your current chapter.' },
              { n: '03', icon: '✎', title: 'Write a Reflection', desc: 'Journal your thoughts using a guided prompt or free-write. Link your entry to today\'s reading.' },
            ].map((s, i) => {
              const { ref, visible } = useReveal();
              return (
                <div ref={ref} key={s.n} className={`lp-step ${visible ? 'vis' : ''}`} style={{ transitionDelay: `${i * 120}ms` }}>
                  <div className="lp-step-num">{s.n}</div>
                  <div className="lp-step-icon">{s.icon}</div>
                  <h3 className="lp-step-title">{s.title}</h3>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Sec>

      {/* ── FAQ ── */}
      <Sec id="faq">
        <div className="lp-wrap lp-faq-wrap">
          <div className="lp-header">
            <span className="lp-tag">FAQ</span>
            <h2 className="lp-h2">Common questions</h2>
          </div>
          {[
            { q: 'Is Arcana free to use?', a: 'Yes! Arcana is free with 3 daily tarot readings, daily horoscopes, a full journal, and all personality quizzes. Premium unlocks unlimited readings, all 6 spread types, birth charts, and removes ads.' },
            { q: 'How accurate are the tarot readings?', a: 'Arcana uses a full 78-card tarot deck with detailed traditional meanings for every card — upright and reversed. Readings are designed for self-reflection and personal insight.' },
            { q: 'What personality quizzes are available?', a: 'Six assessments: MBTI (16 types), Enneagram (9 types with wings), Big Five personality traits, Love Language, Attachment Style, and a daily Mood Check.' },
            { q: 'Is my journal private?', a: 'Absolutely. Journal entries are stored securely and only visible to you. Premium members can also lock entries with a password.' },
            { q: 'Is there a premium version?', a: 'Yes! Arcana is completely free to use. When you\'re ready, premium unlocks unlimited readings, all spread types, birth chart analysis, and removes ads. You can explore everything before deciding.' },
            { q: 'Does it work on the web?', a: 'Yes! Use Arcana right here on the web, or download the Android app for offline support and push notifications.' },
          ].map(f => <Faq key={f.q} {...f} />)}
        </div>
      </Sec>

      {/* ── Final CTA ── */}
      <Sec className="lp-cta-final">
        <div className="lp-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-cta-moon">☽</div>
          <h2 className="lp-h2" style={{ marginBottom: 12 }}>Begin your journey</h2>
          <p className="lp-sub" style={{ marginBottom: 40 }}>Start your first daily ritual today.</p>
          <button onClick={onGetStarted} className="lp-btn-gold lp-btn-lg">
            <span className="lp-btn-gold-glow" />
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </Sec>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <span className="lp-nav-moon">☽</span>
              <span className="lp-nav-name">Arcana</span>
            </div>
            <div className="lp-footer-links">
              <a href="/privacy-policy.html">Privacy Policy</a>
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
