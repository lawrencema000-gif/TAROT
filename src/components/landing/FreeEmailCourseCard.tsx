// Free 3-part email course lead magnet — the landing page's concrete CTA.
//
// Captures the email into newsletter_signups (RLS allows anon INSERT). The
// lessons are delivered by the send-newsletter-course edge function on a
// day 0 / +2 / +2 cadence, which is the "3 emails over 5 days" the copy
// promises.

import { useState } from 'react';
import { Mail, Check, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n/useT';
import { Button, Card, Input } from '../ui';

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
      setError(t('freeCourse.errors.signupFailed', { defaultValue: "Couldn’t sign you up — please try again in a moment." }) as string);
      return;
    }
    setDone(true);
  };

  return (
    <div className="lp-wrap">
      <Card variant="accent" padding="lg" className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold mb-3">
            <Gift className="w-3.5 h-3.5" aria-hidden />
            <span className="text-caption uppercase tracking-wider">{t('freeCourse.badge', { defaultValue: 'Free 3-part email course' })}</span>
          </div>
          <h2 className="heading-display-lg text-mystic-100 mb-2">
            {t('freeCourse.title', { defaultValue: 'Learn tarot in 3 emails' })}
          </h2>
          <p className="text-ui text-mystic-400 max-w-md mx-auto">
            {t('freeCourse.subtitle', { defaultValue: 'A free email series covering keywords, suit correspondences, and numerology basics — the foundation every reader needs.' })}
          </p>
        </div>

        <ul className="space-y-2 mb-6 max-w-md mx-auto">
          {lessons.map((l) => (
            <li key={l.title} className="flex items-start gap-2.5 text-ui">
              <Check className="w-4 h-4 text-gold flex-shrink-0 mt-1" aria-hidden />
              <span>
                <span className="text-mystic-100 font-medium">{l.title}:</span>
                <span className="text-mystic-400"> {l.topic}</span>
              </span>
            </li>
          ))}
        </ul>

        {done ? (
          <div className="flex items-center justify-center gap-2 py-4 text-gold" role="status">
            <Check className="w-5 h-5" aria-hidden />
            <span className="text-ui font-medium">{t('freeCourse.success', { defaultValue: "You’re in. Check your inbox." })}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
              <div className="flex-1">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('freeCourse.emailPlaceholder', { defaultValue: 'your@email.com' }) as string}
                  aria-label={t('freeCourse.emailLabel', { defaultValue: 'Email address' }) as string}
                  icon={<Mail className="w-4 h-4" aria-hidden />}
                  error={error ?? undefined}
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
              <Button type="submit" variant="gold" loading={submitting} className="whitespace-nowrap">
                {submitting
                  ? (t('freeCourse.sending', { defaultValue: 'Sending…' }) as string)
                  : (t('freeCourse.cta', { defaultValue: 'Send me Lesson 1' }) as string)}
              </Button>
            </div>
            <p className="text-caption text-mystic-500 mt-3 text-center">
              {t('freeCourse.disclaimer', { defaultValue: 'No spam. Unsubscribe with one click. 3 emails over 5 days.' })}
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
