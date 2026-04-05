import { useState, useEffect, useRef, useCallback } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

// ─── Zodiac Data ───────────────────────────────────────────────
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

const FEATURES = [
  {
    icon: '🃏',
    title: 'Tarot Readings',
    desc: 'Full 78-card deck with detailed upright and reversed meanings. 6 spread types from quick daily pulls to deep Celtic Cross readings. Choose your focus — Love, Career, Health, or Self.',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    borderHover: 'hover:border-purple-500/40',
    iconBg: 'bg-purple-500/10',
  },
  {
    icon: '✨',
    title: 'Daily Horoscope',
    desc: 'Personalized forecasts with energy scores, mood analysis, love and career insights, planetary transits, daily affirmations, and guided mini rituals.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderHover: 'hover:border-blue-500/40',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: '📓',
    title: 'Reflective Journal',
    desc: 'Write freely or use guided prompts based on your readings. Track mood with 10 emoji moods, tag entries by theme, and link to your tarot readings.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderHover: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: '🧠',
    title: 'Personality Quizzes',
    desc: 'MBTI, Enneagram, Big Five, Love Language, and Attachment Style. Six psychology-backed assessments that shape your entire experience.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderHover: 'hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10',
  },
  {
    icon: '🔥',
    title: 'Streaks & Achievements',
    desc: 'Build your daily ritual habit. Earn XP, level up through Seeker Ranks — from Novice to Awakened and beyond. Unlock achievements as you grow.',
    gradient: 'from-red-500/20 to-rose-500/20',
    borderHover: 'hover:border-red-500/40',
    iconBg: 'bg-red-500/10',
  },
  {
    icon: '🌙',
    title: 'Birth Chart',
    desc: 'Enter your birth details to unlock your complete natal chart with planetary placements, aspects, transits, and personalized interpretations.',
    gradient: 'from-yellow-500/20 to-amber-500/20',
    borderHover: 'hover:border-yellow-500/40',
    iconBg: 'bg-yellow-500/10',
  },
];

const FAQ_ITEMS = [
  { q: 'Is Arcana free to use?', a: 'Yes! Arcana is free with 3 daily tarot readings, daily horoscopes, a full journal, and all personality quizzes. Premium unlocks unlimited readings, all 6 spread types, birth charts, and removes ads.' },
  { q: 'How accurate are the tarot readings?', a: 'Arcana uses a full 78-card tarot deck with detailed traditional meanings for every card — upright and reversed. Readings are designed for self-reflection and personal insight. The meaning you find is yours.' },
  { q: 'What personality quizzes are available?', a: 'Six assessments: MBTI (16 types), Enneagram (9 types with wings), Big Five personality traits, Love Language, Attachment Style, and a daily Mood Check. Results are saved to your profile and personalize your experience.' },
  { q: 'Is my journal private?', a: 'Absolutely. Journal entries are stored securely and only visible to you. Premium members can also lock individual entries with a password for extra privacy.' },
  { q: 'Can I cancel premium anytime?', a: 'Yes. Subscriptions are managed through Google Play or your account settings. Cancel anytime with no cancellation fees.' },
  { q: 'Does it work on the web too?', a: 'Yes! You can use Arcana on the web right here, or download the Android app for the full native experience with offline support and push notifications.' },
];

// ─── Scroll Fade-In Hook ───────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// ─── Animated Counter ──────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1600;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Floating Particles ────────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="landing-particles" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="landing-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 10}s`,
            '--particle-size': `${1 + Math.random() * 2.5}px`,
            '--particle-opacity': `${0.15 + Math.random() * 0.4}`,
            '--particle-drift': `${-30 + Math.random() * 60}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Twinkling Stars Background ────────────────────────────────
function StarField() {
  return (
    <div className="landing-starfield" aria-hidden="true">
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={i}
          className="landing-star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
            '--star-size': `${0.5 + Math.random() * 2}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Zodiac Wheel ──────────────────────────────────────────────
