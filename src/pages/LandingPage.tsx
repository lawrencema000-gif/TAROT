import { useState, useEffect, useRef, useCallback } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

// ─── Real Data ─────────────────────────────────────────────────
const ZODIAC_SIGNS = [
  { symbol: '♈', name: 'Aries', element: 'Fire', dates: 'Mar 21 – Apr 19' },
  { symbol: '♉', name: 'Taurus', element: 'Earth', dates: 'Apr 20 – May 20' },
  { symbol: '♊', name: 'Gemini', element: 'Air', dates: 'May 21 – Jun 20' },
  { symbol: '♋', name: 'Cancer', element: 'Water', dates: 'Jun 21 – Jul 22' },
  { symbol: '♌', name: 'Leo', element: 'Fire', dates: 'Jul 23 – Aug 22' },
  { symbol: '♍', name: 'Virgo', element: 'Earth', dates: 'Aug 23 – Sep 22' },
  { symbol: '♎', name: 'Libra', element: 'Air', dates: 'Sep 23 – Oct 22' },
  { symbol: '♏', name: 'Scorpio', element: 'Water', dates: 'Oct 23 – Nov 21' },
  { symbol: '♐', name: 'Sagittarius', element: 'Fire', dates: 'Nov 22 – Dec 21' },
  { symbol: '♑', name: 'Capricorn', element: 'Earth', dates: 'Dec 22 – Jan 19' },
  { symbol: '♒', name: 'Aquarius', element: 'Air', dates: 'Jan 20 – Feb 18' },
  { symbol: '♓', name: 'Pisces', element: 'Water', dates: 'Feb 19 – Mar 20' },
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

// ─── Zodiac Wheel ──────────────────────────────────────────────
function ZodiacWheel() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const radius = 155;

  return (
    <div className="lp-zodiac-outer">
      <div
        className={`lp-zodiac ${paused ? 'paused' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); setHovered(null); }}
      >
        {/* Rings */}
        <div className="lp-zodiac-ring r1" />
        <div className="lp-zodiac-ring r2" />
        <div className="lp-zodiac-ring r3" />

        {/* Signs */}
        {ZODIAC_SIGNS.map((s, i) => {
          const a = (i * 30) - 90;
          const x = Math.cos((a * Math.PI) / 180) * radius;
          const y = Math.sin((a * Math.PI) / 180) * radius;
          return (
            <div
              key={s.name}
              className={`lp-zodiac-sign ${hovered === i ? 'active' : ''}`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="lp-zodiac-glyph">{s.symbol}</span>
            </div>
          );
        })}

        {/* Center */}
        <div className="lp-zodiac-center">
          {hovered !== null ? (
            <>
              <div className="lp-zodiac-c-sym">{ZODIAC_SIGNS[hovered].symbol}</div>
              <div className="lp-zodiac-c-name">{ZODIAC_SIGNS[hovered].name}</div>
              <div className="lp-zodiac-c-el">{ZODIAC_SIGNS[hovered].element}</div>
              <div className="lp-zodiac-c-dates">{ZODIAC_SIGNS[hovered].dates}</div>
            </>
          ) : (
            <>
              <div className="lp-zodiac-c-sym" style={{ fontSize: '2rem' }}>☉</div>
              <div className="lp-zodiac-c-name">The Zodiac</div>
              <div className="lp-zodiac-c-el" style={{ opacity: 0.4 }}>Hover to explore</div>
            </>
          )}
        </div>
      </div>
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
            <a href="#pricing" className="lp-nav-link">Pricing</a>
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

      {/* ── Pricing ── */}
      <Sec id="pricing">
        <div className="lp-wrap">
          <div className="lp-header">
            <span className="lp-tag">Pricing</span>
            <h2 className="lp-h2">Start free. Upgrade when ready.</h2>
            <p className="lp-sub">Generous free tier with everything you need to begin.</p>
          </div>
          <div className="lp-pricing">
            <div className="lp-price-card">
              <h3 className="lp-price-name">Free</h3>
              <div className="lp-price-amount">$0</div>
              <div className="lp-price-period">Free forever</div>
              <ul className="lp-price-list">
                <li>3 daily tarot readings</li>
                <li>Single card spread</li>
                <li>Daily horoscope</li>
                <li>Full journal with mood tracking</li>
                <li>All 6 personality quizzes</li>
                <li>10 saved readings</li>
                <li>Streaks, XP & achievements</li>
              </ul>
              <button onClick={onGetStarted} className="lp-price-btn">Get Started</button>
            </div>

            <div className="lp-price-card featured">
              <div className="lp-price-badge">Best Value</div>
              <h3 className="lp-price-name">Premium Yearly</h3>
              <div className="lp-price-amount">$24.99</div>
              <div className="lp-price-period">per year · saves 58%</div>
              <ul className="lp-price-list">
                <li>Unlimited tarot readings</li>
                <li>All 6 spread types</li>
                <li>Birth chart analysis</li>
                <li>Weekly & monthly forecasts</li>
                <li>Deep card interpretations</li>
                <li>Unlimited saves</li>
                <li>Journal locking & insights</li>
                <li>Ad-free experience</li>
              </ul>
              <button onClick={onGetStarted} className="lp-price-btn gold">Start Premium</button>
            </div>

            <div className="lp-price-card">
              <div className="lp-price-badge alt">Forever Access</div>
              <h3 className="lp-price-name">Lifetime</h3>
              <div className="lp-price-amount">$29.99</div>
              <div className="lp-price-period">one-time payment</div>
              <ul className="lp-price-list">
                <li>Everything in Premium</li>
                <li>Never pay again</li>
                <li>All future features included</li>
                <li>Priority support</li>
              </ul>
              <button onClick={onGetStarted} className="lp-price-btn">Get Lifetime</button>
            </div>
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
            { q: 'Can I cancel premium anytime?', a: 'Yes. Subscriptions are managed through Google Play. Cancel anytime with no fees.' },
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
