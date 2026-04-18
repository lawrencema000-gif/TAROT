import { useState, useRef } from 'react';
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
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import { Button, Input, Chip, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { validateBirthDate } from '../utils/validation';
import { useGeocode } from '../hooks/useAstrology';
import { supabase } from '../lib/supabase';
import { getAttribution, clearAttribution } from '../utils/attribution';
import { useT } from '../i18n/useT';
import type { Goal, TonePreference } from '../types';

// Value-based goal options — labels read from app.profile.goals.* at render time.
const goalValues: Goal[] = ['love', 'career', 'confidence', 'healing', 'focus', 'purpose', 'stress'];

// Value-based tone options with icons — labels and descriptions read from
// onboarding.oauth.tone.* at render time.
const toneValues: { value: TonePreference; icon: typeof Heart }[] = [
  { value: 'gentle', icon: Heart },
  { value: 'direct', icon: Zap },
  { value: 'playful', icon: Feather },
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
  const { t } = useT(['onboarding', 'app', 'common']);
  const goalOptions = goalValues.map(value => ({
    value,
    label: t(`app:profile.goals.${value}`),
  }));
  const toneOptions = toneValues.map(({ value, icon }) => ({
    value,
    icon,
    label: t(`oauth.tone.${value}.label`),
    description: t(`oauth.tone.${value}.desc`),
  }));
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const { results: geoResults, loading: geoLoading, search: geoSearch } = useGeocode();
  const [showGeoResults, setShowGeoResults] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [data, setData] = useState({
    goals: [] as Goal[],
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    birthLat: undefined as number | undefined,
    birthLon: undefined as number | undefined,
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
        setBirthDateError(validation.error || t('oauth.basics.invalidBirthDate'));
      } else {
        setBirthDateError('');
      }
    } else {
      setBirthDateError('');
    }
  };

  const handleBirthPlaceInput = (value: string) => {
    setData(d => ({ ...d, birthPlace: value, birthLat: undefined, birthLon: undefined }));
    setShowGeoResults(true);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
  };

  const handleSelectGeoResult = (result: { lat: number; lon: number; displayName: string }) => {
    setData(d => ({ ...d, birthPlace: result.displayName, birthLat: result.lat, birthLon: result.lon }));
    setShowGeoResults(false);
  };

  const handleComplete = async () => {
    setLoading(true);

    const profileUpdate: Record<string, unknown> = {
      goals: data.goals,
      birthDate: data.birthDate,
      birthTime: data.birthTime || undefined,
      birthPlace: data.birthPlace || undefined,
      tonePreference: data.tonePreference,
      notificationsEnabled: data.notificationsEnabled,
      notificationTime: data.notificationTime,
      onboardingComplete: true,
    };
    if (data.birthLat !== undefined) profileUpdate.birthLat = data.birthLat;
    if (data.birthLon !== undefined) profileUpdate.birthLon = data.birthLon;

    const { error } = await updateProfile(profileUpdate);

    if (error) {
      toast(t('oauth.toast.saveFailed'), 'error');
      setLoading(false);
      return;
    }

    if (user) {
      await assignRandomVisuals(user.id);

      // Persist ad attribution (UTM from landing) — only on first complete
      const attr = getAttribution();
      if (attr) {
        await supabase.from('profiles').update({
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_content: attr.utm_content,
          utm_term: attr.utm_term,
          first_referrer: attr.first_referrer,
        }).eq('id', user.id);
        clearAttribution();
      }
    }

    toast(t('oauth.toast.welcome'), 'success');
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
                  {t('oauth.welcome', { name: profile?.displayName || user?.email?.split('@')[0] || '' })}
                </h2>
                <p className="text-mystic-400 mb-6">
                  {t('oauth.welcomeSub')}
                </p>
                <h3 className="font-display text-xl text-mystic-100 mb-2">
                  {t('oauth.goals.heading')}
                </h3>
                <p className="text-mystic-400">{t('oauth.goals.hint')}</p>
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
                  {t('oauth.basics.heading')}
                </h2>
                <p className="text-mystic-400">{t('oauth.basics.hint')}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-mystic-300 mb-2">
                    {t('oauth.basics.birthDate')} <span className="text-coral">*</span>
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
                    {t('oauth.basics.birthTime')}
                    <span className="text-xs text-mystic-500 font-normal">{t('oauth.basics.optional')}</span>
                  </label>
                  <Input
                    type="time"
                    value={data.birthTime}
                    onChange={e => setData(d => ({ ...d, birthTime: e.target.value }))}
                  />
                  <p className="text-xs text-mystic-500 mt-1.5">{t('oauth.basics.birthTimeHint')}</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-mystic-300 mb-2">
                    <MapPin className="w-4 h-4 text-mystic-500" />
                    {t('oauth.basics.birthPlace')}
                    <span className="text-xs text-mystic-500 font-normal">{t('oauth.basics.optional')}</span>
                  </label>
                  <Input
                    value={data.birthPlace}
                    onChange={e => handleBirthPlaceInput(e.target.value)}
                    placeholder={t('oauth.basics.searchPlaceholder')}
                    icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  />
                  {data.birthLat && data.birthLon && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-gold/10 border border-gold/20 rounded-lg">
                      <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      <span className="text-xs text-mystic-300">{t('oauth.basics.locationVerified')}</span>
                    </div>
                  )}
                  {showGeoResults && !data.birthLat && geoResults.length > 0 && (
                    <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto bg-mystic-800/60 rounded-lg border border-mystic-700/40">
                      {geoResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectGeoResult(r)}
                          className="w-full text-left px-3 py-2 hover:bg-mystic-700/40 transition-colors text-sm text-mystic-300 truncate cursor-pointer"
                        >
                          {r.displayName}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-mystic-500 mt-1.5">{t('oauth.basics.birthPlaceHint')}</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="font-display text-2xl text-mystic-100 mb-2">
                  {t('oauth.tone.heading')}
                </h2>
                <p className="text-mystic-400">{t('oauth.tone.hint')}</p>
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
                    <label className="block text-sm text-mystic-400 mb-2">{t('oauth.notifications.reminderTime')}</label>
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
          {step === totalSteps - 1 ? t('oauth.beginJourney') : t('oauth.next')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
