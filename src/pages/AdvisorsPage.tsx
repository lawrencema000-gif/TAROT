import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Star, Clock, Globe, Users, Send, Calendar } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { advisors } from '../dal';
import type { AdvisorProfile } from '../dal/advisors';

type View = 'directory' | 'profile';

export function AdvisorsPage() {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();
  const bookingEnabled = useFeatureFlag('advisor-booking');
  const [view, setView] = useState<View>('directory');
  const [list, setList] = useState<AdvisorProfile[]>([]);
  const [selected, setSelected] = useState<AdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    advisors.fetchDirectory().then((res) => {
      if (!mounted) return;
      if (res.ok) setList(res.data);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const submitInterest = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const res = await advisors.createInterest({
      userId: user.id,
      advisorId: selected.id,
      topic: topic.trim() || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      toast(t('advisors.interestSubmitted', { defaultValue: 'Interest noted — we\'ll notify you when {{n}} opens bookings.', n: selected.displayName }), 'success');
      setTopic('');
      setView('directory');
    } else {
      toast(t('advisors.interestFailed', { defaultValue: 'Could not submit interest' }), 'error');
    }
  };

  if (view === 'profile' && selected) {
    return (
      <div className="space-y-4 pb-6">
        <button
          onClick={() => setView('directory')}
          className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('advisors.back', { defaultValue: 'All advisors' })}
        </button>

        <Card variant="glow" padding="lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center border border-gold/30">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-mystic-100">{selected.displayName}</h2>
              {selected.ratingAvg !== null && (
                <div className="flex items-center gap-1 text-xs text-gold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{selected.ratingAvg.toFixed(1)}</span>
                  <span className="text-mystic-500">({selected.ratingCount})</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-gold/80 text-sm italic">"{selected.headline}"</p>
        </Card>

        <Card padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed whitespace-pre-wrap">{selected.bio}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {selected.yearsExperience !== null && (
            <Card padding="md">
              <div className="flex items-center gap-2 text-xs text-mystic-500 mb-1">
                <Clock className="w-3 h-3" />
                <span>{t('advisors.yearsLabel', { defaultValue: 'Experience' })}</span>
              </div>
              <p className="text-mystic-200 text-sm">{selected.yearsExperience} {t('advisors.years', { defaultValue: 'years' })}</p>
            </Card>
          )}
          {selected.languages.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 text-xs text-mystic-500 mb-1">
                <Globe className="w-3 h-3" />
                <span>{t('advisors.languagesLabel', { defaultValue: 'Languages' })}</span>
              </div>
              <p className="text-mystic-200 text-sm">{selected.languages.join(' · ').toUpperCase()}</p>
            </Card>
          )}
        </div>

        {selected.specialties.length > 0 && (
          <Card padding="md">
            <p className="text-xs text-mystic-500 mb-2">{t('advisors.specialtiesLabel', { defaultValue: 'Specialties' })}</p>
            <div className="flex flex-wrap gap-1">
              {selected.specialties.map((s) => (
                <span key={s} className="text-xs px-2 py-1 bg-mystic-800/50 text-mystic-300 rounded-full">
                  {t(`advisors.specialties.${s}`, { defaultValue: s.replace(/-/g, ' ') })}
                </span>
              ))}
            </div>
          </Card>
        )}

        {selected.hourlyRateCents !== null && (
          <Card padding="md" className="bg-mystic-800/20">
            <p className="text-xs text-mystic-500 mb-1">{t('advisors.rateLabel', { defaultValue: 'Indicative rate' })}</p>
            <p className="text-mystic-200 text-sm">${(selected.hourlyRateCents / 100).toFixed(0)} / hour</p>
          </Card>
        )}

        {bookingEnabled && user && (
          <Button
            variant="gold"
            fullWidth
            onClick={() => navigate(`/advisors/${selected.slug}/book`)}
            className="min-h-[52px]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {t('advisors.bookCta', { defaultValue: 'Book a session' })}
          </Button>
        )}

        {/* Interest capture */}
        {user ? (
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3">
              {t('advisors.expressInterest', { defaultValue: 'Express interest' })}
            </h3>
            <p className="text-xs text-mystic-400 mb-3 italic">
              {t('advisors.bookingsComingSoon', {
                defaultValue: 'Paid sessions are rolling out gradually. Tell us what you\'d like help with and we\'ll notify you when this advisor opens bookings.',
              })}
            </p>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t('advisors.topicPlaceholder', {
                defaultValue: 'What would you like to work on? (optional)',
              }) as string}
              className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40 mb-3"
            />
            <Button variant="primary" fullWidth onClick={submitInterest} disabled={submitting} className="min-h-[48px]">
              <Send className="w-4 h-4 mr-2" />
              {submitting
                ? t('advisors.submitting', { defaultValue: 'Submitting...' })
                : t('advisors.notifyMe', { defaultValue: 'Notify me when bookings open' })}
            </Button>
          </Card>
        ) : (
          <Card padding="md" className="bg-gold/5 border-gold/20 text-center">
            <p className="text-sm text-mystic-300">
              {t('advisors.signInToExpress', { defaultValue: 'Sign in to express interest' })}
            </p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-gold" />
        <h1 className="font-display text-2xl text-mystic-100">
          {t('advisors.title', { defaultValue: 'Advisors' })}
        </h1>
      </div>

      <Card padding="md" className="bg-cosmic-violet/5 border-cosmic-violet/20">
        <p className="text-xs text-mystic-400 leading-relaxed italic">
          {t('advisors.intro', {
            defaultValue:
              'Meet the readers joining Arcana. Paid sessions are rolling out gradually. Express interest to be notified when each advisor opens bookings.',
          })}
        </p>
      </Card>

      {loading && (
        <div className="text-center py-12 text-mystic-500 text-sm">
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      )}

      {!loading && list.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-mystic-400 text-sm italic">
            {t('advisors.empty', { defaultValue: 'No advisors available yet. Check back soon.' })}
          </p>
        </Card>
      )}

      {list.map((advisor) => (
        <button
          key={advisor.id}
          onClick={() => { setSelected(advisor); setView('profile'); }}
          className="w-full text-left"
        >
          <Card padding="md" className="hover:border-gold/30 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center border border-gold/20 flex-shrink-0">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display text-lg text-mystic-100">{advisor.displayName}</h3>
                  {advisor.ratingAvg !== null && (
                    <div className="flex items-center gap-0.5 text-xs text-gold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{advisor.ratingAvg.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="text-gold/70 text-xs italic mb-2 line-clamp-1">{advisor.headline}</p>
                <div className="flex flex-wrap gap-1">
                  {advisor.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 bg-mystic-800/50 text-mystic-400 rounded">
                      {t(`advisors.specialties.${s}`, { defaultValue: s.replace(/-/g, ' ') })}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}

export default AdvisorsPage;
