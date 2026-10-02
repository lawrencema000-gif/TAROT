import { useState, useEffect, useMemo } from 'react';
import {
  User,
  Crown,
  Bookmark,
  Flame,
  Star,
  Edit2,
  Heart,
  Brain,
  Zap,
  Gift,
  Briefcase,
  Calendar,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Sheet, EyebrowLabel, Section, EmptyState, PageHeader, Page, Progress, Tag, ListRow, ListRowGroup, ListSkeleton, PageGrid, TarotCardIcon, HoroscopeWheelIcon } from '../components/ui';
import { ZODIAC_ICONS } from '../components/icons';
import type { ZodiacSign as AstroSign } from '../types/astrology';
import { localizeSeekerRank } from '../i18n/localizeRank';
import { localizeSignName } from '../i18n/localizeNames';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { CosmicProfileSection } from '../components/profile/CosmicProfileSection';
import { EditProfileSheet } from '../components/profile/EditProfileForm';
import { ReferralSheet } from '../components/referral/ReferralSheet';
import { InviteFriendSheet } from '../components/compat/InviteFriendSheet';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { useAuth } from '../context/AuthContext';
import { savedHighlights as savedHighlightsDal } from '../dal';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { getLevelThresholds, getXPProgress } from '../services/levelSystem';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { parseLocalDate } from '../utils/localDate';

interface SavedHighlight {
  id: string;
  highlight_type: string;
  date: string;
  content: Record<string, unknown>;
}

const ELEMENT_DEFAULT: Record<string, string> = {
  fire: 'Fire',
  earth: 'Earth',
  air: 'Air',
  water: 'Water',
};