function ZodiacWheel() {
  const [hoveredSign, setHoveredSign] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="landing-zodiac-wrapper">
      <div
        className={`landing-zodiac-wheel ${isPaused ? 'paused' : ''}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => { setIsPaused(false); setHoveredSign(null); }}
      >
        {/* Outer glow ring */}
        <div className="landing-zodiac-ring" />
        <div className="landing-zodiac-ring-inner" />

        {ZODIAC_SIGNS.map((sign, i) => {
          const angle = (i * 30) - 90;
          const radius = 140;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          const isHovered = hoveredSign === i;

          return (
            <div
              key={sign.name}
              className={`landing-zodiac-symbol ${isHovered ? 'active' : ''}`}
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${isPaused ? 0 : 0}deg)`,
              }}
              onMouseEnter={() => setHoveredSign(i)}
              onMouseLeave={() => setHoveredSign(null)}
            >
              <span className="landing-zodiac-glyph">{sign.symbol}</span>
            </div>
          );
        })}

        {/* Center content */}
        <div className="landing-zodiac-center">
          {hoveredSign !== null ? (
            <div className="landing-zodiac-info">
              <span className="landing-zodiac-info-symbol">{ZODIAC_SIGNS[hoveredSign].symbol}</span>
              <span className="landing-zodiac-info-name">{ZODIAC_SIGNS[hoveredSign].name}</span>
              <span className="landing-zodiac-info-element">{ZODIAC_SIGNS[hoveredSign].element}</span>
              <span className="landing-zodiac-info-dates">{ZODIAC_SIGNS[hoveredSign].dates}</span>
            </div>
          ) : (
            <div className="landing-zodiac-info">
              <span className="landing-zodiac-info-symbol" style={{ fontSize: '1.8rem' }}>☉</span>
              <span className="landing-zodiac-info-name">The Zodiac</span>
              <span className="landing-zodiac-info-element" style={{ opacity: 0.5 }}>Hover to explore</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tarot Card Flip ───────────────────────────────────────────
function TarotCardFlip() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="landing-tarot-card-container"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`landing-tarot-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Card Back */}
        <div className="landing-tarot-face landing-tarot-back">
          <div className="landing-tarot-back-design">
            <div className="landing-tarot-back-border" />
            <div className="landing-tarot-back-pattern">
              <span>✦</span>
            </div>
            <div className="landing-tarot-back-label">ARCANA</div>
          </div>
        </div>
        {/* Card Front */}
        <div className="landing-tarot-face landing-tarot-front">
          <div className="landing-tarot-front-content">
            <div className="landing-tarot-front-number">XVII</div>
            <div className="landing-tarot-front-symbol">⭐</div>
            <div className="landing-tarot-front-name">The Star</div>
            <div className="landing-tarot-front-keyword">Hope & Renewal</div>
          </div>
        </div>
      </div>
      <p className="landing-tarot-hint">{isFlipped ? 'The Star — Hope awaits' : 'Hover to reveal'}</p>
    </div>
  );
}

// ─── Glass Card Component ──────────────────────────────────────
function GlassCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`landing-glass-card ${className} ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── FAQ Accordion ─────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`landing-faq-item ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <button
        className="landing-faq-question"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{q}</span>
        <span className={`landing-faq-icon ${isOpen ? 'open' : ''}`}>+</span>
      </button>
      <div className={`landing-faq-answer ${isOpen ? 'open' : ''}`}>
        <p>{a}</p>
      </div>
    </div>
  );
}

// ─── Section Wrapper ───────────────────────────────────────────
function Section({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} id={id} className={`landing-section ${isVisible ? 'visible' : ''} ${className}`}>
      {children}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [scrollY, setScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
    setNavSolid(window.scrollY > 60);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="landing-root">
      <StarField />
      <FloatingParticles />

      {/* ─── Navigation ─── */}
      <nav className={`landing-nav ${navSolid ? 'solid' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <span className="landing-nav-logo">☽</span>
            <span className="landing-nav-name">Arcana</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#zodiac" className="landing-nav-link">Zodiac</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
            <button onClick={onSignIn} className="landing-nav-signin">Sign In</button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="landing-hero">
        <div className="landing-hero-glow" style={{ transform: `translateY(${scrollY * 0.15}px)` }} />

        <div className="landing-hero-content">
          {/* Moon icon */}
          <div className="landing-hero-moon">
            <span>☽</span>
          </div>

          <h1 className="landing-hero-title">
            <span className="landing-hero-title-line1">Know yourself.</span>
            <span className="landing-hero-title-line2">
              <span className="landing-shimmer-text">One ritual a day.</span>
            </span>
          </h1>

          <p className="landing-hero-subtitle">
            Daily tarot readings, personalized horoscopes, reflective journaling,
            and personality quizzes — all in one beautifully crafted app.
          </p>

          <div className="landing-hero-ctas">
            <button onClick={onGetStarted} className="landing-btn-primary">
              <span className="landing-btn-glow" />
              Get Started Free
            </button>
            <a
              href="https://play.google.com/store/apps/details?id=com.arcana.app"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-secondary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M12 18v-6m0 0V6m0 6h6m-6 0H6" strokeLinecap="round" />
              </svg>
              Download Android App
            </a>
          </div>

          <p className="landing-hero-note">Free to use · No credit card required</p>
        </div>

        {/* Decorative orbs */}
        <div className="landing-hero-orb landing-hero-orb-1" />
        <div className="landing-hero-orb landing-hero-orb-2" />
        <div className="landing-hero-orb landing-hero-orb-3" />
      </section>

      {/* ─── Stats ─── */}
      <Section className="landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {[
              { target: 78, label: 'Tarot Cards', suffix: '' },
              { target: 6, label: 'Spread Types', suffix: '' },
              { target: 6, label: 'Personality Quizzes', suffix: '' },
              { target: 12, label: 'Zodiac Signs', suffix: '' },
            ].map((stat) => (
              <div key={stat.label} className="landing-stat">
                <div className="landing-stat-number">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </div>
                <div className="landing-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Features ─── */}
      <Section id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Features</span>
            <h2 className="landing-section-title">Everything for your daily practice</h2>
            <p className="landing-section-subtitle">A complete spiritual toolkit designed to help you grow one day at a time.</p>
          </div>

          <div className="landing-features-grid">
            {FEATURES.map((feature, i) => (
              <GlassCard key={feature.title} className={`landing-feature-card ${feature.borderHover}`} delay={i * 100}>
                <div className={`landing-feature-icon ${feature.iconBg}`}>
                  <span>{feature.icon}</span>
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Zodiac Wheel ─── */}
      <Section id="zodiac" className="landing-zodiac-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">The Zodiac</span>
            <h2 className="landing-section-title">Written in the stars</h2>
            <p className="landing-section-subtitle">Personalized horoscopes for all 12 zodiac signs, updated daily with cosmic precision.</p>
          </div>
          <ZodiacWheel />
        </div>
      </Section>

      {/* ─── Daily Ritual ─── */}
      <Section className="landing-ritual-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Your Daily Ritual</span>
            <h2 className="landing-section-title">Three steps. Every day.</h2>
            <p className="landing-section-subtitle">Complete all three to maintain your streak and level up through Seeker Ranks.</p>
          </div>

          <div className="landing-ritual-layout">
            <div className="landing-ritual-steps">
              {[
                { step: '1', title: 'Read Your Horoscope', desc: 'Start with your personalized daily forecast. See your energy score, planetary influences, and what the cosmos has in store.', icon: '☉' },
                { step: '2', title: 'Pull Your Card', desc: 'Draw a tarot card for daily guidance. Reflect on its meaning and how it connects to your current chapter.', icon: '🂠' },
                { step: '3', title: 'Write a Reflection', desc: 'Journal your thoughts using a guided prompt or free-write. Link your entry to today\'s reading.', icon: '✎' },
              ].map((item, i) => (
                <GlassCard key={item.step} className="landing-ritual-step" delay={i * 150}>
                  <div className="landing-ritual-step-number">
                    <span>{item.icon}</span>
                  </div>
                  <div className="landing-ritual-step-connector" />
                  <h3 className="landing-ritual-step-title">{item.title}</h3>
                  <p className="landing-ritual-step-desc">{item.desc}</p>
                </GlassCard>
              ))}
            </div>

            <div className="landing-ritual-card-preview">
              <TarotCardFlip />
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Pricing ─── */}
      <Section id="pricing" className="landing-pricing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Pricing</span>
            <h2 className="landing-section-title">Start free. Upgrade when ready.</h2>
            <p className="landing-section-subtitle">Generous free tier with everything you need. Premium unlocks the full experience.</p>
          </div>

          <div className="landing-pricing-grid">
            <GlassCard className="landing-pricing-card" delay={0}>
              <h3 className="landing-pricing-name">Free</h3>
              <div className="landing-pricing-price">$0 <span>forever</span></div>
              <ul className="landing-pricing-features">
                <li><span className="landing-check">✓</span> 3 daily tarot readings</li>
                <li><span className="landing-check">✓</span> Single card & 3-card spreads</li>
                <li><span className="landing-check">✓</span> Daily horoscope</li>
                <li><span className="landing-check">✓</span> Full journal with mood tracking</li>
                <li><span className="landing-check">✓</span> All 6 personality quizzes</li>
                <li><span className="landing-check">✓</span> Streaks, XP & achievements</li>
              </ul>
              <button onClick={onGetStarted} className="landing-btn-outline-card">Get Started</button>
            </GlassCard>

            <GlassCard className="landing-pricing-card landing-pricing-featured" delay={100}>
              <div className="landing-pricing-badge">Most Popular</div>
              <h3 className="landing-pricing-name">Premium</h3>
              <div className="landing-pricing-price">$4.99 <span>/month</span></div>
              <ul className="landing-pricing-features">
                <li><span className="landing-check gold">★</span> Unlimited tarot readings</li>
                <li><span className="landing-check gold">★</span> All 6 spread types</li>
                <li><span className="landing-check gold">★</span> Birth chart analysis</li>
                <li><span className="landing-check gold">★</span> Weekly & monthly forecasts</li>
                <li><span className="landing-check gold">★</span> Deep interpretations</li>
                <li><span className="landing-check gold">★</span> Journal locking & insights</li>
                <li><span className="landing-check gold">★</span> No ads</li>
              </ul>
              <button onClick={onGetStarted} className="landing-btn-primary-card">Start Premium</button>
            </GlassCard>
          </div>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section id="faq">
        <div className="landing-container landing-faq-container">
          <div className="landing-section-header">
            <span className="landing-section-label">FAQ</span>
            <h2 className="landing-section-title">Common questions</h2>
          </div>
          <div className="landing-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Final CTA ─── */}
      <Section className="landing-final-cta">
        <div className="landing-container" style={{ textAlign: 'center' }}>
          <div className="landing-final-moon">☽</div>
          <h2 className="landing-section-title" style={{ marginBottom: '16px' }}>Begin your journey</h2>
          <p className="landing-section-subtitle" style={{ marginBottom: '40px' }}>
            Start your first daily ritual today — free, no credit card required.
          </p>
          <button onClick={onGetStarted} className="landing-btn-primary landing-btn-large">
            <span className="landing-btn-glow" />
            Get Started Free
          </button>
        </div>
      </Section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-links">
            <a href="/privacy-policy.html">Privacy Policy</a>
            <a href="mailto:support@arcana.app">Contact</a>
            <a href="https://play.google.com/store/apps/details?id=com.arcana.app" target="_blank" rel="noopener noreferrer">Google Play</a>
          </div>
          <p className="landing-footer-disclaimer">Arcana is for entertainment and self-reflection purposes only.</p>
          <p className="landing-footer-copy">&copy; 2026 Arcana. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
