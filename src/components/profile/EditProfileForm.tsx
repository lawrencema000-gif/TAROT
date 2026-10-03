import { useEffect, useRef, useState } from 'react';
import { User, Calendar, Clock, MapPin, Search, Loader2, Check, Mail } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Input, ChipGroup, toast, ListRow, ListRowGroup } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useGeocode } from '../../hooks/useAstrology';
import { useT } from '../../i18n/useT';
import type { Goal } from '../../types';

/**
 * The one edit-profile form.
 *
 * Profile and Settings each had their own: Profile's asked for name, time,
 * place and six goals; Settings' for name, date, time and city and no goals
 * — so a user who chose "Healing" in onboarding could neither see nor
 * remove it, and the birth date was editable from one door only (R6 A11).
 * This form carries every field and the full Goal union, and both doors
 * open it: Profile wraps it in `EditProfileSheet`, Settings renders it
 * inside its own sub-sheet.
 */

/** Every goal the product knows (types/index.ts `Goal`); labels from app.profile.goals.* */
export const GOAL_VALUES: Goal[] = [
  'love',
  'career',
  'confidence',
  'healing',
  'focus',
  'purpose',
  'stress',
  'clarity',
  'growth',
  'wellness',
  'creativity',
];

interface EditProfileFormProps {
  onCancel: () => void;
  onSaved?: () => void;
}

