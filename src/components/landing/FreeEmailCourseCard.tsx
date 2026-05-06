// Free 3-part email course lead magnet — landing page concrete CTA
// inspired by Labyrinthos.co's "Unlock tarot secrets with our free
// 3-part email series: Keywords, Suit Correspondences, and Numerology
// Basics."
//
// Captures email into newsletter_signups (RLS allows anon INSERT).
// The actual emails are delivered by a future daily-newsletter-sender
// cron once Resend API key is set; for now we just capture the lead.

import { useState } from 'react';
import { Mail, Check, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n/useT';

export function FreeEmailCourseCard() {
  const { t } = useT('landing');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lessons live in the locale file so titles + topics translate together.
  // i18next can't return arrays of objects directly, so we read each lesson
  // by index. Three lessons hardcoded matches the EN content shape.
  const lessons = [1, 2, 3].map((n) => ({
    title: t(`freeCourse.lessons.${n}.title`, { defaultValue: `Lesson ${n}` }) as string,
    topic: t(`freeCourse.lessons.${n}.topic`, { defaultValue: '' }) as string,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) {
      setError(t('freeCourse.errors.invalidEmail', { defaultValue: 'Please enter a valid email.' }) as string);
      return;
    }
    setSubmitting(true);
    const params = new URLSearchParams(window.location.search);
    const { error: insertError } = await supabase
      .from('newsletter_signups')
      .insert({
        email: email.trim().toLowerCase(),
        source: 'landing_page',
        course_lead_magnet: 'tarot-fundamentals-3-part',
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
      });
    setSubmitting(false);
    if (insertError) {
      // Duplicate email = already subscribed, treat as success
      if (insertError.code === '23505') {
        setDone(true);
        return;
      }
      setError(t('freeCourse.errors.signupFailed', { defaultValue: "Couldn't sign you up — please try again in a moment." }) as string);
      return;
    }
    setDone(true);
  };

  return (
    <div className="lp-wrap" style={{ padding: '48px 16px' }}>
      <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-mystic-900 via-mystic-900 to-mystic-950 p-6 sm:p-10 shadow-2xl shadow-gold/10 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs uppercase tracking-wider text-gold">{t('freeCourse.badge', { defaultValue: 'Free 3-part email course' })}</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-mystic-100 mb-2">
            {t('freeCourse.title', { defaultValue: 'Learn tarot in 3 emails' })}
          </h2>
          <p className="text-sm text-mystic-400 max-w-md mx-auto">
            {t('freeCourse.subtitle', { defaultValue: 'A free email series covering keywords, suit correspondences, and numerology basics — the foundation every reader needs.' })}
          </p>
        </div>

        <ul className="space-y-2 mb-6 max-w-md mx-auto">
          {lessons.map((l) => (
            <li key={l.title} className="flex items-start gap-2.5 text-sm">
              <Check className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <span>
                <span className="text-mystic-100 font-medium">{l.title}:</span>
                <span className="text-mystic-400"> {l.topic}</span>
              </span>
            </li>
          ))}
        </ul>

        {done ? (
          <div className="flex items-center justify-center gap-2 py-4 text-gold">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">{t('freeCourse.success', { defaultValue: "You're in. Check your inbox." })}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mystic-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('freeCourse.emailPlaceholder', { defaultValue: 'your@email.com' }) as string}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-mystic-950 border border-mystic-800 text-mystic-100 placeholder:text-mystic-600 focus:border-gold/50 outline-none text-sm"
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
              >
                {submitting
                  ? (t('freeCourse.sending', { defaultValue: 'Sending…' }) as string)
                  : (t('freeCourse.cta', { defaultValue: 'Send me Lesson 1' }) as string)}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
            <p className="text-[11px] text-mystic-500 mt-3 text-center">
              {t('freeCourse.disclaimer', { defaultValue: 'No spam. Unsubscribe with one click. 3 emails over 5 days.' })}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
