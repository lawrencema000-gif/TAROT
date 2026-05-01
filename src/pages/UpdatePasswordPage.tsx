/**
 * Password update page — landing page for the link in
 * Supabase's password-recovery email.
 *
 * Flow:
 *   1. User taps "Forgot password" in AuthPage → resetPasswordForEmail()
 *      sends an email with a magic link.
 *   2. The link points back to {origin}/reset-password?lang=xx (set in
 *      AuthPage.tsx). When the user clicks it, Supabase verifies the
 *      one-time token server-side and redirects them here with the
 *      recovery session embedded in the URL fragment
 *      (#access_token=…&type=recovery).
 *   3. The Supabase JS SDK auto-detects that fragment on page load,
 *      sets the session, and fires `PASSWORD_RECOVERY` on
 *      onAuthStateChange. We don't need to read the fragment manually —
 *      it just means `supabase.auth.updateUser({ password })` will
 *      authenticate against the recovery session.
 *   4. User enters a new password here; we call updateUser() and
 *      navigate them home on success.
 *
 * Mobile note: the email link opens in the system browser (Mail →
 * Safari on iOS, Mail → Chrome on Android). After resetting, the user
 * comes back to the app and signs in with the new password. This matches
 * what most apps do today (Twitter, Spotify, Notion etc.) and avoids
 * the Universal Links / app-site-association setup that would otherwise
 * be needed to deep-link straight back into the native app.
 */

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

  useEffect(() => {
    setPageMeta(
      'Reset password',
      'Set a new password for your Arcana account.',
    );
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
      // Recovery session is already set by the Supabase JS SDK from the
      // URL fragment, so updateUser() will authenticate against it. If
      // the user landed here without a recovery session (e.g. expired
      // link, manually typed URL), Supabase returns "Auth session missing".
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
        setLoading(false);
        return;
      }
      setDone(true);
      // Brief success state then redirect home so they can sign in.
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.resetFailed');
      toast(msg, 'error');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
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
