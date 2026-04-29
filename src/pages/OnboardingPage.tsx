import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Button, Input, toast } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { validateEmail, validatePassword } from '../utils/validation';
import { getAttribution, clearAttribution } from '../utils/attribution';
import { LanguagePicker } from '../components/i18n/LanguagePicker';
import { getLocale } from '../i18n/config';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';
import {
  trackOnboardingStepViewed,
  trackOnboardingStepCompleted,
  trackOnboardingComplete,
  trackSignUp,
} from '../services/analytics';

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

interface OnboardingPageProps {
  onComplete: () => void;
  onSwitchToSignIn: () => void;
}

export function OnboardingPage({ onComplete, onSwitchToSignIn }: OnboardingPageProps) {
  const { t } = useT(['onboarding', 'common']);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Step 0 = language picker, 1 = welcome, 2 = create account
  const stepNames = ['language', 'welcome', 'create_account'] as const;
  const onboardingStartTime = useRef(Date.now());
  const stepStartTime = useRef(Date.now());

  useEffect(() => {
    setPageMeta(
      'Sign up — Free 3-day trial',
      'Create your free Arcana account. Daily tarot readings, personalized horoscopes, journaling, and a 3-day free trial of Premium.',
    );
  }, []);

  useEffect(() => {
    trackOnboardingStepViewed({ step, stepName: stepNames[step] });
    stepStartTime.current = Date.now();
  }, [step]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast(getAuthErrorMessage(error), 'error');
    } else {
      trackOnboardingStepCompleted({
        step: 1,
        stepName: 'create_account',
        durationMs: Date.now() - stepStartTime.current,
      });
      trackOnboardingComplete({
        totalDurationMs: Date.now() - onboardingStartTime.current,
      });
    }
    setGoogleLoading(false);
  };

  const [appleLoading, setAppleLoading] = useState(false);
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    if (error) {
      toast(getAuthErrorMessage(error), 'error');
    } else {
      trackOnboardingStepCompleted({
        step: 1,
        stepName: 'create_account',
        durationMs: Date.now() - stepStartTime.current,
      });
      trackSignUp('apple');
      trackOnboardingComplete({
        totalDurationMs: Date.now() - onboardingStartTime.current,
      });
    }
    setAppleLoading(false);
  };

  const handleEmailSignup = async () => {
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      toast(emailResult.error || t('toast.invalidEmail'), 'error');
      return;
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      toast(passwordResult.error || t('toast.invalidPassword'), 'error');
      return;
    }

    setLoading(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      const message = getAuthErrorMessage(signUpError);
      const isUserExists = signUpError.message?.toLowerCase().includes('already') ||
        signUpError.message?.toLowerCase().includes('duplicate');

      if (isUserExists) {
        toast(message + ' ' + t('toast.userExists'), 'error');
      } else {
        toast(message, 'error');
      }
      setLoading(false);
      return;
    }

    if (authData.user) {
      const attr = getAttribution();
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email,
        display_name: email.split('@')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: getLocale(),
        onboarding_complete: false,
        is_premium: false,
        is_guest: false,
        streak: 0,
        subscribed_to_newsletter: subscribedToNewsletter,
        newsletter_subscribed_at: subscribedToNewsletter ? new Date().toISOString() : null,
        utm_source: attr?.utm_source,
        utm_medium: attr?.utm_medium,
        utm_campaign: attr?.utm_campaign,
        utm_content: attr?.utm_content,
        utm_term: attr?.utm_term,
        first_referrer: attr?.first_referrer,
      });

      if (profileError) {
        toast(t('toast.profileSaveFailed'), 'error');
        setLoading(false);
        return;
      }

      clearAttribution();
      trackSignUp('email');
      trackOnboardingStepCompleted({
        step: 1,
        stepName: 'create_account',
        durationMs: Date.now() - stepStartTime.current,
      });
      trackOnboardingComplete({
        totalDurationMs: Date.now() - onboardingStartTime.current,
      });
      toast(t('toast.accountCreated'), 'success');
      onComplete();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom constellation-bg">
      {step === 2 && (
        <div className="h-1 bg-mystic-800/50">
          <div className="h-full bg-gradient-to-r from-gold/80 to-gold w-full transition-all duration-500 ease-out" />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="relative">
                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-gold/20 via-mystic-800 to-mystic-900 flex items-center justify-center border border-gold/20">
                  <Sparkles className="w-14 h-14 text-gold" />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-2xl text-mystic-100 leading-tight">
                  {t('language.title')}
                </h1>
                <p className="text-mystic-400 text-base leading-relaxed">
                  {t('language.subtitle')}
                </p>
              </div>
              <LanguagePicker />
              <div className="pt-2">
                <Button
                  variant="gold"
                  fullWidth
                  onClick={() => {
                    trackOnboardingStepCompleted({
                      step: 0,
                      stepName: 'language',
                      durationMs: Date.now() - stepStartTime.current,
                    });
                    setStep(1);
                  }}
                  className="min-h-[52px]"
                >
                  {t('common:actions.continue')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="relative">
                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-gold/20 via-mystic-800 to-mystic-900 flex items-center justify-center border border-gold/20">
                  <Sparkles className="w-14 h-14 text-gold" />
                </div>
                <div className="absolute inset-0 animate-pulse-slow">
                  <div className="w-28 h-28 mx-auto rounded-full border border-gold/10" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-display text-3xl text-mystic-100 leading-tight">
                  {t('welcome.heading')}
                </h1>
                <p className="text-mystic-400 text-lg leading-relaxed">
                  {t('welcome.subheading')}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  variant="gold"
                  fullWidth
                  onClick={() => {
                    trackOnboardingStepCompleted({
                      step: 1,
                      stepName: 'welcome',
                      durationMs: Date.now() - stepStartTime.current,
                    });
                    setStep(2);
                  }}
                  className="min-h-[52px]"
                >
                  {t('welcome.cta')}
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <button
                  onClick={onSwitchToSignIn}
                  className="w-full text-center text-sm text-mystic-400 hover:text-gold transition-colors py-3"
                >
                  {t('welcome.alreadyHaveAccount')}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gold" />
                </div>
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  {t('createAccount.heading')}
                </h2>
                <p className="text-mystic-400">
                  {t('createAccount.subheading')}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading || appleLoading}
                  loading={googleLoading}
                  className="min-h-[52px] bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
                >
                  <GoogleIcon className="w-5 h-5" />
                  {t('createAccount.googleCta')}
                </Button>

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
                  <span>{t('createAccount.appleCta', { defaultValue: 'Continue with Apple' })}</span>
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-mystic-700/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-mystic-900 text-sm text-mystic-500">{t('createAccount.divider')}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('createAccount.emailPlaceholder')}
                    icon={<Mail className="w-5 h-5" />}
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t('createAccount.passwordPlaceholder')}
                      icon={<Lock className="w-5 h-5" />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-mystic-400 hover:text-mystic-200 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubscribedToNewsletter(!subscribedToNewsletter)}
                    className="w-full flex items-start gap-3 text-left py-2"
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      subscribedToNewsletter
                        ? 'bg-gold border-gold'
                        : 'border-mystic-600 hover:border-mystic-500'
                    }`}>
                      {subscribedToNewsletter && <Check className="w-3 h-3 text-mystic-900" />}
                    </div>
                    <span className="text-sm text-mystic-400 leading-snug">
                      {t('createAccount.newsletter')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAgeConfirmed(!ageConfirmed)}
                    className="w-full flex items-start gap-3 text-left py-2"
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      ageConfirmed
                        ? 'bg-gold border-gold'
                        : 'border-mystic-600 hover:border-mystic-500'
                    }`}>
                      {ageConfirmed && <Check className="w-3 h-3 text-mystic-900" />}
                    </div>
                    <span className="text-sm text-mystic-400 leading-snug">
                      {t('createAccount.ageConfirm')}
                    </span>
                  </button>

                  <Button
                    variant="gold"
                    fullWidth
                    onClick={handleEmailSignup}
                    disabled={loading || !email || password.length < 8 || !ageConfirmed}
                    loading={loading}
                    className="min-h-[48px]"
                  >
                    {t('createAccount.submit')}
                  </Button>
                </div>
              </div>

              <button
                onClick={onSwitchToSignIn}
                className="w-full text-center text-sm text-mystic-400 hover:text-gold transition-colors py-2"
              >
                {t('createAccount.switchToSignIn')}
              </button>
            </div>
          )}
        </div>
      </div>

      {step >= 1 && (
        <div className="p-6 safe-bottom">
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="min-h-[52px] w-full">
            <ArrowLeft className="w-4 h-4" />
            {t('createAccount.back')}
          </Button>
        </div>
      )}
    </div>
  );
}
