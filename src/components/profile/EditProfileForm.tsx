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
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [saving, setSaving] = useState(false);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    birthDate: profile?.birthDate || '',
    birthTime: profile?.birthTime || '',
    birthPlace: profile?.birthPlace || '',
    birthLat: profile?.birthLat,
    birthLon: profile?.birthLon,
    goals: (profile?.goals || []) as Goal[],
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName || '',
      birthDate: profile.birthDate || '',
      birthTime: profile.birthTime || '',
      birthPlace: profile.birthPlace || '',
      birthLat: profile.birthLat,
      birthLon: profile.birthLon,
      goals: (profile.goals || []) as Goal[],
    });
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
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        displayName: form.displayName.trim() || undefined,
        birthDate: form.birthDate || undefined,
        birthTime: birthTimeValue || undefined,
        birthPlace: form.birthPlace.trim() || undefined,
        goals: form.goals,
      };
      if (form.birthLat !== undefined && form.birthLon !== undefined) {
        updates.birthLat = form.birthLat;
        updates.birthLon = form.birthLon;
        // Resolve the birth-place IANA timezone from the coordinates so the
        // DB trigger computes birth_utc with the right offset (the device tz
        // is wrong for anyone who has moved since birth).
        const { deriveBirthTz } = await import('../../utils/birthTz');
        const birthTz = await deriveBirthTz(form.birthLat, form.birthLon);
        if (birthTz) updates.birthTz = birthTz;
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

        {form.birthPlace.length > 0 && form.birthPlace.length < 2 && (
          <p className="text-caption text-mystic-500">{t('app:settings.typeMinChars')}</p>
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
