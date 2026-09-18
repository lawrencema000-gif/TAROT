import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { supabase } from '../lib/supabase';
import { setPageMeta } from '../utils/seo';

export function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'invalid'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta('Unsubscribe', 'Confirm your unsubscribe from Arcana newsletter.');
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-mystic-400 animate-spin" />
            <p className="text-sm text-mystic-400">Processing your request…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Check className="w-6 h-6 text-gold" />
            </div>
            <PageHeader
              align="center"
              className="mb-4"
              title="You're unsubscribed"
              subtitle={
                email ? (
                  <>
                    <span className="text-mystic-200">{email}</span> will no longer receive Arcana emails.
                  </>
                ) : undefined
              }
            />
            <p className="text-xs text-mystic-500 mb-6">If this was a mistake, just sign up again at any time.</p>
            <Link to="/" className="inline-block px-5 py-2 rounded-xl border border-mystic-700 text-mystic-200 hover:text-mystic-100 hover:border-gold/40 transition-colors no-underline text-sm">
              Back to Arcana
            </Link>
          </div>
        )}

        {status === 'already' && (
          <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-8">
            <PageHeader
              align="center"
              className="mb-6"
              title="Already unsubscribed"
              subtitle="No further emails will be sent."
            />
            <Link to="/" className="inline-block px-5 py-2 rounded-xl border border-mystic-700 text-mystic-200 hover:text-mystic-100 no-underline text-sm">
              Back to Arcana
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-mystic-800/60 flex items-center justify-center">
              <X className="w-6 h-6 text-mystic-400" />
            </div>
            <PageHeader
              align="center"
              className="mb-6"
              title="Link not recognised"
              subtitle="This unsubscribe link looks invalid or has expired. If you keep receiving emails you didn't expect, reply to one of them — we'll handle it manually."
            />
            <Link to="/" className="inline-block px-5 py-2 rounded-xl border border-mystic-700 text-mystic-200 hover:text-mystic-100 no-underline text-sm">
              Back to Arcana
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
