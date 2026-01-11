import { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Bell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Heart,
  Feather,
  Zap,
  Check,
} from 'lucide-react';
import { Button, Input, Chip, toast } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { validateBirthDate } from '../utils/validation';
import type { Goal, TonePreference, OnboardingData } from '../types';

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

async function sendWelcomeEmail(email: string, name: string) {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`;
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    });
  } catch {
    console.error('Failed to send welcome email');
  }
}

const goalOptions: { label: string; value: Goal }[] = [
  { label: 'Love', value: 'love' },
  { label: 'Career', value: 'career' },
  { label: 'Confidence', value: 'confidence' },
  { label: 'Healing', value: 'healing' },
  { label: 'Focus', value: 'focus' },
  { label: 'Purpose', value: 'purpose' },
  { label: 'Stress', value: 'stress' },
];

const toneOptions: { value: TonePreference; label: string; description: string; icon: typeof Heart }[] = [
  { value: 'gentle', label: 'Gentle & supportive', description: 'Warm, nurturing guidance', icon: Heart },
  { value: 'direct', label: 'Direct & honest', description: 'Clear, straightforward insights', icon: Zap },
  { value: 'playful', label: 'Playful & mystical', description: 'Whimsical, enchanting wisdom', icon: Feather },
];

interface OnboardingPageProps {
  onComplete: () => void;
  onSwitchToSignIn: () => void;
}

export function OnboardingPage({ onComplete, onSwitchToSignIn }: OnboardingPageProps) {
  const { signInWithGoogle } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    goals: [],
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    tonePreference: 'gentle',
    notificationsEnabled: true,
    notificationTime: '09:00',
    email: '',
    password: '',
    subscribedToNewsletter: true,
  });

  const totalSteps = 6;

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return data.goals.length > 0;
      case 2: return data.birthDate !== '' && !birthDateError;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleBirthDateChange = (value: string) => {
    setData(d => ({ ...d, birthDate: value }));

    if (value) {
      const validation = validateBirthDate(value);
      if (!validation.valid) {
        setBirthDateError(validation.error || 'Invalid birth date');
      } else {
        setBirthDateError('');
      }
    } else {
      setBirthDateError('');
    }
  };

  const handleGuestContinue = () => {
    setIsGuestMode(true);
    setStep(5);
  };

  const handleEmailSignup = () => {
    if (!data.email.includes('@') || data.password.length < 6) {
      setError('Please enter a valid email and password (min 6 characters).');
      return;
    }
    setIsGuestMode(false);
    setError('');
    setStep(5);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
    setGoogleLoading(false);
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError('');

    let email: string;
    let password: string;

    if (isGuestMode) {
      email = `guest_${Date.now()}@arcana.local`;
      password = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    } else {
      email = data.email;
      password = data.password;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const shouldSubscribe = !isGuestMode && data.subscribedToNewsletter;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: isGuestMode ? null : data.email,
        display_name: isGuestMode ? 'Guest' : data.email.split('@')[0],
        goals: data.goals,
        birth_date: data.birthDate,
        birth_time: data.birthTime || null,
        birth_place: data.birthPlace || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tone_preference: data.tonePreference,
        notifications_enabled: data.notificationsEnabled,
        notification_time: data.notificationTime,
        onboarding_complete: true,
        is_premium: false,
        is_guest: isGuestMode,
        streak: 0,
        subscribed_to_newsletter: shouldSubscribe,
        newsletter_subscribed_at: shouldSubscribe ? new Date().toISOString() : null,
      });

      if (profileError) {
        setError('Failed to save profile. Please try again.');
        setLoading(false);
        return;
      }

      if (shouldSubscribe) {
        sendWelcomeEmail(data.email, data.email.split('@')[0]);
      }

      toast('Welcome to Arcana!', 'success');
      onComplete();
    }

    setLoading(false);
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
      setError('');
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(s => s - 1);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom constellation-bg">
      {step > 0 && (
        <div className="h-1 bg-mystic-800/50">
          <div
            className="h-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-500 ease-out"
            style={{ width: `${(step / (totalSteps - 1)) * 100}%` }}
          />
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
                <div className="absolute inset-0 animate-pulse-slow">
                  <div className="w-28 h-28 mx-auto rounded-full border border-gold/10" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-display text-3xl text-mystic-100 leading-tight">
                  Your daily ritual starts here.
                </h1>
                <p className="text-mystic-400 text-lg leading-relaxed">
                  Tarot, astrology, and personality insights—beautifully combined.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  variant="gold"
                  fullWidth
                  onClick={nextStep}
                  className="min-h-[52px]"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <button
                  onClick={onSwitchToSignIn}
                  className="w-full text-center text-sm text-mystic-400 hover:text-gold transition-colors py-3"
                >
                  I already have an account
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  What do you want help with?
                </h2>
                <p className="text-mystic-400">Select all that apply</p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {goalOptions.map(option => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={data.goals.includes(option.value)}
                    onSelect={() => {
                      setData(d => ({
                        ...d,
                        goals: d.goals.includes(option.value)
                          ? d.goals.filter(g => g !== option.value)
                          : [...d.goals, option.value],
                      }));
                    }}
                    size="lg"
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gold" />
                </div>
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  Your cosmic basics
                </h2>
                <p className="text-mystic-400">This determines your zodiac sign</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-mystic-300 mb-2">
                    Birth date <span className="text-coral">*</span>
                  </label>
                  <Input
                    type="date"
                    value={data.birthDate}
                    onChange={e => handleBirthDateChange(e.target.value)}
                    min={(() => {
                      const date = new Date();
                      date.setFullYear(date.getFullYear() - 120);
                      return date.toISOString().split('T')[0];
                    })()}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {birthDateError && (
                    <p className="text-sm text-coral mt-2">{birthDateError}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-mystic-300 mb-2">
                    <Clock className="w-4 h-4 text-mystic-500" />
                    Birth time
                    <span className="text-xs text-mystic-500 font-normal">(optional)</span>
                  </label>
                  <Input
                    type="time"
                    value={data.birthTime}
                    onChange={e => setData(d => ({ ...d, birthTime: e.target.value }))}
                  />
                  <p className="text-xs text-mystic-500 mt-1.5">For deeper chart accuracy</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-mystic-300 mb-2">
                    <MapPin className="w-4 h-4 text-mystic-500" />
                    Birth place
                    <span className="text-xs text-mystic-500 font-normal">(optional)</span>
                  </label>
                  <Input
                    value={data.birthPlace}
                    onChange={e => setData(d => ({ ...d, birthPlace: e.target.value }))}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  Pick your vibe
                </h2>
                <p className="text-mystic-400">How should we speak to you?</p>
              </div>

              <div className="space-y-3">
                {toneOptions.map(option => {
                  const Icon = option.icon;
                  const isSelected = data.tonePreference === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => setData(d => ({ ...d, tonePreference: option.value }))}
                      className={`w-full p-4 rounded-xl border transition-all text-left active:scale-[0.98] flex items-center gap-4 ${
                        isSelected
                          ? 'bg-gold/10 border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                          : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gold/20' : 'bg-mystic-700/30'
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-gold' : 'text-mystic-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? 'text-gold' : 'text-mystic-200'}`}>
                          {option.label}
                        </p>
                        <p className="text-sm text-mystic-500">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
                  <User className="w-8 h-8 text-gold" />
                </div>
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  Create your account
                </h2>
                <p className="text-mystic-400">
                  Save readings & journal entries across devices
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  loading={googleLoading}
                  className="min-h-[52px] bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
                >
                  <GoogleIcon className="w-5 h-5" />
                  Continue with Google
                </Button>

                <button
                  onClick={handleGuestContinue}
                  disabled={loading}
                  className="w-full p-4 rounded-xl border border-mystic-700/50 bg-mystic-800/30 hover:border-mystic-600/50 transition-all text-left active:scale-[0.98] disabled:opacity-50"
                >
                  <p className="font-medium text-mystic-200">Continue as guest</p>
                  <p className="text-sm text-mystic-500">Try it out, sign up later</p>
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-mystic-700/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-mystic-900 text-sm text-mystic-500">or sign up with email</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    type="email"
                    value={data.email}
                    onChange={e => setData(d => ({ ...d, email: e.target.value }))}
                    placeholder="Email address"
                    icon={<Mail className="w-5 h-5" />}
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={data.password}
                      onChange={e => setData(d => ({ ...d, password: e.target.value }))}
                      placeholder="Password (min 6 characters)"
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
                    onClick={() => setData(d => ({ ...d, subscribedToNewsletter: !d.subscribedToNewsletter }))}
                    className="w-full flex items-start gap-3 text-left py-2"
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      data.subscribedToNewsletter
                        ? 'bg-gold border-gold'
                        : 'border-mystic-600 hover:border-mystic-500'
                    }`}>
                      {data.subscribedToNewsletter && <Check className="w-3 h-3 text-mystic-900" />}
                    </div>
                    <span className="text-sm text-mystic-400 leading-snug">
                      Subscribe to newsletters and promotions. Get cosmic insights, tips, and exclusive offers.
                    </span>
                  </button>

                  {error && (
                    <p className="text-sm text-coral text-center">{error}</p>
                  )}

                  <Button
                    variant="gold"
                    fullWidth
                    onClick={handleEmailSignup}
                    disabled={loading || !data.email || data.password.length < 6}
                    loading={loading}
                    className="min-h-[48px]"
                  >
                    Sign up with email
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-gold" />
                </div>
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  Daily reminder?
                </h2>
                <p className="text-mystic-400">
                  We'll remind you once per day. No spam.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setData(d => ({ ...d, notificationsEnabled: true }))}
                  className={`w-full p-4 rounded-xl border transition-all text-left active:scale-[0.98] ${
                    data.notificationsEnabled
                      ? 'bg-gold/10 border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                      : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                  }`}
                >
                  <span className={`font-medium ${data.notificationsEnabled ? 'text-gold' : 'text-mystic-200'}`}>
                    Yes, remind me daily
                  </span>
                </button>

                {data.notificationsEnabled && (
                  <div className="px-4 animate-fade-in">
                    <label className="block text-sm text-mystic-400 mb-2">Reminder time</label>
                    <Input
                      type="time"
                      value={data.notificationTime}
                      onChange={e => setData(d => ({ ...d, notificationTime: e.target.value }))}
                    />
                  </div>
                )}

                <button
                  onClick={() => setData(d => ({ ...d, notificationsEnabled: false }))}
                  className={`w-full p-4 rounded-xl border transition-all text-left active:scale-[0.98] ${
                    !data.notificationsEnabled
                      ? 'bg-gold/10 border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                      : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                  }`}
                >
                  <span className={`font-medium ${!data.notificationsEnabled ? 'text-gold' : 'text-mystic-200'}`}>
                    No thanks
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {step > 0 && step !== 4 && (
        <div className="p-6 flex gap-3 safe-bottom">
          {step !== 5 && (
            <Button variant="ghost" onClick={prevStep} className="min-h-[52px]">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <Button
            variant="gold"
            fullWidth
            onClick={step === 5 ? handleCompleteOnboarding : nextStep}
            disabled={!canProceed() || loading}
            loading={loading}
            className="min-h-[52px]"
          >
            {step === 5 ? 'Begin Your Journey' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 safe-bottom">
          <Button variant="ghost" onClick={prevStep} className="min-h-[52px] w-full">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
