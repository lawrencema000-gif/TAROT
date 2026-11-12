import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Trans } from 'react-i18next';
import { Check, X, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { supabase } from '../lib/supabase';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';

/** The RPC takes a uuid; anything else is a 400 round-trip for a link we already know is wrong. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function UnsubscribePage() {
  const { t } = useT('app');
  const [params] = useSearchParams();
  const rawToken = params.get('token');
  const token = rawToken && UUID_RE.test(rawToken.trim()) ? rawToken.trim() : null;
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'invalid'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  // The tab title and description in the reader's language; they were English in all four.
  useEffect(() => {
    setPageMeta(
      t('unsubscribe.metaTitle', { defaultValue: 'Unsubscribe' }),
      t('unsubscribe.metaDescription', { defaultValue: 'Confirm your unsubscribe from Arcana newsletter.' }),
    );
  }, [t]);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('newsletter_unsubscribe', { p_token: token });
      if (cancelled) return;
      if (error) {
        setStatus('invalid');
        return;
      }
      const result = data as { ok: boolean; email?: string; reason?: string };
      if (result.ok && result.email) {
        setEmail(result.email);
        setStatus('success');
      } else if (result.reason === 'unknown_or_already_unsubscribed') {
        setStatus('already');
      } else {
        setStatus('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // The page itself, too: it was English in all four. The link home reads as
  // the public shell's footer link beneath it does, to the same place.
  const backToArcana = t('publicNav.backToArcana', { defaultValue: 'Back to Arcana' });

  return (
    <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-mystic-400 animate-spin" />
            <p className="text-sm text-mystic-400">{t('unsubscribe.processing', { defaultValue: 'Processing your request…' })}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-card border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Check className="w-6 h-6 text-gold" />
            </div>
            <PageHeader
              align="center"
              className="mb-4"
              title={t('unsubscribe.doneTitle', { defaultValue: 'You’re unsubscribed' })}
              subtitle={
                email ? (
                  <Trans
                    t={t}
                    i18nKey="unsubscribe.doneBody"
                    defaults="<email>{{email}}</email> will no longer receive Arcana emails."
                    values={{ email }}
                    components={{ email: <span className="text-mystic-200" /> }}
                  />
                ) : undefined
              }
            />
            <p className="text-caption text-mystic-500 mb-6">
              {t('unsubscribe.mistake', { defaultValue: 'If this was a mistake, just sign up again at any time.' })}
            </p>
            <Link to="/" className="inline-flex items-center min-h-[44px] px-5 py-2 rounded-control border border-mystic-700 text-mystic-200 hover:text-mystic-100 hover:border-gold/40 transition-colors no-underline text-sm">
              {backToArcana}
            </Link>
          </div>
        )}

        {status === 'already' && (
          <div className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-8">
            <PageHeader
              align="center"
              className="mb-6"
              title={t('unsubscribe.alreadyTitle', { defaultValue: 'Already unsubscribed' })}
              subtitle={t('unsubscribe.alreadyBody', { defaultValue: 'No further emails will be sent.' })}
            />
            <Link to="/" className="inline-flex items-center min-h-[44px] px-5 py-2 rounded-control border border-mystic-700 text-mystic-200 hover:text-mystic-100 no-underline text-sm">
              {backToArcana}
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-mystic-800/60 flex items-center justify-center">
              <X className="w-6 h-6 text-mystic-400" />
            </div>
            <PageHeader
              align="center"
              className="mb-6"
              title={t('unsubscribe.invalidTitle', { defaultValue: 'Link not recognised' })}
              subtitle={t('unsubscribe.invalidBody', {
                defaultValue:
                  'This unsubscribe link looks invalid or has expired. If you keep receiving emails you didn’t expect, reply to one of them — we’ll handle it manually.',
              })}
            />
            <Link to="/" className="inline-flex items-center min-h-[44px] px-5 py-2 rounded-control border border-mystic-700 text-mystic-200 hover:text-mystic-100 no-underline text-sm">
              {backToArcana}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
