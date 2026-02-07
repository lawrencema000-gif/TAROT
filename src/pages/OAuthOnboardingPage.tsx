import { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Feather,
  Zap,
  Bell,
} from 'lucide-react';
import { Button, Input, Chip, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { validateBirthDate } from '../utils/validation';
import { supabase } from '../lib/supabase';
import type { Goal, TonePreference } from '../types';

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

interface OAuthOnboardingPageProps {
  onComplete: () => void;
}

async function assignRandomVisuals(userId: string) {
  try {
    const backgrounds: string[] = [];
    const { data: bgFolders } = await supabase.storage.from('backgrounds').list('', { limit: 100 });
    if (bgFolders) {
      for (const folder of bgFolders) {
        if (folder.id) continue;
        const { data: files } = await supabase.storage.from('backgrounds').list(folder.name, { limit: 100 });
        if (files) {
          for (const file of files) {
            if (/\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
              const { data: urlData } = supabase.storage.from('backgrounds').getPublicUrl(`${folder.name}/${file.name}`);
              if (urlData?.publicUrl) backgrounds.push(urlData.publicUrl);
            }
          }
        }
      }
    }

    const cardBacks: string[] = [];
    const { data: cbFolders } = await supabase.storage.from('card-backs').list('', { limit: 100 });
    if (cbFolders) {
      for (const folder of cbFolders) {
        if (folder.id) continue;
        const { data: files } = await supabase.storage.from('card-backs').list(folder.name, { limit: 100 });
        if (files) {
          for (const file of files) {
            if (/\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
              const { data: urlData } = supabase.storage.from('card-backs').getPublicUrl(`${folder.name}/${file.name}`);
              if (urlData?.publicUrl) cardBacks.push(urlData.publicUrl);
            }
          }
        }
      }
    }

    const updates: Record<string, string> = {};
    if (backgrounds.length > 0) {
      updates.background_url = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    }
    if (cardBacks.length > 0) {
      updates.card_back_url = cardBacks[Math.floor(Math.random() * cardBacks.length)];
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', userId);
    }
  } catch (err) {
    console.error('Failed to assign random visuals:', err);
  }
}

export function OAuthOnboardingPage({ onComplete }: OAuthOnboardingPageProps) {
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const [data, setData] = useState({
    goals: [] as Goal[],
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    tonePreference: 'gentle' as TonePreference,
    notificationsEnabled: true,
    notificationTime: '09:00',
  });

  const totalSteps = 4;

  const canProceed = () => {
    switch (step) {
      case 0: return data.goals.length > 0;
      case 1: return data.birthDate !== '' && !birthDateError;
      case 2: return true;
      case 3: return true;
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

  const handleComplete = async () => {
    setLoading(true);

    const { error } = await updateProfile({
      goals: data.goals,
      birthDate: data.birthDate,
      birthTime: data.birthTime || undefined,
      birthPlace: data.birthPlace || undefined,
      tonePreference: data.tonePreference,
      notificationsEnabled: data.notificationsEnabled,
      notificationTime: data.notificationTime,
      onboardingComplete: true,
    });

    if (error) {
      toast('Failed to save profile. Please try again.', 'error');
      setLoading(false);
      return;
    }

    if (user) {
      await assignRandomVisuals(user.id);
    }

    toast('Welcome to Arcana!', 'success');
    setLoading(false);
    onComplete();
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom constellation-bg">
      <div className="h-1 bg-mystic-800/50">
        <div
          className="h-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
                  <span className="text-2xl">
                    <Heart className="w-8 h-8 text-gold" />
                  </span>
                </div>
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  Welcome, {profile?.displayName || user?.email?.split('@')[0]}!
                </h2>
                <p className="text-mystic-400 mb-6">
                  Let's personalize your experience in just a few steps
                </p>
                <h3 className="font-display text-xl text-mystic-100 mb-2">
                  What do you want help with?
                </h3>
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

          {step === 1 && (
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

          {step === 2 && (
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

          {step === 3 && (
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

      <div className="p-6 flex gap-3 safe-bottom">
        {step > 0 && (
          <Button variant="ghost" onClick={prevStep} className="min-h-[52px]">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <Button
          variant="gold"
          fullWidth
          onClick={step === totalSteps - 1 ? handleComplete : nextStep}
          disabled={!canProceed() || loading}
          loading={loading}
          className="min-h-[52px]"
        >
          {step === totalSteps - 1 ? 'Begin Your Journey' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
