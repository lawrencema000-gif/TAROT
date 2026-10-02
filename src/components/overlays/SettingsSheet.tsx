import { useState, useEffect } from 'react';
import {
  Bell,
  Moon,
  Globe,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronLeft,
  User,
  CreditCard,
  Download,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  Loader2,
  Crown,
  Mail,
  ExternalLink,
  ImageIcon,
  Bug,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Input, toast, Card, ListRow, ListRowGroup, Switch, EyebrowLabel, SparkleFourPoint } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase'; // still used for storage listings, locale write + delete_user_account RPC
import { PaywallSheet } from '../premium/PaywallSheet';
import { SubscriptionSheet } from '../premium/SubscriptionSheet';
import { DiagnosticsSheet } from '../diagnostics';
import { useDiagnostics } from '../../context/DiagnosticsContext';
import { isDevMode } from '../../utils/telemetry';
import { LanguagePicker } from '../i18n/LanguagePicker';
import { EditProfileForm } from '../profile/EditProfileForm';
import { useT } from '../../i18n/useT';
import { getLocale, type SupportedLocale } from '../../i18n/config';
import { READING_SCALES, getReadingScale, setReadingScale, type ReadingScaleId } from '../../utils/readingScale';

type SubSheet = 'main' | 'editProfile' | 'notifications' | 'appearance' | 'language' | 'help' | 'terms' | 'privacy' | 'deleteConfirm';

/** Reserved URL that tells App.tsx to render the animated Celestial
 *  starfield background instead of loading an image. Must stay in
 *  sync with the identical constant in App.tsx. */
const CELESTIAL_BG_URL = 'celestial://animated';

const SUPPORT_EMAIL = 'support@arcana.app';
const APP_VERSION = '1.0.0';

interface CardBackOption {
  url: string;
  name: string;
}

interface BackgroundOption {
  /** Full-resolution URL — what gets stored in profile.background_url
   *  and rendered as the actual app background (fetched on demand). */
  url: string;
  /** Preview thumbnail — bundled under /backgrounds/thumbs/ when we
   *  have a local match, else falls back to the full-res URL. Lets
   *  the picker feel instant while only paying for the full image
   *  when the user actually picks one. */
  thumbUrl: string;
  name: string;
}

/**
 * Map Supabase background filenames to the bundled thumbnail we ship
 * for the picker preview. Thumbnails live in public/backgrounds/thumbs/
 * at 320×180 webp (~12-17 KB each). The set is fixed — new uploads
 * admin-added to Supabase will fall back to fetching the full-res
 * image until this table is updated + new thumbnails bundled.
 */
const BUNDLED_BG_THUMBS: Record<string, string> = {
  'background_1768048475356.png': '/backgrounds/thumbs/background_1768048475356.webp',
  'background_1768048480582.png': '/backgrounds/thumbs/background_1768048480582.webp',
  'background_1768048488103.png': '/backgrounds/thumbs/background_1768048488103.webp',
  'background_1768048493449.png': '/backgrounds/thumbs/background_1768048493449.webp',
  'background_1768048497998.png': '/backgrounds/thumbs/background_1768048497998.webp',
  'background_1768048502487.png': '/backgrounds/thumbs/background_1768048502487.webp',
  'background_1768048506937.png': '/backgrounds/thumbs/background_1768048506937.webp',
};

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface SettingItem {
  id?: string;
  icon: typeof Bell;
  label: string;
  value?: string;
  action?: () => void;
  danger?: boolean;
}

/** The selected-tile tick, one recipe for every swatch. */
function SelectedTick() {
  return (
    <span className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center" aria-hidden>
      <Check className="w-3 h-3 text-mystic-950" />
    </span>
  );
}

const SWATCH =
  'relative overflow-hidden rounded-control border-2 transition-[border-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-900 disabled:opacity-50';
