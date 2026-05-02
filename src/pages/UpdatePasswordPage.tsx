import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, toast } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';
import { getAuthErrorMessage } from '../utils/authErrors';

export function UpdatePasswordPage() {
  const { t } = useT(['app', 'common']);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    setPageMeta(
      'Reset password',
      'Set a new password for your Arcana account.',
    );
  }, []);

  // The Supabase client is configured with detectSessionInUrl: false
  // so we manage auth state ourselves in AuthContext. The recovery
  // tokens that Supabase appends to the URL as a fragment
  // (#access_token=...&refresh_token=...&type=recovery) are NOT
  // picked up automatically. Parse them here and call setSession()
  // so updateUser() authenticates against the recovery session.
  // Without this step we'd get "Auth session missing".
  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) {
      setSessionReady(true);
      return;
    }
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            // eslint-disable-next-line no-console
            console.warn('[UpdatePassword] setSession failed:', error.message);
            toast(t('auth.resetFailed'), 'error');
          }
          // Scrub tokens out of the URL bar.
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search,
          );
          setSessionReady(true);
        });
    } else {
      setSessionReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast(t('auth.passwordTooShort'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast(t('auth.passwordsDontMatch'), 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.resetFailed');
      toast(msg, 'error');
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-mystic-950 flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-mystic-950 flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-gold" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">
            {t('auth.passwordUpdated')}
          </h1>
          <p className="text-mystic-400">
            {t('auth.passwordUpdatedDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mystic-950 flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.backToSignIn')}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
            <Lock className="w-10 h-10 text-gold" />
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">
            {t('auth.setNewPassword')}
          </h1>
          <p className="text-mystic-400">
            {t('auth.setNewPasswordDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.newPasswordPlaceholder')}
            icon={<Lock className="w-5 h-5" />}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('auth.confirmNewPasswordPlaceholder')}
            icon={<Lock className="w-5 h-5" />}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="gold"
            fullWidth
            loading={loading}
            className="min-h-[52px]"
          >
            {t('auth.updatePassword')}
          </Button>
        </form>
      </div>
    </div>
  );
}
