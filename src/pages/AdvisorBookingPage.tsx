import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Sparkles, AlertCircle, Users } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { advisors, advisorSessions, moonstones } from '../dal';
import type { AdvisorProfile } from '../dal/advisors';
import type { AdvisorAvailability } from '../dal/advisorSessions';

/**
 * Booking page for a single advisor. Reached from /advisors/:slug/book.
 *
 * Shows:
 *   - Advisor name + rate
 *   - Weekly availability (when the advisor has published any)
 *   - Duration picker (15 / 30 / 45 / 60)
 *   - Date + time picker constrained to the next 14 days within availability
 *   - Moonstone cost preview (computed client-side to match server RPC)
 *   - Book button → debits Moonstones and navigates to the session room
 */

const DURATIONS: Array<15 | 30 | 45 | 60> = [15, 30, 45, 60];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function costInMoonstones(hourlyRateCents: number | null, minutes: number): number {
  const cents = hourlyRateCents ?? 3000;
  return Math.max(1, Math.ceil((cents / 100) * (minutes / 60) * 10));
}

interface TimeSlot {
  iso: string;
  label: string;
  dayLabel: string;
}

function buildSlots(availability: AdvisorAvailability[], horizonDays: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  for (let d = 0; d < horizonDays; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dow = date.getDay();
    const dayAvail = availability.filter((a) => a.dayOfWeek === dow);
    for (const slot of dayAvail) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(startHour, startMin, 0, 0);
      const end = new Date(date);
      end.setHours(endHour, endMin, 0, 0);
      // Half-hour buckets
      for (let t = start.getTime(); t + 30 * 60_000 <= end.getTime(); t += 30 * 60_000) {
        const when = new Date(t);
        if (when <= now) continue;
        slots.push({
          iso: when.toISOString(),
          label: when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          dayLabel: `${DAY_NAMES[when.getDay()]} ${when.getDate()}`,
        });
      }
    }
  }
  return slots;
}

