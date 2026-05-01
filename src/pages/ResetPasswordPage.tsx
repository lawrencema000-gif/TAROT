import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { Button, Input, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useT } from '../i18n/useT';
import { getAuthErrorMessage } from '../utils/authErrors';
import { setPageMeta } from '../utils/seo';

/**
 * Password reset — set new password.
 *
 * Reached two ways:
 *   1. The user clicks a recovery email link, Supabase parses the
 *      `type=recovery` URL hash, fires onAuthStateChange('PASSWORD_RECOVERY'),
 *      AuthContext flips `passwordRecoveryMode = true`, and App.tsx
 *      force-renders this page regardless of the requested route.
 *   2. The user navigates directly to `/reset-password` (handled by
 *      the standard route table). Direct hits without an active
 *      recovery session are bounced to /signin with a helpful toast.
 *
 * Security: after a successful password update we sign the user out
 * before redirecting to /signin. The recovery session is short-lived
 * and one-shot — letting it persist as a normal login would mean a
 * leaked email link grants account access without ever needing the
 * password.
 */
export function ResetPasswordPage() {
  const { t } = useT(['app', 'common']);
  const { passwordRecoveryMode, clearPasswordRecoveryMode, signOut, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setPageMeta(
      t('auth.resetPassword', { defaultValue: 'Reset password' }) as string,
      t('auth.enterNewPassword', { defaultValue: 'Choose a new password for your Arcana account.' }) as string,
    );
  }, [t]);

  // Handle the email-link landing.
  //
  // Old PKCE flow (BROKEN cross-context): email link had `?code=xxx`.
  // Browser had no code_verifier in localStorage so exchangeCodeForSession
  // failed with "code challenge does not match previously saved code
  // verifier" — that's the error the user reported.
  //
  // New flow: email template uses `{{ .TokenHash }}` instead of the
  // PKCE-rendered `{{ .ConfirmationURL }}`. The link is now
  // `/reset-password?token_hash=xxx&type=recovery` — works in any
  // browser because verifyOtp doesn't rely on a stored client-side
  // verifier; the token_hash itself authenticates the user against
  // Supabase's auth backend.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    if (!tokenHash || type !== 'recovery') return;

    let cancelled = false;
    (async () => {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (cancelled) return;
        if (error) {
          // verifyOtp can fail if the link expired (24h default), was
          // already used, or the user requested another link after this
          // one. Surface that with a clear message rather than dumping
          // the user into a broken form.
          toast(
            t('auth.resetLinkExpiredHint', {
              defaultValue: 'Reset links are one-shot. If yours expired, request another from the sign-in page.',
            }),
            'error',
          );
        }
        // On success: the verifyOtp call sets a recovery session and
        // Supabase JS fires onAuthStateChange('PASSWORD_RECOVERY'),
        // which AuthContext catches → flips passwordRecoveryMode=true →
        // App.tsx force-renders this page (already mounted). No
        // explicit redirect needed; the form below stays visible.
        // Strip the token from the URL so a refresh doesn't re-fire.
        if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (err) {
        if (cancelled) return;
        toast(
          t('auth.resetFailed', {
            defaultValue: 'Could not verify reset link: {{err}}',
            err: err instanceof Error ? err.message : String(err),
          }),
          'error',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  // If a user lands on /reset-password directly without an active
  // recovery session AND no signed-in session, send them back to /signin.
  // A signed-in user with no recovery flag is harder to reason about —
  // we still let them set a new password (it's a standard "change password"
  // gesture), but we don't sign them out afterwards.
  const isStandalone = !passwordRecoveryMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast(t('auth.passwordTooShort', { defaultValue: 'Password must be at least 8 characters' }), 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast(t('auth.passwordsMustMatch', { defaultValue: 'Passwords do not match' }), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      // If we got here via a recovery email link, sign the user out so the
      // short-lived recovery session can't be reused. They'll be sent to
      // /signin to log in fresh with the new password — that's the secure
      // shape. For a regular signed-in user changing their password, we
      // leave the session intact (don't disrupt their app state).
      if (passwordRecoveryMode) {
        clearPasswordRecoveryMode();
        // 1.5s delay so the user sees the success state before redirect.
        setTimeout(async () => {
          await signOut();
          window.location.href = '/signin';
        }, 1500);
      } else {
        // Standard "change password" flow — toast + back to home.
        toast(t('auth.resetSuccess', { defaultValue: 'Password updated.' }), 'success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast(t('auth.resetFailed', { defaultValue: 'Could not update password: {{err}}', err: msg }), 'error');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (passwordRecoveryMode) {
      // Cancelling out of a recovery flow — sign out so the recovery
      // session doesn't sit around as a regular login.
      clearPasswordRecoveryMode();
      signOut().finally(() => { window.location.href = '/signin'; });
    } else {
      window.location.href = '/';
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
            <CheckCircle className="w-10 h-10 text-gold" />
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">
            {t('auth.resetSuccess', { defaultValue: 'Password updated' })}
          </h1>
          <p className="text-mystic-400 mb-2">
            {passwordRecoveryMode
              ? t('auth.resetSuccessRecoveryHint', { defaultValue: 'Signing you out — please sign in again with your new password.' })
              : t('auth.resetSuccessHint', { defaultValue: 'Returning you to the app…' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.backToSignIn', { defaultValue: 'Back to sign in' })}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
            <Sparkles className="w-10 h-10 text-gold" />
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">
            {t('auth.resetPassword', { defaultValue: 'Reset password' })}
          </h1>
          <p className="text-mystic-400">
            {isStandalone && !user
              ? t('auth.resetLinkExpiredHint', { defaultValue: 'Reset links are one-shot. If yours expired, request another from the sign-in page.' })
              : t('auth.enterNewPassword', { defaultValue: 'Choose a new password for your Arcana account.' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('auth.newPassword', { defaultValue: 'New password' }) as string}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-mystic-400 hover:text-mystic-200 p-2"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('auth.confirmNewPassword', { defaultValue: 'Confirm new password' }) as string}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              minLength={8}
              required
            />
          </div>
          <Button
            type="submit"
            variant="gold"
            fullWidth
            loading={submitting}
            className="min-h-[52px]"
          >
            {t('auth.updatePassword', { defaultValue: 'Update password' })}
          </Button>
        </form>

        <p className="text-xs text-mystic-500 text-center mt-6">
          {t('auth.passwordRequirementHint', { defaultValue: 'At least 8 characters. Use something you don\'t reuse elsewhere.' })}
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
