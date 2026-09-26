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
import { Button, Input, Chip, DeckFan, EyebrowLabel, Progress, toast } from '../components/ui';
import { ZODIAC_ICONS } from '../components/icons';
import { localizeSignName } from '../i18n/localizeNames';
import { getZodiacSign } from '../utils/zodiac';
import { friendlyDisplayName } from '../utils/displayName';
import type { ZodiacSign as AstroSign } from '../types/astrology';
import { useAuth } from '../context/AuthContext';
import { validateBirthDate } from '../utils/validation';
import { isNative } from '../utils/platform';
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
  // Visuals + attribution run while the reveal is on screen; Begin awaits them.
  const pendingRef = useRef<Promise<void> | null>(null);
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

  // Steps 0-3 collect; step 4 is the reveal, the one moment the data just
  // entered is handed back: "The Sun was in Leo when you were born."
  const REVEAL = 4;

  const canProceed = () => {
    switch (step) {
      case 0: return data.goals.length > 0;
      case 1: return data.birthDate !== '' && !birthDateError;
      case 2: return true;
      case 3: return true;
      case REVEAL: return true;
      default: return false;
    }
  };

  const handleBirthDateChange = (value: string) => {
    setData(d => ({ ...d, birthDate: value }));

    if (value) {
      const validation = validateBirthDate(value);
      if (!validation.valid) {
        setBirthDateError(t(validation.error ?? 'oauth.basics.invalidBirthDate'));
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
      // onboardingComplete is written by finish(): App.tsx renders this page
      // only while it is false, so flipping it here would unmount the page
      // before the reveal step could paint.
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
      const uid = user.id;
      pendingRef.current = (async () => {
        await assignRandomVisuals(uid);

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
          }).eq('id', uid);
          clearAttribution();
        }
      })().catch(() => {});
    }

    setLoading(false);
    setStep(REVEAL);
  };

  const finish = async () => {
    setLoading(true);
    if (pendingRef.current) await pendingRef.current;
    // Sealing the profile last means the upsert's returned row also carries
    // the card back and background assignRandomVisuals just wrote, so Home
    // opens on the assigned back rather than the default.
    const { error } = await updateProfile({ onboardingComplete: true });
    if (error) {
      toast(t('oauth.toast.saveFailed'), 'error');
      setLoading(false);
      return;
    }
    toast(t('oauth.toast.welcome'), 'success');
    setLoading(false);
    onComplete();
  };

  const sunSign: AstroSign | null = data.birthDate
    ? ((): AstroSign => {
        const lower = getZodiacSign(data.birthDate);
        return (lower.charAt(0).toUpperCase() + lower.slice(1)) as AstroSign;
      })()
    : null;
  const SunGlyph = sunSign ? ZODIAC_ICONS[sunSign] : null;

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
      <Progress
        value={Math.min(step + 1, totalSteps)}
        max={totalSteps}
        size="sm"
        label={t('progress.step', { n: Math.min(step + 1, totalSteps), total: totalSteps })}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <DeckFan size="md" className="mb-4" />
                <h2 className="heading-display-lg text-mystic-100 mb-2">
                  {friendlyDisplayName(profile?.displayName || user?.email)
                    ? t('oauth.welcome', { name: friendlyDisplayName(profile?.displayName || user?.email) })
                    : t('oauth.welcomeNoName')}
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
                <div className="w-14 h-14 mx-auto mb-4 rounded-control bg-gold/10 text-gold flex items-center justify-center">
                  <Calendar className="w-7 h-7" aria-hidden />
                </div>
                <h2 className="heading-display-lg text-mystic-100 mb-2">
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
                <h2 className="heading-display-lg text-mystic-100 mb-2">
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
                          ? 'bg-gold/10 border-gold/50'
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
                <div className="w-14 h-14 mx-auto mb-4 rounded-control bg-gold/10 text-gold flex items-center justify-center">
                  <Bell className="w-7 h-7" aria-hidden />
                </div>
                <h2 className="heading-display-lg text-mystic-100 mb-2">
                  {t('oauth.notifications.heading')}
                </h2>
                <p className="text-mystic-400">
                  {isNative()
                    ? t('oauth.notifications.dailyPromise', { defaultValue: 'One reminder a day, at the time you choose. No spam.' })
                    : t('oauth.notifications.webNote', { defaultValue: 'Reminders arrive in the Arcana app on your phone. Your choice is saved for when you install it.' })}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setData(d => ({ ...d, notificationsEnabled: true }))}
                  className={`w-full p-4 rounded-xl border transition-all text-left active:scale-[0.98] ${
                    data.notificationsEnabled
                      ? 'bg-gold/10 border-gold/50'
                      : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                  }`}
                >
                  <span className={`font-medium ${data.notificationsEnabled ? 'text-gold' : 'text-mystic-200'}`}>
                    {t('oauth.notifications.yes')}
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
                      ? 'bg-gold/10 border-gold/50'
                      : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                  }`}
                >
                  <span className={`font-medium ${!data.notificationsEnabled ? 'text-gold' : 'text-mystic-200'}`}>
                    {t('oauth.notifications.no')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === REVEAL && sunSign && SunGlyph && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center" aria-hidden>
                <SunGlyph size={56} strokeWidth={1.4} />
              </div>
              <div className="space-y-3">
                <EyebrowLabel>{t('oauth.reveal.eyebrow')}</EyebrowLabel>
                <h2 className="heading-display-xl text-mystic-100">{localizeSignName(sunSign)}</h2>
                <p className="text-body text-mystic-300 leading-relaxed max-w-sm mx-auto">
                  {t('oauth.reveal.body', { sign: localizeSignName(sunSign) })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex gap-3 safe-bottom">
        {step > 0 && step !== REVEAL && (
          <Button size="lg" variant="ghost" onClick={prevStep} >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            {t('oauth.back', { defaultValue: 'Previous step' })}
          </Button>
        )}
        <Button size="lg"
          variant="gold"
          fullWidth
          onClick={step === REVEAL ? finish : step === totalSteps - 1 ? handleComplete : nextStep}
          disabled={!canProceed() || loading}
          loading={loading}
          
        >
          {step === REVEAL ? t('oauth.reveal.cta') : step === totalSteps - 1 ? t('oauth.beginJourney') : t('oauth.next')}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