export function ProfilePage() {
  const { t } = useT('app');
  const locale = getLocale();
  const loveLanguageLabels: Record<string, string> = {
    'words-of-affirmation': t('profile.loveLanguages.words-of-affirmation'),
    'quality-time': t('profile.loveLanguages.quality-time'),
    'receiving-gifts': t('profile.loveLanguages.receiving-gifts'),
    'acts-of-service': t('profile.loveLanguages.acts-of-service'),
    'physical-touch': t('profile.loveLanguages.physical-touch'),
  };
  const { profile, user } = useAuth();
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
  const [savedHighlights, setSavedHighlights] = useState<SavedHighlight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100, percentage: 0 });

  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
  const zodiacInfo = zodiacSign ? zodiacData[zodiacSign] : null;
  // utils/zodiac keys signs in lower case; the glyph set uses the capitalised names.
  const sunAstro = zodiacSign ? ((zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1)) as AstroSign) : null;
  const SignGlyph = sunAstro ? ZODIAC_ICONS[sunAstro] : null;
  const sunName = sunAstro ? localizeSignName(sunAstro) : '';

  const numberFmt = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }), [locale]);
  const shortDateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }), [locale]);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);

  useEffect(() => {
    const loadLevelData = async () => {
      const thresholds = await getLevelThresholds();
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

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  /**
   * "June 15, 1990 · 14:30 · Tokyo, Japan" — the three facts as a list,
   * each through Intl for the locale. The DB `time` column carries seconds;
   * the user typed minutes (R6 A19).
   */
  const birthLine = useMemo(() => {
    if (!profile?.birthDate) return null;
    const parts = [dateFmt.format(parseLocalDate(profile.birthDate))];
    if (profile.birthTime) {
      const [h, m] = profile.birthTime.split(':').map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const d = new Date(2000, 0, 1, h, m);
        parts.push(timeFmt.format(d));
      }
    }
    if (profile.birthPlace) parts.push(profile.birthPlace);
    return parts.join(' · ');
  }, [profile?.birthDate, profile?.birthTime, profile?.birthPlace, dateFmt, timeFmt]);

  const elementLabel = zodiacInfo
    ? t(`profile.elements.${zodiacInfo.element}`, { defaultValue: ELEMENT_DEFAULT[zodiacInfo.element] ?? zodiacInfo.element })
    : '';

  const savedTypeLabel = (type: string) =>
    t(`profile.savedTypes.${type}`, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) });
  const SavedIcon = ({ type }: { type: string }) =>
    type === 'tarot' ? <TarotCardIcon /> : type === 'horoscope' ? <HoroscopeWheelIcon /> : <Sparkles />;
  const savedTone = (type: string) => (type === 'tarot' ? 'blue' : type === 'horoscope' ? 'gold' : 'violet') as const;

  const identity = (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {/* The Sun-sign glyph stands for the person: one fill, no ring, no halo. */}
          <div className="w-20 h-20 rounded-full bg-gold/10 text-gold flex items-center justify-center">
            {zodiacInfo && SignGlyph ? (
              <SignGlyph size={40} strokeWidth={1.4} aria-label={sunName} />
            ) : (
              <User className="w-10 h-10 text-mystic-400" aria-hidden />
            )}
          </div>
          {profile?.isPremium && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold rounded-full flex items-center justify-center" aria-label={t('profile.premiumMember')} role="img">
              <Crown className="w-4 h-4 text-mystic-950" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="heading-display-md heading-strong text-mystic-100 truncate">{profile?.displayName || t('profile.untitled', { defaultValue: 'Your profile' })}</h2>
          {zodiacInfo && (
            <p className="text-ui text-gold mt-0.5">{sunName}</p>
          )}
          <p className="text-meta text-mystic-500 truncate mt-0.5">{profile?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowEditProfile(true)} aria-label={t('profile.editProfileSheet.title')}>
          <Edit2 className="w-4 h-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-6 mb-3">
        <EyebrowLabel align="left" className="!text-mystic-400">
          {t('profile.yourProgress', { defaultValue: 'Your progress' })}
        </EyebrowLabel>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Stat tiles sit on the card, so they take one step up the fill
            ladder (mystic-800) rather than a hairline. Figures in Inter with
            tabular numerals — a "1" in the display serif read as an "I" (R6 A29). */}
        <div className="bg-mystic-800 rounded-control p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-gold" aria-hidden />
            <span className="text-title font-semibold tabular-nums text-mystic-100">{numberFmt.format(profile?.streak || 0)}</span>
          </div>
          <p className="text-caption text-mystic-500">{t('profile.dayStreak')}</p>
        </div>
        <div className="bg-mystic-800 rounded-control p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Star className="w-4 h-4 text-cosmic-blue-ink" aria-hidden />
            <span className="text-title font-semibold tabular-nums text-mystic-100">{t('profile.level', { n: numberFmt.format(profile?.level || 1) })}</span>
          </div>
          <p className="text-caption text-mystic-500">{localizeSeekerRank(profile?.seekerRank)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-meta mb-1">
          <span className="text-mystic-500">{t('profile.xpProgress')}</span>
          <span className="text-gold tabular-nums">{t('home.xpValue', { current: numberFmt.format(xpProgress.current), required: numberFmt.format(xpProgress.required) })}</span>
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
        <p className="text-caption text-mystic-500 mt-1.5 tabular-nums">
          {t('profile.totalXp', { defaultValue: '{{n}} XP in total', n: numberFmt.format(profile?.xp || 0) })}
        </p>
      </div>
    </Card>
  );

  const main = (
    <div className="space-y-4">
      {identity}

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

      {birthLine && (
        <Section title={t('profile.birthProfile')} headingLevel="h3" spacing="sm">
          <div className="flex items-start gap-3">
            {zodiacInfo && SignGlyph && (
              <div className="w-10 h-10 rounded-control bg-gold/10 text-gold flex items-center justify-center shrink-0" aria-hidden>
                <SignGlyph size={24} strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-ui text-mystic-200 tabular-nums">{birthLine}</p>
              {zodiacInfo && (
                <p className="text-meta text-mystic-500 mt-1">{t('profile.elementSign', { element: elementLabel })}</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {profile?.goals && profile.goals.length > 0 && (
        <Section headingLevel="h3" spacing="sm" title={t('profile.yourGoals')}>
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
            label={t('profile.careerReportTitle', { defaultValue: 'Career archetype report' })}
            meta={t('profile.careerReportSub', { defaultValue: 'Deep coaching read for {{mbti}}', mbti: profile.mbtiType })}
            onClick={() => navigate('/reports/career')}
          />
        )}

        {yearAheadEnabled && profile?.birthDate && profile?.birthTime && profile?.birthPlace && (
          <ListRow
            size="lg"
            icon={<Calendar />}
            tone="blue"
            label={t('profile.yearAheadTitle', { defaultValue: 'Year ahead forecast' })}
            meta={t('profile.yearAheadSub', { defaultValue: '12 months of transits to your chart' })}
            onClick={() => navigate('/reports/year-ahead')}
          />
        )}

        {natalReportEnabled && profile?.birthDate && (
          <ListRow
            size="lg"
            icon={<ScrollText />}
            tone="violet"
            label={t('profile.natalReportTitle', { defaultValue: 'Full natal chart' })}
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

      <p className="text-center text-caption text-mystic-500 px-4">
        {t('profile.disclaimer')}
      </p>
    </div>
  );

  const cosmic = profile?.birthDate ? (
    <CosmicProfileSection
      birthDate={profile.birthDate}
      displayName={profile.displayName}
    />
  ) : null;

  return (
    <Page spacing="sm">
      <PageHeader title={t('pageTitles.profile.title')} />

      {/* Desktop: the account on the left, the cosmic profile as the rail.
          Phones: one column, the cosmic profile after the rows. */}
      <PageGrid aside={cosmic} asideLabel={t('profile.cosmic.title', { defaultValue: 'Cosmic profile' })}>
        {main}
      </PageGrid>

      <EditProfileSheet open={showEditProfile} onClose={() => setShowEditProfile(false)} />

      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title={t('profile.saved')}>
        {loadingSaved ? (
          <ListSkeleton count={3} />
        ) : savedHighlights.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={<Bookmark />}
            title={t('profile.noSaved')}
            description={t('profile.noSavedSub')}
          />
        ) : (
          <ListRowGroup>
            {savedHighlights.map(highlight => (
              <ListRow
                key={highlight.id}
                icon={<SavedIcon type={highlight.highlight_type} />}
                tone={savedTone(highlight.highlight_type)}
                label={savedTypeLabel(highlight.highlight_type)}
                meta={<span className="tabular-nums">{shortDateFmt.format(parseLocalDate(highlight.date))}</span>}
              />
            ))}
          </ListRowGroup>
        )}
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
