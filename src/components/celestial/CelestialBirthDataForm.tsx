import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button, Input } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';

/**
 * Inline birth-data capture for the Celestial Map empty state.
 *
 * Users who reach the empty state usually fall into one of two camps:
 *
 *   1. New signups whose OAuth path skipped birth-date entry, so the
 *      profile has it blank.
 *   2. Existing users whose `birthDate` is stored in a non-ISO format
 *      that `new Date(...)` rejects (legacy date pickers, free-text
 *      onboarding flows, imported from a previous app version).
 *
 * Sending them to /profile to fix it is a five-tap detour with a
 * settings page they didn't ask to open. Instead, give them the form
 * here. Pre-fill anything we *do* know from the profile so they only
 * type what's missing.
 *
 * Birth date is required (no astrocartography without it). Birth time
 * and birth place are optional — the map still renders without them at
 * reduced accuracy, and we explicitly say so so users with missing
 * records don't bounce off the form.
 */

interface Props {
  onSaved: () => void;
}

export function CelestialBirthDataForm({ onSaved }: Props) {
  const { t } = useT('app');
  const { profile, updateProfile } = useAuth();

  // Pre-fill from whatever the profile already has. If birthDate is in
  // a non-ISO format (e.g. "MM/DD/YYYY") we try a one-shot reparse to
  // surface it as ISO in the date input; failing that, we just leave
  // the date input blank so the user picks fresh.
  const initialDate = (() => {
    const raw = profile?.birthDate;
    if (!raw) return '';
    // Already ISO?
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    // Try Date parse — handles a lot of common formats.
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const [birthDate, setBirthDate] = useState(initialDate);
  const [birthTime, setBirthTime] = useState(profile?.birthTime ?? '');
  const [birthPlace, setBirthPlace] = useState(profile?.birthPlace ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the profile loads after the component mounts (race with auth
  // hydration), seed the form once that lands.
  useEffect(() => {
    if (profile?.birthDate && !birthDate) {
      const parsed = new Date(profile.birthDate);
      if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        setBirthDate(`${y}-${m}-${d}`);
      }
    }
    if (profile?.birthTime && !birthTime) setBirthTime(profile.birthTime);
    if (profile?.birthPlace && !birthPlace) setBirthPlace(profile.birthPlace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.birthDate, profile?.birthTime, profile?.birthPlace]);

  async function handleSave() {
    if (!birthDate) {
      setError(t('celestial.form.dateRequired', { defaultValue: 'Please enter your birth date.' }) as string);
      return;
    }
    // Validate the date parses — if not, surface a clear error instead
    // of letting astronomy-engine throw later.
    const test = new Date(`${birthDate}T${birthTime || '12:00'}:00Z`);
    if (Number.isNaN(test.getTime())) {
      setError(t('celestial.form.dateInvalid', { defaultValue: 'That date doesn’t look right. Try YYYY-MM-DD.' }) as string);
      return;
    }
    setError(null);
    setSaving(true);
    const { error: saveError } = await updateProfile({
      birthDate,
      birthTime: birthTime || undefined,
      birthPlace: birthPlace || undefined,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4"
    >
      <Input
        type="date"
        label={t('celestial.form.dateLabel', { defaultValue: 'Birth date' }) as string}
        icon={<Calendar className="w-4 h-4" />}
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        max={new Date().toISOString().slice(0, 10)}
        required
      />
      <Input
        type="time"
        label={t('celestial.form.timeLabel', { defaultValue: 'Birth time (optional)' }) as string}
        icon={<Clock className="w-4 h-4" />}
        value={birthTime}
        onChange={(e) => setBirthTime(e.target.value)}
        placeholder="--:--"
      />
      <Input
        type="text"
        label={t('celestial.form.placeLabel', { defaultValue: 'Birth place (optional)' }) as string}
        icon={<MapPin className="w-4 h-4" />}
        value={birthPlace}
        onChange={(e) => setBirthPlace(e.target.value)}
        placeholder={t('celestial.form.placePlaceholder', { defaultValue: 'e.g. Tokyo, Japan' }) as string}
      />

      <p className="text-xs text-mystic-500 leading-relaxed">
        {t('celestial.form.accuracyHint', {
          defaultValue:
            'Time and place sharpen the lines. Without them the map still renders, but may be off by a few hundred kilometers near the equator.',
        })}
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/40 p-3">
          <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-red-200 leading-relaxed">{error}</p>
        </div>
      )}

      <Button
        variant="primary"
        size="md"
        fullWidth
        disabled={saving || !birthDate}
        onClick={handleSave}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            {t('celestial.form.saving', { defaultValue: 'Saving…' })}
          </>
        ) : (
          t('celestial.form.cta', { defaultValue: 'Draw my map' })
        )}
      </Button>
    </motion.div>
  );
}
