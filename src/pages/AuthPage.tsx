import { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { supabase } from '../lib/supabase';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { setPageMeta } from '../utils/seo';
import { isAndroid } from '../utils/platform';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

interface AuthPageProps {
  onSwitchToOnboarding: () => void;
}

export function AuthPage({ onSwitchToOnboarding }: AuthPageProps) {
  const { t } = useT(['app', 'common', 'onboarding']);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Password recovery uses a 6-digit OTP code instead of a magic link.
  // Magic links are silently consumed by Gmail / iCloud / Microsoft email
  // scanners (they GET every URL in arriving emails for malware checks),
  // which marks the recovery token as "used" before the user ever clicks
  // it — manifesting as `otp_expired` for the user even on freshly-sent
  // emails. OTP codes can't be consumed by URL fetches, so they survive
  // the gauntlet. Steps:
  //   email → resetPasswordForEmail() → step='code'
  //   code  → verifyOtp({ token, type: 'recovery' }) → step='newPassword'
  //   newPassword → updateUser({ password }) → step='success'
  //   (success auto-returns to the sign-in form after 2s)
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'newPassword' | 'success'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    setPageMeta(
      'Sign in',
      'Sign in to Arcana — your daily tarot, astrology, and reflective journaling practice. Continue your ritual.',
    );
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorDescription = urlParams.get('error_description');
    const errorParam = urlParams.get('error');

    if (errorDescription || errorParam) {
      const decodedError = (errorDescription || errorParam || '').replace(/\+/g, ' ');
      toast(decodedError, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setVerifyEmail(email);
        setShowVerifyEmail(true);
      } else {
        toast(getAuthErrorMessage(error), 'error');
      }
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: verifyEmail });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResendSent(true);
      }
    } catch {
      toast(t('auth.resendFailed'), 'error');
    }
    setResendLoading(false);
  };

  // Step 1/3: send the recovery email. Supabase still uses the same
  // resetPasswordForEmail() RPC; the email template in the Supabase
  // dashboard is what determines whether the user sees a 6-digit code
  // ({{ .Token }}) or a clickable link ({{ .ConfirmationURL }}). Our
  // template includes BOTH — iOS uses the code, web users can use either.
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast(t('auth.enterEmail'), 'error');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        // redirectTo is still useful for the web "click the link" path —
        // mobile users will use the OTP code and never hit this URL.
        redirectTo: `${window.location.origin}/reset-password?lang=${getLocale()}`,
      });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResetStep('code');
      }
    } catch {
      toast(t('auth.resetFailed'), 'error');
    }
    setResetLoading(false);
  };

  // Step 2/3: verify the 6-digit code from the email. On success Supabase
  // returns a recovery-typed session, which lets the next step's
  // updateUser() call authenticate without a password.
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCode.trim();
    if (code.length < 6) {
      toast(t('auth.codeInvalid'), 'error');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: code,
        type: 'recovery',
      });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResetStep('newPassword');
      }
    } catch {
      toast(t('auth.codeInvalid'), 'error');
    }
    setResetLoading(false);
  };

  // Step 3/3: set the new password against the recovery session that
  // verifyOtp() established. Supabase requires the password to be at
  // least 8 chars (matches our client-side check below).
  const handleUpdateNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast(t('auth.passwordTooShort'), 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast(t('auth.passwordsDontMatch'), 'error');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResetStep('success');
        // Auto-return to the sign-in form after a short success state.
        setTimeout(() => {
          setShowResetPassword(false);
          setResetStep('email');
          setResetEmail('');
          setResetCode('');
          setNewPassword('');
          setConfirmNewPassword('');
        }, 2000);
      }
    } catch {
      toast(t('auth.resetFailed'), 'error');
    }
    setResetLoading(false);
  };

  // Re-send the recovery email (e.g. user mistyped or didn't see it).
  const handleResendCode = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password?lang=${getLocale()}`,
      });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        toast(t('auth.codeResent'), 'success');
      }
    } catch {
      toast(t('auth.resetFailed'), 'error');
    }
    setResetLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast(getAuthErrorMessage(error), 'error');
    }
    setGoogleLoading(false);
  };

  const [appleLoading, setAppleLoading] = useState(false);
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    if (error) {
      toast(getAuthErrorMessage(error), 'error');
    }
    setAppleLoading(false);
  };

  if (showVerifyEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm">
          <button
            onClick={() => { setShowVerifyEmail(false); setResendSent(false); }}
            className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToSignIn')}
          </button>

          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
              <Mail className="w-10 h-10 text-gold" />
              <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
            </div>
            <h1 className="font-display text-3xl text-mystic-100 mb-2">{t('auth.verifyEmail')}</h1>
            <p className="text-mystic-400">
              {t('auth.verifySentTo', { email: verifyEmail })}
            </p>
          </div>

          <div className="space-y-4">
            {resendSent ? (
              <div className="flex items-center justify-center gap-2 text-gold py-3">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{t('auth.verificationSent')}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                fullWidth
                onClick={handleResendVerification}
                loading={resendLoading}
                className="min-h-[52px]"
              >
                {t('auth.resendVerification')}
              </Button>
            )}
            <p className="text-sm text-mystic-500 text-center">
              {t('auth.checkSpam')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    // Header strings + icon vary per step. Centralize so the JSX below
    // stays focused on the form itself.
    const headerByStep: Record<typeof resetStep, { title: string; subtitle: string; Icon: typeof Mail }> = {
      email: { title: t('auth.resetPassword'), subtitle: t('auth.enterEmailForReset'), Icon: Mail },
      code: { title: t('auth.enterCode'), subtitle: t('auth.codeFromEmail', { email: resetEmail }), Icon: Mail },
      newPassword: { title: t('auth.setNewPassword'), subtitle: t('auth.setNewPasswordDesc'), Icon: Lock },
      success: { title: t('auth.passwordUpdated'), subtitle: t('auth.passwordUpdatedDesc'), Icon: CheckCircle },
    };
    const header = headerByStep[resetStep];

    const resetAndExit = () => {
      setShowResetPassword(false);
      setResetStep('email');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm">
          {/* Hide the back-button while on the success step — the auto-
              return timer handles navigation, and showing a button there
              invites the user to mash it and break the timer. */}
          {resetStep !== 'success' && (
            <button
              type="button"
              onClick={resetAndExit}
              className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToSignIn')}
            </button>
          )}

          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
              <header.Icon className="w-10 h-10 text-gold" />
              <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
            </div>
            <h1 className="font-display text-3xl text-mystic-100 mb-2">{header.title}</h1>
            <p className="text-mystic-400">{header.subtitle}</p>
          </div>

          {resetStep === 'email' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t('onboarding:createAccount.emailPlaceholder')}
                icon={<Mail className="w-5 h-5" />}
                autoComplete="email"
                required
              />
              <Button type="submit" variant="gold" fullWidth loading={resetLoading} className="min-h-[52px]">
                {t('auth.sendCode')}
              </Button>
            </form>
          )}

          {resetStep === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.codePlaceholder')}
                autoComplete="one-time-code"
                required
                className="text-center tracking-[0.5em] text-lg"
              />
              <Button type="submit" variant="gold" fullWidth loading={resetLoading} className="min-h-[52px]">
                {t('auth.verifyCode')}
              </Button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resetLoading}
                className="w-full text-sm text-mystic-400 hover:text-gold transition-colors py-2 disabled:opacity-50"
              >
                {t('auth.resendCode')}
              </button>
            </form>
          )}

          {resetStep === 'newPassword' && (
            <form onSubmit={handleUpdateNewPassword} className="space-y-4">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                icon={<Lock className="w-5 h-5" />}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                icon={<Lock className="w-5 h-5" />}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <Button type="submit" variant="gold" fullWidth loading={resetLoading} className="min-h-[52px]">
                {t('auth.updatePassword')}
              </Button>
            </form>
          )}

          {/* `success` step has no form — header text + icon do the talking
              while the timer in handleUpdateNewPassword closes the modal. */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
            <Sparkles className="w-10 h-10 text-gold" />
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">{t('auth.welcomeBack')}</h1>
          <p className="text-mystic-400">{t('auth.signInSub')}</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading || appleLoading}
            loading={googleLoading}
            className="min-h-[52px] bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
          >
            <GoogleIcon className="w-5 h-5" />
            {t('onboarding:createAccount.googleCta')}
          </Button>

          {!isAndroid() && (
            <Button
              variant="outline"
              fullWidth
              onClick={handleAppleSignIn}
              disabled={googleLoading || loading || appleLoading}
              loading={appleLoading}
              className="min-h-[52px] bg-black hover:bg-gray-900 border-black text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>{t('onboarding:createAccount.appleCta', { defaultValue: 'Continue with Apple' })}</span>
            </Button>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-mystic-700/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-mystic-900 text-sm text-mystic-500">{t('auth.orDivider')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('onboarding:createAccount.emailPlaceholder')}
            icon={<Mail className="w-5 h-5" />}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('common:labels.password')}
              icon={<Lock className="w-5 h-5" />}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-mystic-400 hover:text-mystic-200 p-2"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button type="submit" variant="gold" fullWidth loading={loading} className="min-h-[52px]">
            {t('common:nav.signIn')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setShowResetPassword(true); setResetEmail(email); }}
          className="w-full mt-4 text-sm text-mystic-400 hover:text-gold transition-colors py-2"
        >
          {t('auth.forgotPassword')}
        </button>

        <div className="mt-8 pt-8 border-t border-mystic-800">
          <p className="text-center text-mystic-400 mb-4">{t('auth.newToArcana')}</p>
          <Button
            variant="outline"
            fullWidth
            onClick={onSwitchToOnboarding}
            className="min-h-[52px]"
          >
            {t('auth.createAccount')}
          </Button>
        </div>

        <p className="mt-8 text-xs text-center text-mystic-500">
          {t('auth.termsNotice')}
          <br />This app is for entertainment purposes only.
        </p>
      </div>
    </div>
  );
}
