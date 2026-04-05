interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen constellation-bg" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-display text-xl text-mystic-100">Arcana</span>
        <button
          onClick={onSignIn}
          className="px-5 py-2 text-sm font-medium text-mystic-200 hover:text-white border border-mystic-700/50 hover:border-mystic-500 rounded-xl transition-all"
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-3xl mx-auto">
        <div className="w-24 h-24 rounded-3xl mb-8 overflow-hidden shadow-lg shadow-gold/10">
          <img src="/image.png" alt="Arcana" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-mystic-100 mb-4 leading-tight">
          Know yourself.<br />
          <span className="text-gold">One ritual a day.</span>
        </h1>
        <p className="text-lg text-mystic-400 max-w-lg mb-10">
          Daily tarot readings, personalized horoscopes, reflective journaling, and personality quizzes — all in one beautifully crafted app.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-mystic-950 font-semibold rounded-2xl hover:shadow-lg hover:shadow-gold/20 transition-all hover:-translate-y-0.5 text-lg"
          >
            Get Started Free
          </button>
          <a
            href="https://play.google.com/store/apps/details?id=com.arcana.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-mystic-700/50 text-mystic-200 font-medium rounded-2xl hover:border-gold/30 hover:text-white transition-all text-lg text-center"
          >
            Download Android App
          </a>
        </div>
        <p className="text-sm text-mystic-500 mt-4">Free to use. No credit card required.</p>
      </section>

      {/* Stats */}
      <section className="border-y border-mystic-800/50 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 px-6 text-center">
          {[
            { number: '78', label: 'Tarot Cards' },
            { number: '6', label: 'Spread Types' },
            { number: '6', label: 'Personality Quizzes' },
            { number: '12', label: 'Zodiac Signs' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-gold">{s.number}</div>
              <div className="text-sm text-mystic-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase text-center mb-3">Features</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-mystic-100 text-center mb-4">Everything you need for your daily practice</h2>
          <p className="text-mystic-400 text-center max-w-xl mx-auto mb-12">A complete spiritual toolkit designed to help you grow one day at a time.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🃏', title: 'Tarot Readings', desc: 'Full 78-card deck with detailed upright and reversed meanings. 6 spread types from quick daily pulls to deep Celtic Cross readings.' },
              { icon: '✨', title: 'Daily Horoscope', desc: 'Personalized forecasts with energy scores, mood analysis, love and career insights, planetary transits, and daily affirmations.' },
              { icon: '📓', title: 'Reflective Journal', desc: 'Write freely or use guided prompts. Track mood with 10 emoji moods, tag entries by theme, and link to your readings.' },
              { icon: '🧠', title: 'Personality Quizzes', desc: 'MBTI, Enneagram, Big Five, Love Language, and Attachment Style. Results shape your experience throughout the app.' },
              { icon: '🔥', title: 'Streaks & Achievements', desc: 'Build your daily ritual habit. Earn XP, level up through Seeker Ranks, and unlock achievements as you grow.' },
              { icon: '🌙', title: 'Birth Chart', desc: 'Enter your birth details to unlock your complete natal chart with planetary placements and personalized interpretations.' },
            ].map(f => (
              <div key={f.title} className="bg-mystic-900/60 border border-mystic-700/30 rounded-2xl p-6 hover:border-gold/20 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-display text-xl font-semibold text-mystic-100 mb-2">{f.title}</h3>
                <p className="text-sm text-mystic-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 border-t border-mystic-800/50">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase text-center mb-3">Your Daily Ritual</p>
          <h2 className="font-display text-3xl font-semibold text-mystic-100 text-center mb-4">Three steps. Every day.</h2>
          <p className="text-mystic-400 text-center max-w-md mx-auto mb-12">Complete all three to maintain your streak and level up.</p>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { step: '1', title: 'Read Your Horoscope', desc: 'Start with your personalized daily forecast and energy score.' },
              { step: '2', title: 'Pull Your Card', desc: 'Draw a tarot card for daily guidance and reflect on its meaning.' },
              { step: '3', title: 'Write a Reflection', desc: 'Journal your thoughts with guided prompts or free-write.' },
            ].map(s => (
              <div key={s.step} className="bg-mystic-900/60 border border-mystic-700/30 rounded-2xl p-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold font-semibold flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-display text-lg font-semibold text-mystic-100 mb-2">{s.title}</h3>
                <p className="text-sm text-mystic-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 border-t border-mystic-800/50">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase text-center mb-3">Pricing</p>
          <h2 className="font-display text-3xl font-semibold text-mystic-100 text-center mb-4">Start free. Upgrade when ready.</h2>
          <p className="text-mystic-400 text-center max-w-md mx-auto mb-12">Generous free tier. Premium unlocks the full experience.</p>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-mystic-900/60 border border-mystic-700/30 rounded-2xl p-7">
              <h3 className="font-display text-xl font-semibold text-mystic-100 mb-1">Free</h3>
              <div className="text-3xl font-bold text-gold mb-5">$0 <span className="text-sm font-normal text-mystic-400">forever</span></div>
              <ul className="space-y-2 text-sm text-mystic-400">
                <li>3 daily tarot readings</li>
                <li>Single card & 3-card spreads</li>
                <li>Daily horoscope</li>
                <li>Full journal with mood tracking</li>
                <li>All 6 personality quizzes</li>
                <li>Streaks, XP & achievements</li>
              </ul>
            </div>
            <div className="bg-mystic-900/60 border border-gold/40 rounded-2xl p-7 shadow-lg shadow-gold/5">
              <div className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs font-semibold rounded-full mb-3">Most Popular</div>
              <h3 className="font-display text-xl font-semibold text-mystic-100 mb-1">Premium</h3>
              <div className="text-3xl font-bold text-gold mb-5">$4.99 <span className="text-sm font-normal text-mystic-400">/month</span></div>
              <ul className="space-y-2 text-sm text-mystic-400">
                <li>Unlimited tarot readings</li>
                <li>All 6 spread types</li>
                <li>Birth chart analysis</li>
                <li>Weekly & monthly forecasts</li>
                <li>Deep interpretations</li>
                <li>Journal locking & insights</li>
                <li>No ads</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-mystic-800/50">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase text-center mb-3">FAQ</p>
          <h2 className="font-display text-3xl font-semibold text-mystic-100 text-center mb-10">Common questions</h2>

          <div className="space-y-0">
            {[
              { q: 'Is Arcana free to use?', a: 'Yes! Arcana is free with 3 daily tarot readings, daily horoscopes, a full journal, and all personality quizzes. Premium unlocks unlimited readings, all spreads, birth charts, and removes ads.' },
              { q: 'How accurate are the tarot readings?', a: 'Arcana uses a full 78-card tarot deck with detailed traditional meanings. Readings are meant for self-reflection and personal insight — the meaning you find is yours.' },
              { q: 'What personality quizzes are available?', a: 'MBTI (16 types), Enneagram (9 types), Big Five, Love Language, Attachment Style, and a daily Mood Check. Results are saved to your profile.' },
              { q: 'Is my journal private?', a: 'Absolutely. Your journal entries are stored securely and only visible to you. Premium members can also lock individual entries with a password.' },
              { q: 'Can I cancel premium anytime?', a: 'Yes. Subscriptions are managed through Google Play or your account settings. Cancel anytime with no fees.' },
            ].map(item => (
              <details key={item.q} className="border-b border-mystic-800/50 group">
                <summary className="flex items-center justify-between py-5 cursor-pointer text-mystic-100 font-medium hover:text-gold transition-colors">
                  {item.q}
                  <span className="text-gold text-xl ml-4 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-mystic-400 pb-5 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t border-mystic-800/50 text-center">
        <h2 className="font-display text-3xl font-semibold text-mystic-100 mb-4">Begin your journey</h2>
        <p className="text-mystic-400 mb-8 max-w-md mx-auto">Start your first daily ritual today — free, no credit card required.</p>
        <button
          onClick={onGetStarted}
          className="px-10 py-4 bg-gradient-to-r from-gold to-gold-light text-mystic-950 font-semibold rounded-2xl hover:shadow-lg hover:shadow-gold/20 transition-all hover:-translate-y-0.5 text-lg"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-mystic-800/50 py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex justify-center gap-6 mb-4 flex-wrap">
            <a href="/privacy-policy.html" className="text-sm text-gold hover:underline">Privacy Policy</a>
            <a href="mailto:support@arcana.app" className="text-sm text-gold hover:underline">Contact</a>
            <a href="https://play.google.com/store/apps/details?id=com.arcana.app" target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline">Google Play</a>
          </div>
          <p className="text-xs text-mystic-500">Arcana is for entertainment and self-reflection purposes only.</p>
          <p className="text-xs text-mystic-500 mt-1">&copy; 2026 Arcana. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
