import { useState, useRef, useEffect } from 'react';
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
import { Button, Input, Chip, DeckFan, EyebrowLabel, Progress, toast, dismissToasts } from '../components/ui';
import { ZODIAC_ICONS } from '../components/icons';
import { localizeSignName } from '../i18n/localizeNames';
import { getZodiacSign } from '../utils/zodiac';
import { friendlyDisplayName } from '../utils/displayName';
import type { ZodiacSign as AstroSign } from '../types/astrology';
import { useAuth } from '../context/AuthContext';
import { validateBirthDate } from '../utils/validation';
import { isNative } from '../utils/platform';
import { useGeocode } from '../hooks/useAstrology';
import { deriveBirthTz } from '../utils/birthTz';
import { fallbackZone } from '../components/horoscope/birthZone';
import { supabase } from '../lib/supabase';
import { getAttribution, clearAttribution } from '../utils/attribution';
import { useT } from '../i18n/useT';
import { logWarn } from '../utils/telemetry';
import type { Goal, TonePreference, UserProfile } from '../types';

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

// New accounts used to be handed a random painted background and card back
// from Storage here. Every screen then sat on art it had not chosen, and the
// audits counted the contrast it cost on each. A new account now opens on
// the token canvas and the default back; the painted sets remain a choice
// in Settings → Appearance, where the pickers write the same two columns.

type OnboardingData = {
  goals: Goal[];
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  birthLat: number | undefined;
  birthLon: number | undefined;
  tonePreference: TonePreference;
  notificationsEnabled: boolean;
  notificationTime: string;
};

/**
 * The birth date the sign-up trigger writes before anyone has given one
 * (handle_new_user, 20260112113637: "user will update during onboarding").
 * Every new account, email or OAuth, reaches this page holding it.
 */
export const SIGNUP_PLACEHOLDER_BIRTH_DATE = '2000-01-01';

/**
 * The birth date the member gave, or '' while they have given none. Seeded
 * as it was, the trigger's placeholder filled the required field with
 * 01/01/2000 and enabled Continue, and a member who tapped through was saved
 * as a Capricorn born that day: every horoscope, chart and match then read
 * it (p9 Q05). Only an open onboarding can hold the placeholder unanswered:
 * `finish` seals the profile after `handleComplete` has written a real date.
 * A member truly born on 2000-01-01 who reloads at the reveal enters it once
 * more; nobody is saved with a date they did not give.
 */
function givenBirthDate(profile: Pick<UserProfile, 'birthDate' | 'onboardingComplete'> | null | undefined): string {
  const date = profile?.birthDate ?? '';
  return !profile?.onboardingComplete && date === SIGNUP_PLACEHOLDER_BIRTH_DATE ? '' : date;
}

/**
 * What the profile already holds. `handleComplete` writes everything before
 * the reveal step, so a reload before "Begin" used to restart at step 0 with
 * every field blank; the fields come back from the row instead.
 */
function seedFromProfile(profile: UserProfile | null | undefined): OnboardingData {
  return {
    goals: Array.isArray(profile?.goals) ? profile.goals : [],
    birthDate: givenBirthDate(profile),
    birthTime: profile?.birthTime ?? '',
    birthPlace: profile?.birthPlace ?? '',
    birthLat: typeof profile?.birthLat === 'number' ? profile.birthLat : undefined,
    birthLon: typeof profile?.birthLon === 'number' ? profile.birthLon : undefined,
    tonePreference: profile?.tonePreference ?? 'gentle',
    notificationsEnabled: profile?.notificationsEnabled ?? true,
    notificationTime: profile?.notificationTime || '09:00',
  };
}

/**
 * The first step still missing an answer. Goals and the birth date are the
 * two required answers; tone and reminders always hold a value, so once both
 * required ones are on the row the stepper resumes at the last collecting
 * step, one tap from "Begin".
 */
function firstIncompleteStep(data: OnboardingData): number {
  if (data.goals.length === 0) return 0;
  if (!data.birthDate) return 1;
  return 3;
}