const SWATCH_ON = 'border-gold';
const SWATCH_OFF = 'border-mystic-700 [@media(hover:hover)]:hover:border-mystic-500';

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { t: tI18n } = useT('common');
  // app namespace lookups — used for the settings menu labels. Passed args
  // (like {{n}} for error counts) are interpolated by i18next.
  const { t: tAppSettings } = useT('app');
  const { profile, user, signOut, updateProfile, refreshProfile } = useAuth();
  const { openDiagnostics, isOpen: isDiagnosticsOpen, closeDiagnostics, errorCount } = useDiagnostics();
  const [activeSheet, setActiveSheet] = useState<SubSheet>('main');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Typed confirmation gate for account deletion — user must type DELETE
  // before the destructive button activates. Added 2026-04-24 after QA
  // flagged that the existing 2-step flow still allowed one-tap delete.
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [cardBacks, setCardBacks] = useState<CardBackOption[]>([]);
  const [loadingCardBacks, setLoadingCardBacks] = useState(false);
  const [savingCardBack, setSavingCardBack] = useState(false);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [readingScale, setReadingScaleState] = useState<ReadingScaleId>(() => getReadingScale());
  const [versionTapCount, setVersionTapCount] = useState(0);

  useEffect(() => {
    if (!open) {
      setActiveSheet('main');
      setAssetsLoaded(false);
    }
  }, [open]);

  // The two picker grids live in Appearance, so their storage listings
  // are fetched when that sheet opens rather than on every Settings open.
  useEffect(() => {
    if (open && activeSheet === 'appearance' && !assetsLoaded) {
      setAssetsLoaded(true);
      fetchCardBacks();
      fetchBackgrounds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSheet, assetsLoaded]);

  const fetchCardBacks = async () => {
    setLoadingCardBacks(true);
    try {
      const { data, error } = await supabase.storage.from('card-backs').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const folders = data?.filter(item => item.id === null) || [];
      const allFiles: CardBackOption[] = [];

      for (const folder of folders) {
        const { data: folderFiles } = await supabase.storage
          .from('card-backs')
          .list(folder.name, { limit: 50 });

        if (folderFiles) {
          for (const file of folderFiles) {
            if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
              const { data: urlData } = supabase.storage
                .from('card-backs')
                .getPublicUrl(`${folder.name}/${file.name}`);
              allFiles.push({
                url: urlData.publicUrl,
                name: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              });
            }
          }
        }
      }

      setCardBacks(allFiles);
    } catch (err) {
      console.error('Failed to fetch card backs:', err);
    } finally {
      setLoadingCardBacks(false);
    }
  };

  const handleSelectCardBack = async (url: string | null) => {
    setSavingCardBack(true);
    try {
      const { error } = await updateProfile({ card_back_url: url || undefined });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save card back:', err);
      toast(tAppSettings('settings.toasts.updateFailed'), 'error');
    } finally {
      setSavingCardBack(false);
    }
  };

  const fetchBackgrounds = async () => {
    setLoadingBackgrounds(true);
    try {
      const { data, error } = await supabase.storage.from('backgrounds').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const folders = data?.filter(item => item.id === null) || [];
      const allFiles: BackgroundOption[] = [];

      for (const folder of folders) {
        const { data: folderFiles } = await supabase.storage
          .from('backgrounds')
          .list(folder.name, { limit: 50 });

        if (folderFiles) {
          for (const file of folderFiles) {
            if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
              const { data: urlData } = supabase.storage
                .from('backgrounds')
                .getPublicUrl(`${folder.name}/${file.name}`);
              // Prefer bundled thumbnail for instant preview; fall
              // back to full-res URL for backgrounds that post-date
              // the bundled thumbnail set.
              const thumb = BUNDLED_BG_THUMBS[file.name] ?? urlData.publicUrl;
              allFiles.push({
                url: urlData.publicUrl,
                thumbUrl: thumb,
                name: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              });
            }
          }
        }
      }

      setBackgrounds(allFiles);
    } catch (err) {
      console.error('Failed to fetch backgrounds:', err);
    } finally {
      setLoadingBackgrounds(false);
    }
  };

  const handleSelectBackground = async (url: string | null) => {
    setSavingBackground(true);
    try {
      const { error } = await updateProfile({ background_url: url || undefined });
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save background:', err);
      toast(tAppSettings('settings.toasts.updateFailed'), 'error');
    } finally {
      setSavingBackground(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('[Settings] Sign out error:', e);
    } finally {
      onClose();
    }
  };

  /**
   * One exporter: the server-side `account-export` function, which covers
   * every table the account owns (community, moonstones, mood entries,
   * advisor interest…). The client-side partial export it used to fall
   * back to produced a second, different file with no way to tell which
   * one you had (R6 A22).
   */
  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('account-export', { body: {} });
      if (error || !data) {
        throw error ?? new Error('empty export');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arcana-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(tAppSettings('settings.toasts.exportReady', { defaultValue: 'Your data is ready' }), 'success');
    } catch (err) {
      console.error('Export failed:', err);
      toast(tAppSettings('settings.toasts.exportFailed', { defaultValue: 'Couldn’t prepare your export — check your connection and try again.' }), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc('delete_user_account', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Delete account RPC failed:', error);
        toast(tAppSettings('settings.toasts.deleteFailed', { defaultValue: 'Couldn’t delete your account — try again, or contact support.' }), 'error');
        return;
      }

      await signOut();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      toast(tAppSettings('settings.toasts.deleteFailed', { defaultValue: 'Couldn’t delete your account — try again, or contact support.' }), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubscriptionClick = () => {
    if (profile?.isPremium) {
      setShowSubscription(true);
    } else {
      setShowPaywall(true);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      const { error } = await updateProfile({
        notificationsEnabled: !profile?.notificationsEnabled,
      });
      if (error) {
        toast(tAppSettings('settings.toasts.updateFailed'), 'error');
      } else {
        await refreshProfile();
        toast(profile?.notificationsEnabled ? tAppSettings('settings.menu.notificationsDisabled') : tAppSettings('settings.menu.notificationsEnabled'), 'success');
      }
    } catch {
      toast(tAppSettings('settings.menu.updateFailed'), 'error');
    }
  };

  const readingSizeLabel = (id: ReadingScaleId) =>
    tAppSettings(`settings.readingSize.${id}`, {
      defaultValue: id === 'smaller' ? 'Smaller' : id === 'larger' ? 'Larger' : 'Default',
    });

  const settingGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: tAppSettings('settings.sections.account'),
      items: [
        // The label wins: a long display name (an email prefix on accounts
        // that never set one) used to push "Edit profile" down to "Edit pro…".
        { icon: User, label: tAppSettings('settings.menu.editProfile'), value: profile?.displayName && profile.displayName.length <= 18 ? profile.displayName : undefined, action: () => setActiveSheet('editProfile') },
        {
          icon: profile?.isPremium ? Crown : CreditCard,
          label: tAppSettings('settings.menu.subscription'),
          value: profile?.isPremium ? tAppSettings('settings.menu.premium') : tAppSettings('settings.menu.free'),
          action: handleSubscriptionClick,
        },
      ],
    },
    {
      title: tAppSettings('settings.sections.preferences'),
      items: [
        { icon: Bell, label: tAppSettings('settings.sections.notifications'), value: profile?.notificationsEnabled ? tAppSettings('settings.menu.toggleOn') : tAppSettings('settings.menu.toggleOff'), action: () => setActiveSheet('notifications') },
        // The row's value is the one appearance choice that is a word: the
        // reading size. The old value was the raw theme id ("dark") (R6 A3).
        { icon: Moon, label: tAppSettings('settings.menu.appearance'), value: readingSizeLabel(readingScale), action: () => setActiveSheet('appearance') },
        { icon: Globe, label: tI18n('labels.language'), value: tI18n(`languages.${getLocale()}`), action: () => setActiveSheet('language') },
      ],
    },
    {
      title: tAppSettings('settings.sections.privacy'),
      items: [
        { id: 'exportData', icon: Download, label: tAppSettings('settings.menu.exportData'), action: handleExportData },
        { id: 'deleteAccount', icon: Trash2, label: tAppSettings('settings.menu.deleteAccount'), action: () => setActiveSheet('deleteConfirm'), danger: true },
      ],
    },
    {
      title: tAppSettings('settings.sections.support'),
      items: [
        { icon: HelpCircle, label: tAppSettings('settings.menu.helpCenter'), action: () => setActiveSheet('help') },
        { icon: FileText, label: tAppSettings('settings.menu.termsOfService'), action: () => setActiveSheet('terms') },
        { icon: Lock, label: tAppSettings('settings.menu.privacyPolicy'), action: () => setActiveSheet('privacy') },
        ...(isDevMode() || versionTapCount >= 5 ? [{
          icon: Bug,
          label: tAppSettings('settings.menu.developerDiagnostics'),
          value: errorCount > 0 ? tAppSettings('settings.menu.errorCount', { n: errorCount }) : undefined,
          action: () => openDiagnostics(),
        }] : []),
      ],
    },
    {
      title: '',
      items: [
        { icon: LogOut, label: tAppSettings('settings.menu.signOut'), action: handleSignOut, danger: true },
      ],
    },
  ];

  const renderBackButton = () => (
    <button
      type="button"
      onClick={() => setActiveSheet('main')}
      className="flex items-center gap-2 min-h-[44px] text-mystic-400 [@media(hover:hover)]:hover:text-mystic-200 transition-colors mb-2"
    >
      <ChevronLeft className="w-4 h-4" aria-hidden />
      <span className="text-meta">{tAppSettings('settings.menu.backToSettings')}</span>
    </button>
  );

  const savingLine = (
    <div className="flex items-center justify-center gap-2 mt-3 text-caption text-gold" role="status">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      {tAppSettings('settings.saving', { defaultValue: 'Saving…' })}
    </div>
  );

  if (activeSheet === 'editProfile') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.editProfile.title')}>
        {renderBackButton()}
        <EditProfileForm onCancel={() => setActiveSheet('main')} onSaved={() => setActiveSheet('main')} />
      </Sheet>
    );
  }

  if (activeSheet === 'notifications') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.sections.notifications')}>
        {renderBackButton()}
        <div className="space-y-4">
          <ListRowGroup>
            <ListRow
              icon={<Bell />}
              label={<span id="settings-daily-reminders">{tAppSettings('settings.dailyReminders')}</span>}
              meta={tAppSettings('settings.getNotified')}
              trailing={
                <Switch
                  checked={!!profile?.notificationsEnabled}
                  onChange={handleToggleNotifications}
                  aria-labelledby="settings-daily-reminders"
                />
              }
            />
          </ListRowGroup>

          <p className="text-caption text-mystic-500">
            {tAppSettings('settings.notificationsNote', {
              defaultValue: 'When this is on, you get one reminder a day to check your horoscope and complete your ritual.',
            })}
          </p>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'appearance') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.menu.appearance')}>
        {renderBackButton()}
        <div className="space-y-8">
          {/* Reading size. `--font-scale` had been plumbed through the CSS since
              the design-system pass and nothing ever set it — in an app whose
              core activity is reading, there was no way to make the text
              bigger. Three steps a thumb can hit; the sample line below the
              control shows the effect live, because a preference you cannot
              see change is a preference nobody trusts. */}
          <section>
            <h3 className="mb-3">
              <EyebrowLabel align="left">
                {tAppSettings('settings.readingSize.label', { defaultValue: 'Reading size' })}
              </EyebrowLabel>
            </h3>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tAppSettings('settings.readingSize.label', { defaultValue: 'Reading size' })}>
              {READING_SCALES.map((scale) => {
                const selected = readingScale === scale.id;
                return (
                  <button
                    key={scale.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setReadingScale(scale.id); setReadingScaleState(scale.id); }}
                    className={`px-3 py-3 rounded-control border-2 text-ui font-medium transition-[border-color,background-color,color] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                      selected
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-mystic-700 text-mystic-300 [@media(hover:hover)]:hover:border-mystic-500'
                    }`}
                  >
                    {readingSizeLabel(scale.id)}
                  </button>
                );
              })}
            </div>
            <p className="reading-copy mt-4">
              {tAppSettings('settings.readingSize.sample', {
                defaultValue: 'The Tower, reversed. Not the collapse itself — the moment after, when the dust settles and you can see what was load-bearing.',
              })}
            </p>
          </section>

          <section>
            <h3 className="mb-3">
              <EyebrowLabel align="left">{tAppSettings('settings.cardBackDesign', { defaultValue: 'Card back' })}</EyebrowLabel>
            </h3>
            <Card variant="elevated" padding="md">
              <p className="text-meta text-mystic-400 mb-4">
                {tAppSettings('settings.cardBackSub', { defaultValue: 'The back of every card you draw.' })}
              </p>

              {loadingCardBacks ? (
                <div className="flex items-center justify-center py-8" role="status" aria-label={tI18n('labels.loading')}>
                  <Loader2 className="w-6 h-6 text-gold animate-spin" aria-hidden />
                </div>
              ) : cardBacks.length === 0 ? (
                <p className="text-meta text-mystic-500 text-center py-4">
                  {tAppSettings('settings.noCardBacks', { defaultValue: 'No card back designs yet.' })}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={tAppSettings('settings.cardBackDesign', { defaultValue: 'Card back' })}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!profile?.card_back_url}
                    onClick={() => handleSelectCardBack(null)}
                    disabled={savingCardBack}
                    className={`${SWATCH} aspect-[2/3] bg-mystic-800 flex items-center justify-center min-h-[120px] ${!profile?.card_back_url ? SWATCH_ON : SWATCH_OFF}`}
                  >
                    <span className="text-caption text-mystic-400 text-center px-1">{tAppSettings('settings.defaultLabel')}</span>
                    {!profile?.card_back_url && <SelectedTick />}
                  </button>

                  {cardBacks.map((cardBack) => {
                    const on = profile?.card_back_url === cardBack.url;
                    return (
                      <button
                        key={cardBack.url}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={cardBack.name}
                        onClick={() => handleSelectCardBack(cardBack.url)}
                        disabled={savingCardBack}
                        className={`${SWATCH} aspect-[2/3] bg-mystic-800 min-h-[120px] ${on ? SWATCH_ON : SWATCH_OFF}`}
                      >
                        <img
                          src={cardBack.url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        {on && <SelectedTick />}
                      </button>
                    );
                  })}
                </div>
              )}

              {savingCardBack && savingLine}
            </Card>
          </section>

          <section>
            <h3 className="mb-3">
              <EyebrowLabel align="left">{tAppSettings('settings.appBackground', { defaultValue: 'Background' })}</EyebrowLabel>
            </h3>
            <Card variant="elevated" padding="md">
              <p className="text-meta text-mystic-400 mb-4">
                {tAppSettings('settings.backgroundSub', { defaultValue: 'What sits behind every screen.' })}
              </p>

              {loadingBackgrounds ? (
                <div className="flex items-center justify-center py-8" role="status" aria-label={tI18n('labels.loading')}>
                  <Loader2 className="w-6 h-6 text-gold animate-spin" aria-hidden />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tAppSettings('settings.appBackground', { defaultValue: 'Background' })}>
                  {/* Default — the token canvas, no image */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!profile?.background_url}
                    onClick={() => handleSelectBackground(null)}
                    disabled={savingBackground}
                    className={`${SWATCH} aspect-video bg-mystic-950 flex items-center justify-center min-h-[88px] ${!profile?.background_url ? SWATCH_ON : SWATCH_OFF}`}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-5 h-5 text-mystic-400" aria-hidden />
                      <span className="text-caption text-mystic-400">{tAppSettings('settings.defaultLabel')}</span>
                    </span>
                    {!profile?.background_url && <SelectedTick />}
                  </button>

                  {/* Celestial — animated starfield + rising particles (same
                      visual as the pre-login landing page). The preview is a
                      still of that sky: a few dots on the night so the option
                      reads at a glance; the real animation runs once chosen. */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={profile?.background_url === CELESTIAL_BG_URL}
                    onClick={() => handleSelectBackground(CELESTIAL_BG_URL)}
                    disabled={savingBackground}
                    className={`${SWATCH} aspect-video bg-mystic-950 min-h-[88px] ${profile?.background_url === CELESTIAL_BG_URL ? SWATCH_ON : SWATCH_OFF}`}
                    aria-label={tAppSettings('settings.celestialAria', { defaultValue: 'Celestial animated background' })}
                  >
                    {[
                      { l: 18, t: 22, s: 2 },
                      { l: 74, t: 18, s: 1.5 },
                      { l: 42, t: 56, s: 1.2 },
                      { l: 62, t: 72, s: 2 },
                      { l: 88, t: 48, s: 1.5 },
                      { l: 28, t: 82, s: 1.2 },
                      { l: 12, t: 62, s: 1 },
                      { l: 82, t: 80, s: 1 },
                    ].map((s, i) => (
                      <span
                        key={i}
                        className="absolute rounded-full bg-gold/70"
                        style={{ left: `${s.l}%`, top: `${s.t}%`, width: s.s, height: s.s }}
                        aria-hidden
                      />
                    ))}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5 bg-mystic-950/80">
                      <SparkleFourPoint size={12} className="text-gold" />
                      <span className="text-caption font-medium text-mystic-100">
                        {tAppSettings('settings.celestialLabel', { defaultValue: 'Celestial' })}
                      </span>
                    </span>
                    {profile?.background_url === CELESTIAL_BG_URL && <SelectedTick />}
                  </button>

                  {backgrounds.map((bg) => {
                    const on = profile?.background_url === bg.url;
                    return (
                      <button
                        key={bg.url}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={bg.name}
                        onClick={() => handleSelectBackground(bg.url)}
                        disabled={savingBackground}
                        className={`${SWATCH} aspect-video bg-mystic-800 min-h-[88px] ${on ? SWATCH_ON : SWATCH_OFF}`}
                      >
                        <img
                          src={bg.thumbUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        {on && <SelectedTick />}
                      </button>
                    );
                  })}
                </div>
              )}

              {savingBackground && savingLine}
            </Card>
          </section>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'language') {
    const handleLanguageChange = async (locale: SupportedLocale) => {
      // Persist to profile if signed in — server is source of truth for locale
      if (user?.id) {
        try {
          await supabase.from('profiles').update({ locale }).eq('id', user.id);
        } catch (e) {
          console.warn('[Settings] Failed to persist locale:', e);
        }
      }
      toast(tI18n('toast.languageChanged'), 'success');
    };

    return (
      <Sheet open={open} onClose={onClose} title={tI18n('labels.language')}>
        {renderBackButton()}
        <div className="space-y-3">
          <LanguagePicker onSelect={handleLanguageChange} variant="full" />
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'help') {
    const faqs = [
      {
        q: tAppSettings('settings.faq.accuracyQ'),
        a: tAppSettings('settings.faq.accuracyA', {
          defaultValue: 'Readings are for reflection and guidance, not prediction. They help you explore your own thoughts and feelings.',
        }),
      },
      {
        q: tAppSettings('settings.faq.cancelQ'),
        a: tAppSettings('settings.faq.cancelA', {
          defaultValue: 'Yes — cancel any time from your device’s app store subscription settings.',
        }),
      },
      {
        q: tAppSettings('settings.faq.secureQ'),
        a: tAppSettings('settings.faq.secureA', {
          defaultValue: 'Your data is encrypted in transit and at rest, and we never sell or share it.',
        }),
      },
    ];
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.helpCenter.title')}>
        {renderBackButton()}
        <div className="space-y-4">
          <ListRowGroup>
            <ListRow
              href={`mailto:${SUPPORT_EMAIL}`}
              icon={<Mail />}
              tone="blue"
              label={tAppSettings('settings.contactSupport')}
              meta={SUPPORT_EMAIL}
              trailing={<ExternalLink className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />}
            />
          </ListRowGroup>

          <section className="space-y-3">
            <h3>
              <EyebrowLabel align="left">{tAppSettings('settings.frequentlyAskedQuestions')}</EyebrowLabel>
            </h3>
            {faqs.map((faq) => (
              <Card key={faq.q} padding="md">
                <p className="text-ui font-medium text-mystic-100">{faq.q}</p>
                <p className="text-meta text-mystic-400 mt-2 leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </section>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'terms') {
    const notAdvice = [
      tAppSettings('settings.terms.notAdvice.medical', { defaultValue: 'Medical or mental-health diagnosis' }),
      tAppSettings('settings.terms.notAdvice.financial', { defaultValue: 'Financial or investment advice' }),
      tAppSettings('settings.terms.notAdvice.legal', { defaultValue: 'Legal counsel or guidance' }),
      tAppSettings('settings.terms.notAdvice.coaching', { defaultValue: 'Relationship or life coaching' }),
    ];
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.menu.termsOfService')}>
        {renderBackButton()}
        <div className="space-y-4">
          <Card padding="md">
            <h4 className="text-ui font-medium text-gold mb-2">{tAppSettings('settings.legal.entertainmentDisclaimer', { defaultValue: 'Entertainment disclaimer' })}</h4>
            <p className="text-meta text-mystic-300 leading-relaxed">
              {tAppSettings('settings.terms.entertainmentBody', {
                defaultValue: 'Arcana is designed for entertainment and self-reflection. Readings, horoscopes and personality assessments are not professional advice.',
              })}
            </p>
          </Card>

          <Card padding="md">
            <h4 className="text-ui font-medium text-mystic-100 mb-2">{tAppSettings('settings.legal.acceptanceOfTerms', { defaultValue: 'Acceptance of terms' })}</h4>
            <p className="text-meta text-mystic-300 leading-relaxed">
              {tAppSettings('settings.terms.acceptanceBody', {
                defaultValue: 'By using this app you agree to use it responsibly and acknowledge that all content is for entertainment.',
              })}
            </p>
          </Card>

          <Card padding="md">
            <h4 className="text-ui font-medium text-mystic-100 mb-2">{tAppSettings('settings.legal.notProfessionalAdvice', { defaultValue: 'Not professional advice' })}</h4>
            <ul className="space-y-2 text-meta text-mystic-400 list-disc pl-5">
              {notAdvice.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </Card>

          <Button variant="outline" fullWidth onClick={() => setActiveSheet('main')}>
            {tAppSettings('settings.terms.acknowledge', { defaultValue: 'I understand' })}
          </Button>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'privacy') {
    const P = 'settings.privacy';
    const section = (key: string, titleDefault: string, body: { key: string; lead?: string; text: string }[]) => (
      <Card padding="md" key={key}>
        <h4 className="text-ui font-medium text-gold mb-3">{tAppSettings(`${P}.${key}.title`, { defaultValue: titleDefault })}</h4>
        <ul className="space-y-2 text-meta text-mystic-400 leading-relaxed list-disc pl-5">
          {body.map((item) => (
            <li key={item.key}>
              {item.lead && (
                <strong className="text-mystic-300 font-medium">
                  {tAppSettings(`${P}.${key}.${item.key}Lead`, { defaultValue: item.lead })}{' '}
                </strong>
              )}
              {tAppSettings(`${P}.${key}.${item.key}`, { defaultValue: item.text })}
            </li>
          ))}
        </ul>
      </Card>
    );

    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.menu.privacyPolicy')}>
        {renderBackButton()}
        <div className="space-y-4">
          <p className="text-meta text-mystic-300 leading-relaxed">
            {tAppSettings(`${P}.intro`, {
              defaultValue: 'This policy explains how Arcana (“we”, “us”, “our”) collects, uses and shares information when you use the app.',
            })}
          </p>

          {section('collect', 'Information we collect', [
            { key: 'account', lead: 'Account information:', text: 'your email address and the profile details you choose to provide.' },
            { key: 'content', lead: 'Content you create:', text: 'journal entries, mood logs, notes, preferences and anything else you enter into the app.' },
            { key: 'purchases', lead: 'Purchases and subscriptions:', text: 'RevenueCat and the app store process purchase data such as subscription status, receipts and transaction identifiers.' },
            { key: 'ads', lead: 'Advertising data:', text: 'advertising partners may collect device identifiers (such as the Advertising ID), IP address, approximate location and ad interaction events to provide and measure ads.' },
            { key: 'device', lead: 'Device and usage information:', text: 'device model, OS version, language and app events, for performance and troubleshooting.' },
          ])}

          {section('use', 'How we use information', [
            { key: 'operate', text: 'To provide and operate the app and its features.' },
            { key: 'sync', text: 'To sync and store your data across your devices.' },
            { key: 'purchases', text: 'To process purchases and manage subscriptions.' },
            { key: 'ads', text: 'To show ads and measure their performance.' },
            { key: 'improve', text: 'To improve performance, fix bugs and provide support.' },
            { key: 'legal', text: 'To comply with legal obligations.' },
          ])}

          {section('third', 'Third-party services', [
            { key: 'revenuecat', lead: 'RevenueCat:', text: 'subscriptions and purchase management.' },
            { key: 'ads', lead: 'Advertising partners:', text: 'to display ads and measure performance.' },
            { key: 'backend', lead: 'Backend and database provider:', text: 'to store and sync your app data.' },
            { key: 'policies', text: 'These providers process information under their own privacy policies.' },
          ])}

          {section('sharing', 'Sharing of information', [
            { key: 'nosale', text: 'We do not sell your personal information.' },
            { key: 'providers', text: 'We may share information with service providers (for example, ads and subscriptions) to operate the app.' },
            { key: 'law', text: 'We may share information if required by law, legal process, or to protect rights and safety.' },
            { key: 'transfer', text: 'We may share information in connection with a business transfer (merger, acquisition or sale of assets).' },
          ])}

          {section('retention', 'Data retention', [
            { key: 'body', text: 'We keep information for as long as needed to provide the app and for legitimate business purposes such as compliance and dispute resolution. You can delete your account, and everything in it, from Settings.' },
          ])}

          {section('security', 'Security', [
            { key: 'body', text: 'We use reasonable administrative, technical and organisational safeguards to protect information. No method of transmission or storage is completely secure.' },
          ])}

          {section('children', 'Children’s privacy', [
            { key: 'body', text: 'The app is not intended for children under 13 (or the age required by local law). We do not knowingly collect personal information from children.' },
          ])}

          {section('choices', 'Your choices', [
            { key: 'ads', lead: 'Advertising:', text: 'you can limit ad tracking from your device settings (availability varies by device and OS).' },
            { key: 'deletion', lead: 'Account and data deletion:', text: 'delete your account from Settings, or contact us to request deletion.' },
          ])}

          <Card padding="md">
            <h4 className="text-ui font-medium text-gold mb-2">{tAppSettings(`${P}.contact.title`, { defaultValue: 'Contact' })}</h4>
            <p className="text-meta text-mystic-400 mb-2">
              {tAppSettings(`${P}.contact.body`, { defaultValue: 'If you have questions or requests, contact:' })}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-ui text-cosmic-blue-ink underline underline-offset-2 [@media(hover:hover)]:hover:text-mystic-100 transition-colors inline-flex min-h-[44px] items-center"
            >
              {SUPPORT_EMAIL}
            </a>
          </Card>

          <Button variant="outline" fullWidth onClick={() => setActiveSheet('main')}>
            {tAppSettings('settings.menu.backToSettings')}
          </Button>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'deleteConfirm') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.deleteAccount.title')}>
        {renderBackButton()}
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-coral/10 border border-coral/25 rounded-card">
            <AlertTriangle className="w-6 h-6 text-coral flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="text-ui font-medium text-coral mb-1">{tAppSettings('settings.actionCannotBeUndone')}</h3>
              <p className="text-meta text-mystic-300 leading-relaxed">
                {tAppSettings('settings.deleteAccount.dataWarning')}
              </p>
            </div>
          </div>

          <p className="text-meta text-mystic-400">
            {tAppSettings('settings.deleteAccount.exportRecommendation')}
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              fullWidth
              onClick={handleExportData}
              disabled={isExporting}
              loading={isExporting}
            >
              <Download className="w-4 h-4" aria-hidden />
              {isExporting ? tAppSettings('settings.deleteAccount.exporting') : tAppSettings('settings.deleteAccount.exportFirst')}
            </Button>

            <div className="space-y-2">
              <label htmlFor="settings-delete-confirm" className="block">
                <EyebrowLabel align="left">
                  {tAppSettings('settings.deleteAccount.typeToConfirm', { defaultValue: 'Type DELETE to confirm' })}
                </EyebrowLabel>
              </label>
              <Input
                id="settings-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            <Button
              variant="destructive"
              fullWidth
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText.trim() !== 'DELETE'}
              loading={isDeleting}
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              {isDeleting ? tAppSettings('settings.deleteAccount.deleting') : tAppSettings('settings.deleteAccount.deleteMyAccount')}
            </Button>

            <Button
              variant="ghost"
              fullWidth
              onClick={() => { setDeleteConfirmText(''); setActiveSheet('main'); }}
            >
              {tI18n('actions.cancel')}
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={tAppSettings('settings.title')}>
      <div className="space-y-6">
        {settingGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.title && (
              <h3 className="mb-3">
                <EyebrowLabel align="left">{group.title}</EyebrowLabel>
              </h3>
            )}
            <ListRowGroup>
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <ListRow
                    key={itemIndex}
                    icon={<Icon />}
                    label={item.id === 'exportData' && isExporting ? tAppSettings('settings.deleteAccount.exporting') : item.label}
                    value={item.value}
                    danger={item.danger}
                    onClick={item.action}
                    disabled={item.id === 'exportData' && isExporting}
                  />
                );
              })}
            </ListRowGroup>
          </div>
        ))}

        <Card variant="elevated" padding="md">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <h4 className="text-ui font-medium text-mystic-300 mb-1">{tAppSettings('settings.disclaimerHeader')}</h4>
              <p className="text-caption text-mystic-500 leading-relaxed">
                {tAppSettings('settings.disclaimerText', {
                  defaultValue: 'Arcana is for reflection and entertainment. It does not give medical, legal or financial advice.',
                })}
              </p>
              <p className="text-caption text-mystic-500 mt-1">{tAppSettings('settings.disclaimerBody')}</p>
            </div>
          </div>
        </Card>

        <div className="pt-4 border-t border-mystic-800">
          <button
            type="button"
            onClick={() => {
              setVersionTapCount(prev => {
                const next = prev + 1;
                if (next === 5) {
                  toast(tAppSettings('settings.toasts.devModeEnabled'), 'info');
                }
                return next;
              });
            }}
            className="w-full min-h-[44px] text-center text-caption text-mystic-500 [@media(hover:hover)]:hover:text-mystic-400 transition-colors tabular-nums"
          >
            {tAppSettings('settings.version', { v: APP_VERSION })}
            {versionTapCount >= 5 && !isDevMode() && (
              <span className="ml-1 text-gold">{tAppSettings('settings.devTag', { defaultValue: '(Dev)' })}</span>
            )}
          </button>
        </div>
      </div>

      <PaywallSheet open={showPaywall} onClose={() => setShowPaywall(false)} />
      <SubscriptionSheet open={showSubscription} onClose={() => setShowSubscription(false)} />
      <DiagnosticsSheet open={isDiagnosticsOpen} onClose={closeDiagnostics} />
    </Sheet>
  );
}
