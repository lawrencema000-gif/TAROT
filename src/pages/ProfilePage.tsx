import { useState, useEffect, useRef } from 'react';
import {
  User,
  Target,
  Crown,
  Bookmark,
  Flame,
  Star,
  Edit2,
  Heart,
  Brain,
  Zap,
  MapPin,
  Search,
  Loader2,
  Check,
  Gift,
  Briefcase,
  Calendar,
  ScrollText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Sheet, Input, ChipGroup, toast, EyebrowLabel, Section, EmptyState, PageHeader, Page, Progress, Tag, ListRow, ListRowGroup } from '../components/ui';
import { localizeSeekerRank } from '../i18n/localizeRank';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { CosmicProfileSection } from '../components/profile/CosmicProfileSection';
import { ReferralSheet } from '../components/referral/ReferralSheet';
import { InviteFriendSheet } from '../components/compat/InviteFriendSheet';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { useAuth } from '../context/AuthContext';
import { useGeocode } from '../hooks/useAstrology';
import { savedHighlights as savedHighlightsDal } from '../dal';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { getLevelThresholds, getXPProgress } from '../services/levelSystem';
import { useT } from '../i18n/useT';
import type { Goal } from '../types';
// Value-based goal keys — labels pulled from app.profile.goals at render time.
const goalValues: Goal[] = ['love', 'career', 'clarity', 'growth', 'wellness', 'creativity'];

interface SavedHighlight {
  id: string;
  highlight_type: string;
  date: string;
  content: Record<string, unknown>;
}