/*
 * The answers of each step as a profile patch. Each step saves its own as it
 * is given (gap-1-12): before, the goals and the birth details were written
 * only together at Finish, so a member who closed the tab on the goals or the
 * birth step came back to step 0 with nothing selected. Finish writes all
 * four again, in one call, as it always has.
 */
export function goalsPatch(d: Pick<OnboardingData, 'goals'>): Partial<UserProfile> {
  return { goals: d.goals };
}

export async function birthPatch(
  d: Pick<OnboardingData, 'birthDate' | 'birthTime' | 'birthPlace' | 'birthLat' | 'birthLon'>,
  profile: Pick<UserProfile, 'timezone'> | null | undefined,
  derive: (lat: number, lon: number) => Promise<string | null> = deriveBirthTz,
): Promise<Record<string, unknown>> {
  const place = d.birthPlace.trim();
  const patch: Record<string, unknown> = {
    birthDate: d.birthDate,
    // null, not undefined: a time the member cleared is cleared on the row.
    birthTime: d.birthTime || null,
    birthPlace: place || null,
    // The device's zone, as the email onboarding writes it. An OAuth
    // account otherwise keeps the signup default, 'UTC', which the
    // birth_utc trigger falls back to when no birth-place zone is known
    // (F21).
    timezone: fallbackZone(profile),
  };
  if (d.birthLat !== undefined && d.birthLon !== undefined) {
    patch.birthLat = d.birthLat;
    patch.birthLon = d.birthLon;
    // The birth place's own zone: the one the birth time is read in, by
    // the chart cast and by the birth_utc trigger (F21). Derived from the
    // coordinates, which every result carries (the geocoder's zone is not
    // on every row). A zone that cannot be derived clears one left by an
    // earlier place.
    patch.birthTz = await derive(d.birthLat, d.birthLon);
  } else {
    // No place picked from the list: no coordinates, so none of an
    // earlier pick (a resumed onboarding) may stay under the new text.
    // Horoscope resolves a typed place itself.
    patch.birthLat = null;
    patch.birthLon = null;
    patch.birthTz = null;
  }
  return patch;
}

export function tonePatch(d: Pick<OnboardingData, 'tonePreference'>): Partial<UserProfile> {
  return { tonePreference: d.tonePreference };
}

export function remindersPatch(d: Pick<OnboardingData, 'notificationsEnabled' | 'notificationTime'>): Partial<UserProfile> {
  return { notificationsEnabled: d.notificationsEnabled, notificationTime: d.notificationTime };
}