export function AdvisorBookingPage() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [advisor, setAdvisor] = useState<AdvisorProfile | null>(null);
  const [availability, setAvailability] = useState<AdvisorAvailability[]>([]);
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    if (!slug || !user) return;
    setLoading(true);
    const adv = await advisors.fetchBySlug(slug);
    if (adv.ok && adv.data) {
      setAdvisor(adv.data);
      const availRes = await advisorSessions.fetchAvailability(adv.data.id);
      if (availRes.ok) setAvailability(availRes.data);
    }
    const bal = await moonstones.getBalance(user.id);
    if (bal.ok) setBalance(bal.data);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  const slots = useMemo(() => buildSlots(availability, 14), [availability]);
  const groupedSlots = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const s of slots) {
      const bucket = map.get(s.dayLabel) ?? [];
      bucket.push(s);
      map.set(s.dayLabel, bucket);
    }
    return Array.from(map.entries()).slice(0, 7);
  }, [slots]);

  const cost = advisor ? costInMoonstones(advisor.hourlyRateCents, duration) : 0;

  const handleBook = async () => {
    if (!advisor || !selectedSlot) return;
    setBooking(true);
    const res = await advisorSessions.bookSession({
      advisorId: advisor.id,
      scheduledAt: new Date(selectedSlot),
      durationMinutes: duration,
      topic: topic.trim() || undefined,
    });
    setBooking(false);
    if (res.ok) {
      toast(
        t('advisorBooking.bookedToast', {
          defaultValue: 'Session booked — we debited {{n}} Moonstones.',
          n: res.data.moonstonesSpent,
        }),
        'success',
      );
      navigate(`/advisors/session/${res.data.sessionId}`);
    } else if (res.error === 'insufficient-balance') {
      toast(
        t('advisorBooking.insufficientBalance', {
          defaultValue: 'Not enough Moonstones. Top up and try again.',
        }),
        'error',
      );
    } else if (res.error === 'slot-taken') {
      toast(t('advisorBooking.slotTaken', { defaultValue: 'That slot just got taken. Pick another.' }), 'error');
    } else {
      toast(t('advisorBooking.bookFailed', { defaultValue: 'Could not book that slot.' }), 'error');
    }
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;
  if (!advisor) {
    return (
      <Card padding="lg">
        <p className="text-sm text-mystic-400">
          {t('advisorBooking.notFound', { defaultValue: 'Advisor not found.' })}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" />
        {t('advisorBooking.back', { defaultValue: 'Back' })}
      </button>

      <Card padding="lg" variant="glow">
        <div className="flex items-center gap-3 mb-2">
          {advisor.avatarUrl && (
            <img src={advisor.avatarUrl} alt={advisor.displayName} className="w-12 h-12 rounded-full object-cover" />
          )}
          <div>
            <h1 className="font-display text-xl text-mystic-100">{advisor.displayName}</h1>
            <p className="text-xs text-mystic-400">{advisor.headline}</p>
          </div>
        </div>
        {advisor.hourlyRateCents && (
          <p className="text-xs text-mystic-500 mt-2">
            {t('advisorBooking.rate', {
              defaultValue: 'Indicative rate: ${{dollars}}/hr',
              dollars: (advisor.hourlyRateCents / 100).toFixed(0),
            })}
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-medium text-gold tracking-wide mb-3">
          {t('advisorBooking.durationLabel', { defaultValue: 'Session length' })}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-2.5 text-sm rounded-xl border transition-all ${
                duration === d
                  ? 'bg-gold/15 text-gold border-gold/40'
                  : 'bg-mystic-800/40 text-mystic-300 border-mystic-700/40'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
        <p className="text-[11px] text-mystic-500 mt-3 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gold" />
          {t('advisorBooking.costPreview', {
            defaultValue: '{{n}} Moonstones',
            n: cost,
          })}
          {balance !== null && (
            <span className="text-mystic-600 ml-1">
              (balance: {balance})
            </span>
          )}
        </p>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-medium text-gold tracking-wide mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {t('advisorBooking.pickSlot', { defaultValue: 'Pick a time (next 7 days)' })}
        </h3>
        {groupedSlots.length === 0 ? (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-mystic-500">
              {t('advisorBooking.noAvailability', {
                defaultValue: 'This advisor has not published availability yet. Check back soon.',
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedSlots.map(([day, ts]) => (
              <div key={day}>
                <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {day}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ts.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSelectedSlot(s.iso)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        selectedSlot === s.iso
                          ? 'bg-gold/20 text-gold border-gold/40'
                          : 'bg-mystic-800/40 text-mystic-300 border-mystic-700/40 hover:border-mystic-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg">
        <label className="block mb-2 text-[10px] uppercase tracking-widest text-mystic-500">
          {t('advisorBooking.topicLabel', { defaultValue: 'What do you want help with? (optional)' })}
        </label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={500}
          placeholder={t('advisorBooking.topicPlaceholder', {
            defaultValue: 'Anything specific — a decision, a relationship, a transit…',
          })}
        />
      </Card>

      <Button
        variant="gold"
        fullWidth
        onClick={handleBook}
        disabled={booking || !selectedSlot || (balance !== null && balance < cost)}
        className="min-h-[52px]"
      >
        <Users className="w-4 h-4 mr-2" />
        {booking
          ? t('advisorBooking.booking', { defaultValue: 'Booking…' })
          : t('advisorBooking.bookCta', {
              defaultValue: 'Book for {{n}} Moonstones',
              n: cost,
            })}
      </Button>

      <p className="text-[10px] text-center text-mystic-600 italic">
        {t('advisorBooking.disclaimer', {
          defaultValue: 'Cancel for a full refund any time before the session starts.',
        })}
      </p>
    </div>
  );
}

export default AdvisorBookingPage;