export function ProfilePage() {
  const { t } = useT('app');
  const goalOptions = goalValues.map(value => ({ label: t(`profile.goals.${value}`), value }));
  const loveLanguageLabels: Record<string, string> = {
    'words-of-affirmation': t('profile.loveLanguages.words-of-affirmation'),
    'quality-time': t('profile.loveLanguages.quality-time'),
    'receiving-gifts': t('profile.loveLanguages.receiving-gifts'),
    'acts-of-service': t('profile.loveLanguages.acts-of-service'),
    'physical-touch': t('profile.loveLanguages.physical-touch'),
  };
  const { profile, user, updateProfile } = useAuth();
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showCompatInvite, setShowCompatInvite] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const referralEnabled = useFeatureFlag('referral');
  const compatInviteEnabled = useFeatureFlag('compat-invite');
  const careerReportEnabled = useFeatureFlag('career-report');
  const yearAheadEnabled = useFeatureFlag('year-ahead-report');
  const natalReportEnabled = useFeatureFlag('natal-chart-report');
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [savedHighlights, setSavedHighlights] = useState<SavedHighlight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100, percentage: 0 });
  const [, setLevelThresholds] = useState<Map<number, number>>(new Map());
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; displayName: string } | null>(null);
  const [editData, setEditData] = useState({
    displayName: profile?.displayName || '',
    birthTime: profile?.birthTime || '',
    birthPlace: profile?.birthPlace || '',
    goals: (profile?.goals || []) as Goal[],
  });

  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
  const zodiacInfo = zodiacSign ? zodiacData[zodiacSign] : null;

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        birthTime: profile.birthTime || '',
        birthPlace: profile.birthPlace || '',
        goals: profile.goals || [],
      });
      setLocationQuery(profile.birthPlace || '');
      if (profile.birthLat && profile.birthLon) {
        setSelectedLocation({
          lat: profile.birthLat,
          lon: profile.birthLon,
          displayName: profile.birthPlace || '',
        });
      } else {
        setSelectedLocation(null);
      }
    }
  }, [profile]);

  useEffect(() => {
    const loadLevelData = async () => {
      const thresholds = await getLevelThresholds();
      setLevelThresholds(thresholds);

      if (profile) {
        const progress = getXPProgress(profile.xp || 0, profile.level || 1, thresholds);
        setXpProgress(progress);
      }
    };
    loadLevelData();
  }, [profile]);

  const loadSavedHighlights = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const res = await savedHighlightsDal.listForUser(user.id, { limit: 20 });
    if (res.ok) {
      setSavedHighlights(
        res.data.map(row => ({
          id: row.id,
          highlight_type: row.highlightType,
          date: row.date,
          content: row.content,
        })),
      );
    }
    setLoadingSaved(false);
  };

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setEditData(d => ({ ...d, birthPlace: value }));
    setSelectedLocation(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length > 2) {
      debounceRef.current = setTimeout(() => {
        geoSearch(value);
      }, 500);
    }
  };

  const handleSelectLocation = (location: { lat: number; lon: number; displayName: string }) => {
    setSelectedLocation(location);
    setLocationQuery(location.displayName);
    setEditData(d => ({ ...d, birthPlace: location.displayName }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const updateData: Record<string, unknown> = {
      displayName: editData.displayName,
      birthTime: editData.birthTime || undefined,
      birthPlace: editData.birthPlace || undefined,
      goals: editData.goals,
    };

    if (selectedLocation) {
      updateData.birthLat = selectedLocation.lat;
      updateData.birthLon = selectedLocation.lon;
      // Resolve the birth-place IANA timezone from the coordinates so
      // the DB trigger computes birth_utc with the right offset (the
      // device tz fallback is wrong for users who moved since birth).
      const { deriveBirthTz } = await import('../utils/birthTz');
      const birthTz = await deriveBirthTz(selectedLocation.lat, selectedLocation.lon);
      if (birthTz) updateData.birthTz = birthTz;
    }

    const { error } = await updateProfile(updateData);

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(t('profile.profileUpdated'), 'success');
      setShowEditProfile(false);
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const formatBirthProfile = () => {
    if (!profile?.birthDate) return null;
    const date = new Date(profile.birthDate);
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const parts = [dateStr];
    if (profile.birthTime) parts.push(`at ${profile.birthTime}`);
    if (profile.birthPlace) parts.push(`in ${profile.birthPlace}`);
    return parts.join(' ');
  };

  return (
    <Page spacing="sm">
      <PageHeader title={t('pageTitles.profile.title')} />

      <Card variant="glow" padding="lg">
        <div className="flex items-start gap-4">
          <div className="relative">
            {/* Persona avatar — the "Starlit Seeker" portrait. The gradient
                fill is the whole treatment; no ring, no halo. */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/30 via-mystic-700 to-cosmic-blue/30 flex items-center justify-center">
              {zodiacInfo ? (
                <span className="text-4xl">{zodiacInfo.symbol}</span>
              ) : (
                <User className="w-10 h-10 text-mystic-400" />
              )}
            </div>
            {profile?.isPremium && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-mystic-950" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="heading-display-md text-mystic-100 truncate">{profile?.displayName || t('home.seeker')}</h2>
            {zodiacInfo && (
              <p className="text-gold text-sm mt-0.5">{zodiacInfo.name}</p>
            )}
            <p className="text-sm text-mystic-500 truncate mt-0.5">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowEditProfile(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Eyebrow + divider above the stats grid — matches the
            "Your progress" treatment from the mockup. */}
        <div className="mt-6 mb-3 flex items-center gap-3">
          <EyebrowLabel className="!text-mystic-400">
            {t('profile.yourProgress', { defaultValue: 'Your progress' })}
          </EyebrowLabel>
          <span className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" aria-hidden />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Stat tiles sit on the card, so they take one step up the fill
              ladder (mystic-800) rather than a hairline. */}
          <div className="bg-mystic-800 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-gold" />
              <span className="text-2xl font-display text-mystic-100">{profile?.streak || 0}</span>
            </div>
            <p className="text-xs text-mystic-500">{t('profile.dayStreak')}</p>
          </div>
          <div className="bg-mystic-800 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-4 h-4 text-cosmic-blue" />
              <span className="text-2xl font-display text-mystic-100">{t('profile.level', { n: profile?.level || 1 })}</span>
            </div>
            <p className="text-xs text-mystic-500">{localizeSeekerRank(profile?.seekerRank)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-mystic-500">{t('profile.xpProgress')}</span>
            <span className="text-gold">{t('home.xpValue', { current: xpProgress.current, required: xpProgress.required })}</span>
          </div>
          {/* value is the service's own percentage rather than current/required:
              getXPProgress reports 100% at max level, where required is 0 and a
              current/required ratio would clamp to nothing. */}
          <Progress
            value={xpProgress.percentage}
            max={100}
            size="sm"
            variant="gradient"
            label={t('profile.xpProgress')}
          />
        </div>
      </Card>

      {(profile?.mbtiType || profile?.loveLanguage) && (
        <Section title={t('profile.personalityBadges')} headingLevel="h3" spacing="sm">
          <div className="flex flex-wrap gap-2">
            {profile?.mbtiType && (
              <Tag tone="blue" size="md" icon={<Brain className="w-4 h-4" aria-hidden />}>
                {profile.mbtiType}
              </Tag>
            )}
            {profile?.loveLanguage && (
              <Tag tone="rose" size="md" icon={<Heart className="w-4 h-4" aria-hidden />}>
                {loveLanguageLabels[profile.loveLanguage] || profile.loveLanguage}
              </Tag>
            )}
          </div>
        </Section>
      )}

      {formatBirthProfile() && (
        <Section title={t('profile.birthProfile')} headingLevel="h3" spacing="sm">
          <div className="flex items-start gap-3">
            {zodiacInfo && (
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-xl">
                {zodiacInfo.symbol}
              </div>
            )}
            <div>
              <p className="text-mystic-200">{formatBirthProfile()}</p>
              <p className="text-sm text-mystic-500 mt-1">{t('profile.elementSign', { element: zodiacInfo?.element })}</p>
            </div>
          </div>
        </Section>
      )}

      {profile?.birthDate && (
        <CosmicProfileSection
          birthDate={profile.birthDate}
          displayName={profile.displayName}
        />
      )}

      {profile?.goals && profile.goals.length > 0 && (
        <Section
          headingLevel="h3"
          spacing="sm"
          title={<span className="inline-flex items-center gap-2"><Target className="w-4 h-4 text-mystic-500" /> {t('profile.yourGoals')}</span>}
        >
          <div className="flex flex-wrap gap-2">
            {profile.goals.map(goal => (
              <Tag key={goal} tone="gold" size="md">
                {t(`profile.goals.${goal}`, { defaultValue: goal })}
              </Tag>
            ))}
          </div>
        </Section>
      )}

      <ListRowGroup>
        {profile?.isPremium ? (
          <ListRow
            size="lg"
            icon={<Crown />}
            tone="gold"
            label={<span className="text-gold">{t('profile.premiumMember')}</span>}
            meta={t('profile.premiumSub')}
            trailing={<Zap className="w-5 h-5 shrink-0 text-gold" aria-hidden />}
            className="bg-gold/5"
          />
        ) : (
          <ListRow
            size="lg"
            icon={<Crown />}
            tone="gold"
            label={t('profile.upgradeToPremium')}
            meta={t('profile.upgradeSub')}
            onClick={handleUpgrade}
          />
        )}

        {careerReportEnabled && profile?.mbtiType && (
          <ListRow
            size="lg"
            icon={<Briefcase />}
            tone="gold"
            label={t('profile.careerReportTitle', { defaultValue: 'Career Archetype Report' })}
            meta={t('profile.careerReportSub', { defaultValue: 'Deep coaching read for {{mbti}}', mbti: profile.mbtiType })}
            onClick={() => navigate('/reports/career')}
          />
        )}

        {yearAheadEnabled && profile?.birthDate && profile?.birthTime && profile?.birthPlace && (
          <ListRow
            size="lg"
            icon={<Calendar />}
            tone="blue"
            label={t('profile.yearAheadTitle', { defaultValue: 'Year Ahead Forecast' })}
            meta={t('profile.yearAheadSub', { defaultValue: '12 months of transits to your chart' })}
            onClick={() => navigate('/reports/year-ahead')}
          />
        )}

        {natalReportEnabled && profile?.birthDate && (
          <ListRow
            size="lg"
            icon={<ScrollText />}
            tone="violet"
            label={t('profile.natalReportTitle', { defaultValue: 'Full Natal Chart' })}
            meta={t('profile.natalReportSub', { defaultValue: 'Printable deep chart reading' })}
            onClick={() => navigate('/reports/natal-chart')}
          />
        )}

        {compatInviteEnabled && (profile?.mbtiType || profile?.birthDate) && (
          <ListRow
            size="lg"
            icon={<Heart />}
            tone="rose"
            label={t('profile.compatInviteTitle', { defaultValue: 'Compatibility invite' })}
            meta={t('profile.compatInviteSub', { defaultValue: 'Share a link to get a joint reading' })}
            onClick={() => setShowCompatInvite(true)}
          />
        )}

        {referralEnabled && (
          <ListRow
            size="lg"
            icon={<Gift />}
            tone="gold"
            label={t('profile.referralTitle', { defaultValue: 'Invite friends' })}
            meta={t('profile.referralSub', { defaultValue: 'Earn 100 Moonstones per friend' })}
            onClick={() => setShowReferral(true)}
          />
        )}

        <ListRow
          size="lg"
          icon={<Bookmark />}
          label={t('profile.saved')}
          meta={t('profile.yourBookmarks')}
          onClick={() => { setShowSaved(true); loadSavedHighlights(); }}
        />
      </ListRowGroup>

      <p className="text-center text-xs text-mystic-600 px-4">
        {t('profile.disclaimer')}
      </p>

      <Sheet open={showEditProfile} onClose={() => setShowEditProfile(false)} title={t('profile.editProfileSheet.title')}>
        <div className="space-y-6">
          <Input
            label={t('profile.editProfileSheet.displayName')}
            value={editData.displayName}
            onChange={e => setEditData(d => ({ ...d, displayName: e.target.value }))}
            placeholder={t('profile.editProfileSheet.yourName')}
          />

          <Input
            label={t('profile.editProfileSheet.birthTimeOptional')}
            type="time"
            value={editData.birthTime}
            onChange={e => setEditData(d => ({ ...d, birthTime: e.target.value }))}
          />

          <div>
            <label className="block text-sm font-medium text-mystic-300 mb-2">{t('profile.birthPlaceOptional')}</label>
            <div className="relative">
              <Input
                value={locationQuery}
                onChange={e => handleLocationInput(e.target.value)}
                placeholder={t('profile.editProfileSheet.searchCity')}
                icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              />
            </div>

            {selectedLocation && (
              <div className="flex items-center gap-2 p-3 mt-2 bg-gold/10 border border-gold/20 rounded-xl">
                <Check className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-sm text-mystic-200 truncate">{selectedLocation.displayName}</span>
              </div>
            )}

            {!selectedLocation && geoResults.length > 0 && (
              <ListRowGroup className="mt-2 max-h-48 overflow-y-auto">
                {geoResults.map((r, i) => (
                  <ListRow
                    key={i}
                    size="md"
                    icon={<MapPin />}
                    label={r.displayName.split(', ')[0]}
                    meta={r.displayName.split(', ').slice(1).join(', ') || undefined}
                    trailing="none"
                    onClick={() => handleSelectLocation(r)}
                  />
                ))}
              </ListRowGroup>
            )}

            {!selectedLocation && !geoLoading && geoError && (
              <p className="text-xs text-amber-400/80 mt-1">{geoError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mystic-300 mb-3">Your Goals</label>
            <ChipGroup
              options={goalOptions}
              selected={editData.goals}
              onChange={goals => setEditData(d => ({ ...d, goals: goals as Goal[] }))}
              multiple
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveProfile} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title="Saved">
        <div className="space-y-3">
          {loadingSaved ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-mystic-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedHighlights.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={<Bookmark />}
              title={t('profile.noSaved')}
              description={t('profile.noSavedSub')}
            />
          ) : (
            savedHighlights.map(highlight => (
              <Card key={highlight.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    highlight.highlight_type === 'tarot' ? 'bg-cosmic-blue/20' :
                    highlight.highlight_type === 'horoscope' ? 'bg-gold/20' : 'bg-mystic-700'
                  }`}>
                    <span className="text-lg">
                      {highlight.highlight_type === 'tarot' ? '🎴' :
                       highlight.highlight_type === 'horoscope' ? '⭐' : '✨'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mystic-200 capitalize">{highlight.highlight_type}</p>
                    <p className="text-xs text-mystic-500">{new Date(highlight.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Sheet>

      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
      />

      <ReferralSheet
        open={showReferral}
        onClose={() => setShowReferral(false)}
      />

      <InviteFriendSheet
        open={showCompatInvite}
        onClose={() => setShowCompatInvite(false)}
      />
    </Page>
  );
}