/** How long a valid typed birth date settles before it is saved. */
const BIRTH_SAVE_DEBOUNCE_MS = 600;

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
  const [data, setData] = useState<OnboardingData>(() => seedFromProfile(profile));
  const [step, setStep] = useState(() => firstIncompleteStep(seedFromProfile(profile)));
  const [loading, setLoading] = useState(false);
  const [birthDateError, setBirthDateError] = useState('');
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch, usedFallback: geoApprox } = useGeocode();
  const [showGeoResults, setShowGeoResults] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Attribution runs while the reveal is on screen; Begin awaits it.
  const pendingRef = useRef<Promise<void> | null>(null);

  // Step saves run one after another through this queue, in the order the
  // answers were given. The stepper never awaits it (a failed save only
  // means that step is not resumable); Finish awaits it, then writes every
  // answer again, so its write lands last.
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const birthSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest answers and profile, for a debounced save or a flush on
  // pagehide that runs after the render that scheduled it.
  const dataRef = useRef(data);
  dataRef.current = data;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const enqueue = (makePatch: () => Record<string, unknown> | Promise<Record<string, unknown>>) => {
    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        const { error } = await updateProfile(await makePatch());
        if (error) logWarn('onboarding.stepSave', 'Onboarding step save failed', { errorMessage: error.message });
      })
      .catch((err: unknown) => {
        logWarn('onboarding.stepSave', 'Onboarding step save failed', {
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      });
  };

  const saveBirth = () => {
    const snapshot = dataRef.current;
    const prof = profileRef.current;
    // Never a partial or impossible date: the row keeps what it had.
    if (!validateBirthDate(snapshot.birthDate).valid) return;
    enqueue(() => birthPatch(snapshot, prof));
  };

  const cancelBirthSave = () => {
    if (birthSaveRef.current) {
      clearTimeout(birthSaveRef.current);
      birthSaveRef.current = null;
    }
  };

  /** Saves the birth details once the member has paused on a valid date. */
  const scheduleBirthSave = () => {
    cancelBirthSave();
    birthSaveRef.current = setTimeout(() => {
      birthSaveRef.current = null;
      saveBirth();
    }, BIRTH_SAVE_DEBOUNCE_MS);
  };

  // A date typed and left (tab closed, app switched) is saved at once rather
  // than lost with the pending debounce.
  const flushBirthSaveRef = useRef(() => {});
  flushBirthSaveRef.current = () => {
    if (!birthSaveRef.current) return;
    cancelBirthSave();
    saveBirth();
  };
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushBirthSaveRef.current();
    };
    const onPageHide = () => flushBirthSaveRef.current();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      flushBirthSaveRef.current();
    };
  }, []);

  const totalSteps = 4;

  // Steps 0-3 collect; step 4 is the reveal, the one moment the data just
  // entered is handed back: "The Sun was in Leo when you were born."
  const REVEAL = 4;

  // A toast belongs to the step that raised it; "Account created" should
  // not still be on screen two steps later (R6 A34).
  useEffect(() => {
    dismissToasts();
  }, [step]);

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
        scheduleBirthSave();
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
    // The picked place is saved with its zone, beside a valid date.
    scheduleBirthSave();
  };

  const handleComplete = async () => {
    setLoading(true);
    cancelBirthSave();
    // The step saves land first; this write, with every answer, lands last.
    await saveQueueRef.current;

    // onboardingComplete is written by finish(): App.tsx renders this page
    // only while it is false, so flipping it here would unmount the page
    // before the reveal step could paint.
    const profileUpdate: Record<string, unknown> = {
      ...goalsPatch(data),
      ...(await birthPatch(data, profile)),
      ...tonePatch(data),
      ...remindersPatch(data),
    };

    const { error } = await updateProfile(profileUpdate);

    if (error) {
      toast(t('oauth.toast.saveFailed'), 'error');
      setLoading(false);
      return;
    }

    if (user) {
      const uid = user.id;
      pendingRef.current = (async () => {
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
    // Sealing the profile last: App.tsx renders this page only while the
    // flag is false, so the write that flips it is the one that lets go.
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
    if (step >= totalSteps - 1) return;
    // Each answer is saved as Continue is tapped, so a reopened tab, a new
    // sign-in or another device resumes here with it (gap-1-12). Never
    // awaited: Finish writes everything again.
    const snapshot = data;
    if (step === 0) {
      enqueue(() => goalsPatch(snapshot));
    } else if (step === 1) {
      cancelBirthSave();
      saveBirth();
    } else if (step === 2) {
      enqueue(() => tonePatch(snapshot));
    }
    setStep(s => s + 1);
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
                  <label htmlFor="onboarding-birth-date" className="block text-meta font-medium text-mystic-300 mb-2">
                    {t('oauth.basics.birthDate')} <span className="text-coral" aria-hidden>*</span>
                  </label>
                  {/* Starts empty until the member gives a date: Continue
                      waits for one (p9 Q05). */}
                  <Input
                    id="onboarding-birth-date"
                    type="date"
                    required
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
                    <p className="text-meta text-coral mt-2" role="status">{birthDateError}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-meta font-medium text-mystic-300 mb-2">
                    <Clock className="w-4 h-4 text-mystic-500" />
                    {t('oauth.basics.birthTime')}
                    <span className="text-caption text-mystic-500 font-normal">{t('oauth.basics.optional')}</span>
                  </label>
                  <Input
                    type="time"
                    value={data.birthTime}
                    onChange={e => setData(d => ({ ...d, birthTime: e.target.value }))}
                  />
                  <p className="text-caption text-mystic-500 mt-1.5">{t('oauth.basics.birthTimeHint')}</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-meta font-medium text-mystic-300 mb-2">
                    <MapPin className="w-4 h-4 text-mystic-500" />
                    {t('oauth.basics.birthPlace')}
                    <span className="text-caption text-mystic-500 font-normal">{t('oauth.basics.optional')}</span>
                  </label>
                  <Input
                    value={data.birthPlace}
                    onChange={e => handleBirthPlaceInput(e.target.value)}
                    placeholder={t('oauth.basics.searchPlaceholder')}
                    icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  />
                  {data.birthLat && data.birthLon && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-gold/10 border border-gold/20 rounded-inset">
                      <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      <span className="text-caption text-mystic-300">{t('oauth.basics.locationVerified')}</span>
                    </div>
                  )}
                  {showGeoResults && !data.birthLat && geoResults.length > 0 && (
                    <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto bg-mystic-800/60 rounded-inset border border-mystic-700/40">
                      {geoResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectGeoResult(r)}
                          className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-mystic-700/40 transition-colors text-ui text-mystic-300 truncate cursor-pointer"
                        >
                          {r.displayName}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* The search fell back to the offline city list: say so, without blocking. */}
                  {geoApprox && (data.birthLat !== undefined || (showGeoResults && geoResults.length > 0)) && (
                    <p className="text-meta text-mystic-400 mt-1.5">{t('app:horoscope.onboarding.approxLocation', { defaultValue: 'Using an approximate location — the nearest city we could match.' })}</p>
                  )}
                  {/* What the search could not do: no match, no connection, or
                      only same-name places outside the region typed (O#35). */}
                  {showGeoResults && data.birthLat === undefined && !geoLoading && geoError && (
                    <p className="text-meta text-gold/80 mt-1.5" role="status">{geoError}</p>
                  )}
                  <p className="text-caption text-mystic-500 mt-1.5">{t('oauth.basics.birthPlaceHint')}</p>
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
                      className={`w-full p-4 rounded-control border transition-all text-left active:scale-[0.98] flex items-center gap-4 ${
                        isSelected
                          ? 'bg-gold/10 border-gold/50'
                          : 'bg-mystic-800/30 border-mystic-700/50 hover:border-mystic-600/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-control flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gold/20' : 'bg-mystic-700/30'
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-gold' : 'text-mystic-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? 'text-gold' : 'text-mystic-200'}`}>
                          {option.label}
                        </p>
                        <p className="text-meta text-mystic-500">{option.description}</p>
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
                  className={`w-full p-4 rounded-control border transition-all text-left active:scale-[0.98] ${
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
                    <label className="block text-meta text-mystic-400 mb-2">{t('oauth.notifications.reminderTime')}</label>
                    <Input
                      type="time"
                      value={data.notificationTime}
                      onChange={e => setData(d => ({ ...d, notificationTime: e.target.value }))}
                    />
                  </div>
                )}

                <button
                  onClick={() => setData(d => ({ ...d, notificationsEnabled: false }))}
                  className={`w-full p-4 rounded-control border transition-all text-left active:scale-[0.98] ${
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
          // One line at 360px: the label is short and the button never
          // shrinks or wraps; the gold button takes the rest of the row.
          <Button size="lg" variant="ghost" onClick={prevStep} className="shrink-0 whitespace-nowrap">
            <ChevronLeft className="w-4 h-4" aria-hidden />
            {t('oauth.back', { defaultValue: 'Back' })}
          </Button>
        )}
        <Button size="lg"
          variant="gold"
          fullWidth
          onClick={step === REVEAL ? finish : step === totalSteps - 1 ? handleComplete : nextStep}
          disabled={!canProceed() || loading}
          loading={loading}
          
        >
          {/* Labels short enough for one line beside Back at 360 px in every
              locale (F60): "Begin my first ritual" wrapped, and the screen it
              led to was the reveal, not a ritual. */}
          {step === REVEAL ? t('oauth.reveal.cta') : step === totalSteps - 1 ? t('oauth.finish') : t('oauth.next')}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
