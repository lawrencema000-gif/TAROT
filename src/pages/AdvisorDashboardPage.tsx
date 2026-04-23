import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, Trash2, Users, Save, ChevronRight } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { advisorSessions } from '../dal';
import type { AdvisorAvailability, AdvisorSession } from '../dal/advisorSessions';

/**
 * Advisor-side dashboard. Visible to any authenticated user whose user_id
 * matches an advisor_profiles.user_id. RLS enforces access; we do a client
 * check to render a "You are not an advisor yet" CTA otherwise.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DraftSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function AdvisorDashboardPage() {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [advisorName, setAdvisorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<AdvisorSession[]>([]);
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: advisor } = await supabase
      .from('advisor_profiles')
      .select('id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (advisor) {
      setAdvisorId(advisor.id as string);
      setAdvisorName(advisor.display_name as string);
      const [availRes, upRes] = await Promise.all([
        advisorSessions.fetchAvailability(advisor.id as string),
        advisorSessions.fetchMySessions({ onlyUpcoming: true }),
      ]);
      if (availRes.ok) {
        setSlots(
          availRes.data.map((a: AdvisorAvailability) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime.slice(0, 5),
            endTime: a.endTime.slice(0, 5),
          })),
        );
      }
      if (upRes.ok) setUpcoming(upRes.data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addSlot = () => {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: '18:00', endTime: '21:00' }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, patch: Partial<DraftSlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    if (!advisorId) return;
    for (const s of slots) {
      if (s.startTime >= s.endTime) {
        toast(t('advisorDashboard.invalidSlot', { defaultValue: 'End time must be after start time.' }), 'error');
        return;
      }
    }
    setSaving(true);
    const res = await advisorSessions.setAvailabilitySlots(
      advisorId,
      slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })),
    );
    setSaving(false);
    if (res.ok) {
      toast(t('advisorDashboard.saved', { defaultValue: 'Availability saved' }), 'success');
    } else {
      toast(res.error, 'error');
    }
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;

  if (!advisorId) {
    return (
      <Card padding="lg" variant="glow">
        <h2 className="font-display text-lg text-mystic-100 mb-2">
          {t('advisorDashboard.notAdvisorTitle', { defaultValue: 'Become an advisor' })}
        </h2>
        <p className="text-sm text-mystic-400 leading-relaxed mb-3">
          {t('advisorDashboard.notAdvisorBody', {
            defaultValue: 'You are not set up as an advisor yet. Advisors are hand-vetted — reach out to apply.',
          })}
        </p>
        <a
          href="mailto:advisors@tarotlife.app?subject=Advisor%20application"
          className="inline-block text-gold text-sm underline underline-offset-2"
        >
          {t('advisorDashboard.apply', { defaultValue: 'Email advisors@tarotlife.app' })}
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-mystic-100">
            {t('advisorDashboard.title', { defaultValue: 'Advisor dashboard' })}
          </h1>
          {advisorName && <p className="text-sm text-mystic-400">{advisorName}</p>}
        </div>
      </div>

      <Card padding="lg">
        <h3 className="text-sm font-medium text-gold tracking-wide mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {t('advisorDashboard.upcomingTitle', { defaultValue: 'Upcoming sessions' })}
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-xs text-mystic-500 italic">
            {t('advisorDashboard.noUpcoming', { defaultValue: 'No sessions booked yet.' })}
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/advisors/session/${s.id}`)}
                className="w-full text-left p-3 bg-mystic-800/40 rounded-xl hover:bg-mystic-800/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-mystic-100 font-medium">
                      {new Date(s.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-mystic-400">
                      {s.durationMinutes}m · <span className="uppercase tracking-wider">{s.state}</span>
                    </p>
                    {s.topic && <p className="text-xs text-mystic-300 italic mt-1">"{s.topic}"</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-mystic-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gold tracking-wide flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {t('advisorDashboard.availabilityTitle', { defaultValue: 'Weekly availability' })}
          </h3>
          <Button variant="ghost" size="sm" onClick={addSlot} className="gap-1">
            <Plus className="w-3 h-3" />
            {t('advisorDashboard.addSlot', { defaultValue: 'Add slot' })}
          </Button>
        </div>
        <p className="text-[11px] text-mystic-500 mb-3">
          {t('advisorDashboard.availabilityHint', {
            defaultValue: 'Clients can book 30-min buckets within these windows. Times are in your device timezone.',
          })}
        </p>

        {slots.length === 0 ? (
          <div className="flex items-center gap-2 py-6 justify-center text-xs text-mystic-500">
            <Clock className="w-3 h-3" />
            {t('advisorDashboard.noSlots', { defaultValue: 'No availability yet — add one above.' })}
          </div>
        ) : (
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg">
                <select
                  value={s.dayOfWeek}
                  onChange={(e) => updateSlot(i, { dayOfWeek: parseInt(e.target.value) })}
                  className="bg-mystic-900 border border-mystic-700/50 rounded-lg px-2 py-1.5 text-xs text-mystic-100"
                >
                  {DAY_NAMES.map((d, idx) => (
                    <option key={idx} value={idx}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={s.startTime}
                  onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                  className="bg-mystic-900 border border-mystic-700/50 rounded-lg px-2 py-1.5 text-xs text-mystic-100"
                />
                <span className="text-mystic-500 text-xs">–</span>
                <input
                  type="time"
                  value={s.endTime}
                  onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                  className="bg-mystic-900 border border-mystic-700/50 rounded-lg px-2 py-1.5 text-xs text-mystic-100"
                />
                <button
                  onClick={() => removeSlot(i)}
                  className="ml-auto text-mystic-500 hover:text-pink-400 p-1"
                  aria-label="Remove slot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="gold"
          fullWidth
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] mt-4"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving
            ? t('advisorDashboard.saving', { defaultValue: 'Saving…' })
            : t('advisorDashboard.saveCta', { defaultValue: 'Save availability' })}
        </Button>
      </Card>
    </div>
  );
}

export default AdvisorDashboardPage;