export function EditProfileForm({ onCancel, onSaved }: EditProfileFormProps) {
  const { t } = useT(['app', 'common']);
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch, usedFallback: geoApprox } = useGeocode();
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const seed = () => ({
    displayName: profile?.displayName || '',
    birthDate: profile?.birthDate || '',
    birthTime: profile?.birthTime || '',
    birthPlace: profile?.birthPlace || '',
    birthLat: profile?.birthLat,
    birthLon: profile?.birthLon,
    goals: (profile?.goals || []) as Goal[],
  });
  const [form, setFormState] = useState(seed);
  // Once the user has typed or picked anything, the form is theirs. The
  // profile object is replaced on every app resume, visibility change and
  // realtime update; re-seeding on each of those wiped half-typed edits
  // (P7 #8). Until the first edit, a fresher profile may still seed it.
  const dirty = useRef(false);
  const setForm: typeof setFormState = (next) => {
    dirty.current = true;
    setFormState(next);
  };

  useEffect(() => {
    if (!profile || dirty.current) return;
    setFormState(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const goalOptions = GOAL_VALUES.map((value) => ({ value, label: t(`app:profile.goals.${value}`) }));
  // Time comes back from the DB `time` column with seconds; the control wants HH:MM.
  const birthTimeValue = form.birthTime ? form.birthTime.slice(0, 5) : '';

  const handleCityInput = (value: string) => {
    setForm((f) => ({ ...f, birthPlace: value, birthLat: undefined, birthLon: undefined }));
    setShowGeoResults(true);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    if (value.trim().length >= 2) {
      geoDebounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
    }
  };

  const handleSelectGeoResult = (result: { lat: number; lon: number; displayName: string }) => {
    setForm((f) => ({ ...f, birthPlace: result.displayName, birthLat: result.lat, birthLon: result.lon }));
    setShowGeoResults(false);
  };

  const handleSave = async () => {
    const place = form.birthPlace.trim();
    const placeChanged = place !== (profile?.birthPlace || '').trim();
    const located = form.birthLat !== undefined && form.birthLon !== undefined;

    // Required fields: a blank here used to be sent as `undefined`, which the
    // profile mapper drops, so "saved" changed nothing.
    if (!form.displayName.trim()) {
      toast(t('app:profile.toasts.nameRequired', { defaultValue: 'Add a name so we know what to call you.' }), 'error');
      return;
    }
    if (!form.birthDate) {
      toast(t('app:profile.toasts.birthDateRequired', { defaultValue: 'Add your birth date — every chart is cast from it.' }), 'error');
      return;
    }
    // A new place must come from the list: the text alone has no
    // coordinates, and saving it kept the old city's lat/lon/timezone
    // under the new name (P7 #9).
    if (place && placeChanged && !located) {
      toast(t('app:profile.toasts.pickCity', { defaultValue: 'Pick your birth city from the list so your charts use the right place.' }), 'error');
      setShowGeoResults(true);
      return;
    }

    setSaving(true);
    try {
      // Optional fields the user emptied are sent as null, so they are
      // actually cleared (undefined is dropped by mapProfileToDb).
      const updates: Record<string, unknown> = {
        displayName: form.displayName.trim(),
        birthDate: form.birthDate,
        birthTime: birthTimeValue || null,
        birthPlace: place || null,
        goals: form.goals,
      };
      if (!place) {
        updates.birthLat = null;
        updates.birthLon = null;
        updates.birthTz = null;
      } else if (located) {
        updates.birthLat = form.birthLat;
        updates.birthLon = form.birthLon;
        // Resolve the birth-place IANA timezone from the coordinates so the
        // DB trigger computes birth_utc with the right offset (the device tz
        // is wrong for anyone who has moved since birth). A new place whose
        // zone cannot be resolved clears the old city's zone rather than
        // keeping it.
        const { deriveBirthTz } = await import('../../utils/birthTz');
        const birthTz = await deriveBirthTz(form.birthLat!, form.birthLon!);
        if (birthTz) updates.birthTz = birthTz;
        else if (placeChanged) updates.birthTz = null;
      }

      const { error } = await updateProfile(updates);
      if (error) {
        console.error('[EditProfile] Save failed:', error.message);
        toast(t('app:profile.toasts.saveFailed', { defaultValue: 'Couldn’t save your profile — check your connection and try again.' }), 'error');
        return;
      }
      await refreshProfile();
      toast(t('app:profile.profileUpdated'), 'success');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const located = form.birthLat !== undefined && form.birthLon !== undefined;
  const unpickedPlace =
    form.birthPlace.trim().length > 0 &&
    !located &&
    form.birthPlace.trim() !== (profile?.birthPlace || '').trim();

  return (
    <div className="space-y-5">
      <Input
        label={t('app:settings.editProfile.displayName')}
        value={form.displayName}
        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        placeholder={t('app:settings.editProfile.displayNamePlaceholder')}
        icon={<User className="w-4 h-4" aria-hidden />}
        maxLength={60}
      />

      <Input
        label={t('app:settings.editProfile.birthDate')}
        type="date"
        value={form.birthDate}
        onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
        icon={<Calendar className="w-4 h-4" aria-hidden />}
        max={new Date().toISOString().split('T')[0]}
      />

      <Input
        label={t('app:settings.editProfile.birthTime')}
        type="time"
        value={birthTimeValue}
        onChange={(e) => setForm((f) => ({ ...f, birthTime: e.target.value }))}
        icon={<Clock className="w-4 h-4" aria-hidden />}
      />

      <div className="space-y-3">
        <Input
          label={t('app:profile.birthPlaceOptional')}
          value={form.birthPlace}
          onChange={(e) => handleCityInput(e.target.value)}
          placeholder={t('app:profile.editProfileSheet.searchCity')}
          icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
          autoComplete="off"
        />

        {located && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gold/10 border border-gold/20 rounded-control">
            <Check className="w-4 h-4 text-gold flex-shrink-0" aria-hidden />
            <span className="text-meta text-mystic-200 truncate">{form.birthPlace}</span>
          </div>
        )}

        {showGeoResults && !located && geoResults.length > 0 && (
          <ListRowGroup className="max-h-48 overflow-y-auto">
            {geoResults.map((r, i) => (
              <ListRow
                key={i}
                size="md"
                icon={<MapPin />}
                label={r.displayName.split(', ')[0]}
                meta={r.displayName.split(', ').slice(1).join(', ') || undefined}
                trailing="none"
                onClick={() => handleSelectGeoResult(r)}
              />
            ))}
          </ListRowGroup>
        )}

        {/* The search fell back to the offline city list: say so, without blocking. */}
        {geoApprox && (located || (showGeoResults && geoResults.length > 0)) && (
          <p className="text-meta text-mystic-400">{t('app:horoscope.onboarding.approxLocation', { defaultValue: 'Using an approximate location — the nearest city we could match.' })}</p>
        )}

        {form.birthPlace.length > 0 && form.birthPlace.length < 2 && (
          <p className="text-caption text-mystic-500">{t('app:settings.typeMinChars')}</p>
        )}

        {unpickedPlace && form.birthPlace.length >= 2 && (
          <p className="text-caption text-mystic-400">
            {t('app:profile.pickCityHint', { defaultValue: 'Choose the city from the list to save it.' })}
          </p>
        )}

        {!geoLoading && geoError && !located && (
          <p className="text-caption text-gold" role="status">{geoError}</p>
        )}
      </div>

      <div>
        <p className="block text-meta font-medium text-mystic-300 mb-3" id="edit-profile-goals">{t('app:profile.yourGoals')}</p>
        <div role="group" aria-labelledby="edit-profile-goals">
          <ChipGroup
            options={goalOptions}
            selected={form.goals}
            onChange={(goals) => setForm((f) => ({ ...f, goals: goals as Goal[] }))}
            multiple
          />
        </div>
      </div>

      {user?.email && (
        <div className="p-3 bg-mystic-800 rounded-control">
          <div className="flex items-center gap-2 text-mystic-400 min-w-0">
            <Mail className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-meta truncate">{user.email}</span>
          </div>
          <p className="text-caption text-mystic-500 mt-1">{t('app:settings.emailNotChangeable')}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" fullWidth onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button variant="gold" fullWidth onClick={handleSave} loading={saving}>
          {t('app:settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The form in its own Sheet — what Profile's Edit button opens. */
export function EditProfileSheet({ open, onClose }: EditProfileSheetProps) {
  const { t } = useT('app');
  return (
    <Sheet open={open} onClose={onClose} title={t('profile.editProfileSheet.title')}>
      <EditProfileForm onCancel={onClose} onSaved={onClose} />
    </Sheet>
  );
}
