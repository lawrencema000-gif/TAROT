import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Moon,
  Globe,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
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
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ImageIcon,
  Bug,
  ArrowLeftRight,
  Search,
  Sparkles,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Input, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase'; // still used for profile read/write + delete_user_account RPC
import { journalEntries, tarotReadings, quizResults } from '../../dal';
import { PaywallSheet } from '../premium/PaywallSheet';
import { SubscriptionSheet } from '../premium/SubscriptionSheet';
import { DiagnosticsSheet } from '../diagnostics';
import { useDiagnostics } from '../../context/DiagnosticsContext';
import { isDevMode } from '../../utils/telemetry';
import { useGeocode } from '../../hooks/useAstrology';
import { LanguagePicker } from '../i18n/LanguagePicker';
import { useT } from '../../i18n/useT';
import { getLocale, type SupportedLocale } from '../../i18n/config';

type SubSheet = 'main' | 'editProfile' | 'notifications' | 'appearance' | 'language' | 'help' | 'terms' | 'privacy' | 'deleteConfirm';

/** Reserved URL that tells App.tsx to render the animated Celestial
 *  starfield background instead of loading an image. Must stay in
 *  sync with the identical constant in App.tsx. */
const CELESTIAL_BG_URL = 'celestial://animated';

interface CardBackOption {
  url: string;
  name: string;
}

interface BackgroundOption {
  url: string;
  name: string;
}

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);

  const [editForm, setEditForm] = useState({
    displayName: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    birthLat: undefined as number | undefined,
    birthLon: undefined as number | undefined,
  });
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [showGeoResults, setShowGeoResults] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || '',
        birthDate: profile.birthDate || '',
        birthTime: profile.birthTime || '',
        birthPlace: profile.birthPlace || '',
        birthLat: profile.birthLat,
        birthLon: profile.birthLon,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!open) {
      setActiveSheet('main');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchCardBacks();
      fetchBackgrounds();
    }
  }, [open]);

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
              allFiles.push({
                url: urlData.publicUrl,
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

  const handleSwitchAccount = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('[Settings] Switch account error:', e);
    } finally {
      onClose();
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);

    try {
      // Prefer the server-side export edge function — covers all tables
      // (community, moonstones, advisor_interest, etc.). Falls back to
      // a client-side partial export if the edge function is unavailable.
      const { data: serverExport, error: fnErr } = await supabase.functions.invoke('account-export', {
        body: {},
      });

      let exportData: unknown;
      if (!fnErr && serverExport) {
        exportData = serverExport;
      } else {
        // Fallback: legacy client-side partial export
        const [profileRes, journalRes, readingsRes, quizRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          journalEntries.listAllForUser(user.id),
          tarotReadings.listAllForUser(user.id),
          quizResults.listAllForUser(user.id),
        ]);

        const hadError = !!profileRes.error || !journalRes.ok || !readingsRes.ok || !quizRes.ok;
        if (hadError) {
          toast(tAppSettings('settings.toasts.exportPartial'), 'error');
        }

        exportData = {
          exportedAt: new Date().toISOString(),
          profile: profileRes.data || null,
          journalEntries: journalRes.ok ? journalRes.data : [],
          tarotReadings: readingsRes.ok ? readingsRes.data : [],
          quizResults: quizRes.ok ? quizRes.data : [],
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arcana-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
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
        return;
      }

      await signOut();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
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

  const [cityQuery, setCityQuery] = useState('');

  useEffect(() => {
    if (activeSheet === 'editProfile' && profile) {
      setCityQuery(profile.birthPlace || '');
    }
  }, [activeSheet, profile]);

  const handleCityInput = (value: string) => {
    setCityQuery(value);
    setEditForm(f => ({ ...f, birthPlace: value, birthLat: undefined, birthLon: undefined }));
    setShowGeoResults(true);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    if (value.trim().length >= 2) {
      geoDebounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
    }
  };

  const handleSelectGeoResult = (result: { lat: number; lon: number; displayName: string }) => {
    setCityQuery(result.displayName);
    setEditForm(f => ({ ...f, birthPlace: result.displayName, birthLat: result.lat, birthLon: result.lon }));
    setShowGeoResults(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        displayName: editForm.displayName || undefined,
        birthDate: editForm.birthDate || undefined,
        birthTime: editForm.birthTime || undefined,
        birthPlace: editForm.birthPlace || undefined,
      };
      if (editForm.birthLat !== undefined) updates.birthLat = editForm.birthLat;
      if (editForm.birthLon !== undefined) updates.birthLon = editForm.birthLon;

      const { error } = await updateProfile(updates);

      if (error) {
        toast(error.message, 'error');
      } else {
        toast(tAppSettings('settings.toasts.profileUpdated'), 'success');
        await refreshProfile();
        setActiveSheet('main');
      }
    } catch {
      toast(tAppSettings('settings.toasts.profileUpdateFailed'), 'error');
    } finally {
      setIsSaving(false);
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

  const settingGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: tAppSettings('settings.sections.account'),
      items: [
        { icon: User, label: tAppSettings('settings.menu.editProfile'), value: profile?.displayName || user?.email?.split('@')[0], action: () => setActiveSheet('editProfile') },
        {
          icon: profile?.isPremium ? Crown : CreditCard,
          label: tAppSettings('settings.menu.subscription'),
          value: profile?.isPremium ? tAppSettings('settings.menu.premium') : tAppSettings('settings.menu.free'),
          action: handleSubscriptionClick,
        },
        { icon: ArrowLeftRight, label: tAppSettings('settings.menu.switchAccount'), action: handleSwitchAccount },
      ],
    },
    {
      title: tAppSettings('settings.sections.preferences'),
      items: [
        { icon: Bell, label: tAppSettings('settings.sections.notifications'), value: profile?.notificationsEnabled ? tAppSettings('settings.menu.toggleOn') : tAppSettings('settings.menu.toggleOff'), action: () => setActiveSheet('notifications') },
        { icon: Moon, label: tAppSettings('settings.menu.appearance'), value: profile?.theme || 'Dark', action: () => setActiveSheet('appearance') },
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
      onClick={() => setActiveSheet('main')}
      className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="text-sm">{tAppSettings('settings.menu.backToSettings')}</span>
    </button>
  );

  if (activeSheet === 'editProfile') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.editProfile.title')}>
        {renderBackButton()}
        <div className="space-y-5">
          <Input
            label={tAppSettings('settings.editProfile.displayName')}
            value={editForm.displayName}
            onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder={tAppSettings('settings.editProfile.displayNamePlaceholder')}
            icon={<User className="w-4 h-4" />}
          />

          <Input
            label={tAppSettings('settings.editProfile.birthDate')}
            type="date"
            value={editForm.birthDate}
            onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))}
            icon={<Calendar className="w-4 h-4" />}
          />

          <Input
            label={tAppSettings('settings.editProfile.birthTime')}
            type="time"
            value={editForm.birthTime}
            onChange={e => setEditForm(f => ({ ...f, birthTime: e.target.value }))}
            icon={<Clock className="w-4 h-4" />}
          />

          <div className="p-4 bg-mystic-800/40 rounded-xl border border-mystic-700/50 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-mystic-200">{tAppSettings('settings.birthCity')}</span>
              <span className="text-xs text-mystic-500">(optional)</span>
            </div>

            <div className="relative">
              <Input
                value={cityQuery}
                onChange={e => handleCityInput(e.target.value)}
                placeholder="Search city or town..."
                icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              />
            </div>

            {editForm.birthLat !== undefined && editForm.birthLon !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gold/10 border border-gold/20 rounded-lg">
                <Check className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-sm text-mystic-200 truncate">{editForm.birthPlace}</span>
              </div>
            )}

            {showGeoResults && editForm.birthLat === undefined && geoResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-mystic-700/60 bg-mystic-900 divide-y divide-mystic-800/60">
                {geoResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectGeoResult(r)}
                    className="w-full text-left px-3 py-3 hover:bg-mystic-800/60 transition-colors text-sm text-mystic-300 cursor-pointer flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-mystic-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{r.displayName}</span>
                  </button>
                ))}
              </div>
            )}

            {cityQuery.length > 0 && cityQuery.length < 2 && (
              <p className="text-xs text-mystic-500">{tAppSettings('settings.typeMinChars')}</p>
            )}

            {!geoLoading && geoError && editForm.birthLat === undefined && (
              <p className="text-xs text-amber-400/80">{geoError}</p>
            )}
          </div>

          <div className="p-3 bg-mystic-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-mystic-400">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <p className="text-xs text-mystic-500 mt-1">{tAppSettings('settings.emailNotChangeable')}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setActiveSheet('main')}>
              {tI18n('actions.cancel')}
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveProfile} loading={isSaving}>
              {tAppSettings('settings.saveChanges')}
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'notifications') {
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.sections.notifications')}>
        {renderBackButton()}
        <div className="space-y-4">
          <div className="p-4 bg-mystic-800/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-mystic-400" />
                <div>
                  <p className="font-medium text-mystic-200">{tAppSettings('settings.dailyReminders')}</p>
                  <p className="text-sm text-mystic-500">{tAppSettings('settings.getNotified')}</p>
                </div>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  profile?.notificationsEnabled ? 'bg-gold' : 'bg-mystic-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                    profile?.notificationsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="text-xs text-mystic-500">
            When enabled, you'll receive daily reminders to check your horoscope and complete your ritual.
          </p>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'appearance') {
    const themes: { id: 'dark' | 'midnight' | 'celestial'; name: string; desc: string }[] = [
      { id: 'dark',       name: tAppSettings('settings.themes.dark.name'),       desc: tAppSettings('settings.themes.dark.desc') },
      { id: 'midnight',   name: tAppSettings('settings.themes.midnight.name'),   desc: tAppSettings('settings.themes.midnight.desc') },
      { id: 'celestial',  name: tAppSettings('settings.themes.celestial.name'),  desc: tAppSettings('settings.themes.celestial.desc') },
    ];

    return (
      <Sheet open={open} onClose={onClose} title="Appearance">
        {renderBackButton()}
        <div className="space-y-3">
          {themes.map(theme => (
            <button
              key={theme.id}
              onClick={async () => {
                await updateProfile({ theme: theme.id });
                await refreshProfile();
                toast(tAppSettings('settings.menu.themeChanged', { name: theme.name }), 'success');
              }}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                (profile?.theme || 'dark') === theme.id
                  ? 'border-gold bg-gold/10'
                  : 'border-mystic-700 hover:border-mystic-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-mystic-200">{theme.name}</p>
                  <p className="text-sm text-mystic-500">{theme.desc}</p>
                </div>
                {(profile?.theme || 'dark') === theme.id && (
                  <Check className="w-5 h-5 text-gold" />
                )}
              </div>
            </button>
          ))}
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
    return (
      <Sheet open={open} onClose={onClose} title={tAppSettings('settings.helpCenter.title')}>
        {renderBackButton()}
        <div className="space-y-4">
          <a
            href="mailto:support@arcana.app"
            className="block p-4 bg-mystic-800/50 rounded-xl hover:bg-mystic-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cosmic-blue/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-cosmic-blue" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-mystic-200">{tAppSettings('settings.contactSupport')}</p>
                <p className="text-sm text-mystic-500">support@arcana.app</p>
              </div>
              <ExternalLink className="w-4 h-4 text-mystic-500" />
            </div>
          </a>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-mystic-300">{tAppSettings('settings.frequentlyAskedQuestions')}</h3>

            <div className="p-4 bg-mystic-800/30 rounded-xl">
              <p className="text-sm font-medium text-mystic-200">{tAppSettings('settings.faq.accuracyQ')}</p>
              <p className="text-sm text-mystic-500 mt-2">
                Tarot readings are meant for reflection and guidance, not prediction. They help you explore your thoughts and feelings.
              </p>
            </div>

            <div className="p-4 bg-mystic-800/30 rounded-xl">
              <p className="text-sm font-medium text-mystic-200">{tAppSettings('settings.faq.cancelQ')}</p>
              <p className="text-sm text-mystic-500 mt-2">
                Yes, you can cancel anytime from your device's app store subscription settings.
              </p>
            </div>

            <div className="p-4 bg-mystic-800/30 rounded-xl">
              <p className="text-sm font-medium text-mystic-200">{tAppSettings('settings.faq.secureQ')}</p>
              <p className="text-sm text-mystic-500 mt-2">
                Yes, all your data is encrypted and stored securely. We never share or sell your information.
              </p>
            </div>
          </div>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'terms') {
    return (
      <Sheet open={open} onClose={onClose} title="Terms of Service">
        {renderBackButton()}
        <div className="space-y-4 text-sm text-mystic-300">
          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-2">Entertainment Disclaimer</h4>
            <p>
              Arcana is designed for entertainment and self-reflection purposes only. All readings, horoscopes, and personality assessments should not be considered professional advice.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-mystic-100 mb-2">Acceptance of Terms</h4>
            <p>
              By using this app, you agree to use it responsibly and acknowledge that all content is for entertainment purposes only.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-mystic-100 mb-2">Not Professional Advice</h4>
            <ul className="space-y-2 text-mystic-400">
              <li>- Medical or mental health diagnosis</li>
              <li>- Financial or investment advice</li>
              <li>- Legal counsel or guidance</li>
              <li>- Relationship or life coaching</li>
            </ul>
          </div>

          <Button variant="outline" fullWidth onClick={() => setActiveSheet('main')}>
            I Understand
          </Button>
        </div>
      </Sheet>
    );
  }

  if (activeSheet === 'privacy') {
    return (
      <Sheet open={open} onClose={onClose} title="Privacy Policy">
        {renderBackButton()}
        <div className="space-y-4 text-sm text-mystic-300">
          <p>
            This Privacy Policy explains how Arcana ("we", "us", "our") collects, uses, and shares information when you use our mobile application ("App").
          </p>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Information we collect</h4>
            <ul className="space-y-2 text-mystic-400">
              <li>
                <strong className="text-mystic-300">Account information (if you create an account):</strong> email address and basic profile details you provide.
              </li>
              <li>
                <strong className="text-mystic-300">App content you provide:</strong> journals, notes, preferences, and other content you enter into the App.
              </li>
              <li>
                <strong className="text-mystic-300">Purchase and subscription information:</strong> we use RevenueCat to manage in-app purchases and subscriptions. RevenueCat and the relevant app store may process purchase-related data (for example, subscription status, receipts, and transaction identifiers).
              </li>
              <li>
                <strong className="text-mystic-300">Advertising data:</strong> the App displays ads. Advertising partners may collect device identifiers (such as the Advertising ID), IP address, coarse location (approximate), and ad interaction events to provide and measure ads.
              </li>
              <li>
                <strong className="text-mystic-300">Device and usage information:</strong> basic technical information such as device model, OS version, language, and app events (for performance and troubleshooting).
              </li>
            </ul>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">How we use information</h4>
            <ul className="space-y-2 text-mystic-400">
              <li>• Provide and operate the App and its features</li>
              <li>• Sync or store your data (when enabled)</li>
              <li>• Process purchases and manage subscriptions</li>
              <li>• Show ads and measure ad performance</li>
              <li>• Improve performance, fix bugs, and provide support</li>
              <li>• Comply with legal obligations</li>
            </ul>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Third-party services</h4>
            <p className="text-mystic-400 mb-2">
              The App may use third-party services to operate core functionality, including:
            </p>
            <ul className="space-y-2 text-mystic-400">
              <li>• <strong className="text-mystic-300">RevenueCat</strong> (subscriptions and purchase management)</li>
              <li>• <strong className="text-mystic-300">Advertising partners</strong> (to display ads and measure performance)</li>
              <li>• <strong className="text-mystic-300">Backend/database provider</strong> (to store or sync your app data when enabled)</li>
            </ul>
            <p className="text-mystic-400 mt-2">
              These third parties may process information as described above and under their own privacy policies.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Sharing of information</h4>
            <p className="text-mystic-400 mb-2">
              We do not sell your personal information. We may share information:
            </p>
            <ul className="space-y-2 text-mystic-400">
              <li>• With service providers (for example, ads and subscriptions) to operate the App</li>
              <li>• If required by law, legal process, or to protect rights and safety</li>
              <li>• In connection with a business transfer (merger, acquisition, or sale of assets)</li>
            </ul>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Data retention</h4>
            <p className="text-mystic-400">
              We retain information for as long as needed to provide the App and for legitimate business purposes (such as compliance and dispute resolution). You may request deletion where applicable.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Security</h4>
            <p className="text-mystic-400">
              We use reasonable administrative, technical, and organizational safeguards to protect information. No method of transmission or storage is 100% secure.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Children's privacy</h4>
            <p className="text-mystic-400">
              The App is not intended for children under 13 (or the age required by local law). We do not knowingly collect personal information from children.
            </p>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Your choices</h4>
            <ul className="space-y-2 text-mystic-400">
              <li>
                <strong className="text-mystic-300">Advertising:</strong> you can limit ad tracking from your device settings (availability varies by device/OS).
              </li>
              <li>
                <strong className="text-mystic-300">Account/data deletion:</strong> contact us to request deletion (where applicable).
              </li>
            </ul>
          </div>

          <div className="p-4 bg-mystic-800/30 rounded-xl">
            <h4 className="font-medium text-gold mb-3">Contact</h4>
            <p className="text-mystic-400 mb-2">
              If you have questions or requests, contact:
            </p>
            <a
              href="mailto:lawrence.ma000@gmail.com"
              className="text-cosmic-blue hover:text-cosmic-blue/80 transition-colors"
            >
              lawrence.ma000@gmail.com
            </a>
          </div>

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
          <div className="flex items-start gap-4 p-4 bg-coral/10 border border-coral/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-coral flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-coral mb-1">{tAppSettings('settings.actionCannotBeUndone')}</h3>
              <p className="text-sm text-mystic-300">
                {tAppSettings('settings.deleteAccount.dataWarning')}
              </p>
            </div>
          </div>

          <p className="text-sm text-mystic-400">
            {tAppSettings('settings.deleteAccount.exportRecommendation')}
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              fullWidth
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? tAppSettings('settings.deleteAccount.exporting') : tAppSettings('settings.deleteAccount.exportFirst')}
            </Button>

            <div className="space-y-2">
              <label className="text-xs text-mystic-400 uppercase tracking-wider">
                {tAppSettings('settings.deleteAccount.typeToConfirm', { defaultValue: 'Type DELETE to confirm' })}
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            <Button
              fullWidth
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText.trim() !== 'DELETE'}
              className="bg-coral hover:bg-coral/90 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
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
              <h3 className="text-xs font-medium text-mystic-500 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIndex}
                    onClick={item.action}
                    disabled={item.id === 'exportData' && isExporting}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${item.danger
                        ? 'text-coral hover:bg-coral/10'
                        : 'text-mystic-200 hover:bg-mystic-800/50'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Icon className={`w-5 h-5 ${item.danger ? 'text-coral' : 'text-mystic-400'}`} />
                    <span className="flex-1 text-left">
                      {item.id === 'exportData' && isExporting ? tAppSettings('settings.deleteAccount.exporting') : item.label}
                    </span>
                    {item.value && (
                      <span className="text-sm text-mystic-500">{item.value}</span>
                    )}
                    {!item.danger && (
                      <ChevronRight className="w-4 h-4 text-mystic-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-xs font-medium text-mystic-500 uppercase tracking-wider mb-3">
            Card Back Design
          </h3>
          <div className="p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl">
            <p className="text-xs text-mystic-400 mb-4">
              Choose the design for the back of your tarot cards
            </p>

            {loadingCardBacks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              </div>
            ) : cardBacks.length === 0 ? (
              <p className="text-sm text-mystic-500 text-center py-4">
                No card back designs available yet
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleSelectCardBack(null)}
                  disabled={savingCardBack}
                  className={`
                    relative aspect-[2/3] rounded-lg border-2 transition-all overflow-hidden
                    bg-gradient-to-br from-mystic-800 to-mystic-900
                    flex items-center justify-center min-h-[120px]
                    ${!profile?.card_back_url
                      ? 'border-gold ring-2 ring-gold/30'
                      : 'border-mystic-700 hover:border-mystic-500'
                    }
                    disabled:opacity-50
                  `}
                >
                  <span className="text-xs text-mystic-400 text-center px-1">{tAppSettings('settings.defaultLabel')}</span>
                  {!profile?.card_back_url && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-mystic-900" />
                    </div>
                  )}
                </button>

                {cardBacks.map((cardBack, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectCardBack(cardBack.url)}
                    disabled={savingCardBack}
                    className={`
                      relative aspect-[2/3] rounded-lg border-2 transition-all overflow-hidden min-h-[120px]
                      ${profile?.card_back_url === cardBack.url
                        ? 'border-gold ring-2 ring-gold/30'
                        : 'border-mystic-700 hover:border-mystic-500'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <img
                      src={cardBack.url}
                      alt={cardBack.name}
                      className="w-full h-full object-cover"
                    />
                    {profile?.card_back_url === cardBack.url && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-mystic-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {savingCardBack && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-mystic-500 uppercase tracking-wider mb-3">
            App Background
          </h3>
          <div className="p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl">
            <p className="text-xs text-mystic-400 mb-4">
              Choose a custom background for the app
            </p>

            {loadingBackgrounds ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              </div>
            ) : backgrounds.length === 0 ? (
              <p className="text-sm text-mystic-500 text-center py-4">
                No backgrounds available yet
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default — no background image */}
                <button
                  onClick={() => handleSelectBackground(null)}
                  disabled={savingBackground}
                  className={`
                    relative aspect-video rounded-lg border-2 transition-all overflow-hidden
                    bg-gradient-to-br from-mystic-800 to-mystic-900
                    flex items-center justify-center min-h-[100px]
                    ${!profile?.background_url
                      ? 'border-gold ring-2 ring-gold/30'
                      : 'border-mystic-700 hover:border-mystic-500'
                    }
                    disabled:opacity-50
                  `}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-5 h-5 text-mystic-400" />
                    <span className="text-xs text-mystic-400">{tAppSettings('settings.defaultLabel')}</span>
                  </div>
                  {!profile?.background_url && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-mystic-900" />
                    </div>
                  )}
                </button>

                {/* Celestial — animated starfield + rising particles (same
                    visual as the pre-login landing page). Lives in the
                    grid alongside the image-based backgrounds. Preview
                    shows a static gradient + a handful of dots so users
                    recognize the option at a glance; the real animation
                    kicks in once selected. */}
                <button
                  onClick={() => handleSelectBackground(CELESTIAL_BG_URL)}
                  disabled={savingBackground}
                  className={`
                    relative aspect-video rounded-lg border-2 transition-all overflow-hidden min-h-[100px]
                    ${profile?.background_url === CELESTIAL_BG_URL
                      ? 'border-gold ring-2 ring-gold/30'
                      : 'border-mystic-700 hover:border-mystic-500'
                    }
                    disabled:opacity-50
                  `}
                  aria-label="Celestial animated background"
                >
                  {/* Preview base — same gradient the real background uses */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 0%, rgba(212, 168, 83, 0.18) 0%, transparent 50%),' +
                        'radial-gradient(ellipse at 30% 80%, rgba(142, 110, 181, 0.18) 0%, transparent 55%),' +
                        'linear-gradient(180deg, #040407 0%, #08081a 55%, #040407 100%)',
                    }}
                  />
                  {/* A few preview stars so the card reads as "starfield"
                      even before it's selected. Real animation runs app-wide
                      once you pick it. */}
                  {[
                    { l: 18, t: 22, s: 1.6, b: false },
                    { l: 74, t: 18, s: 1.2, b: true },
                    { l: 42, t: 56, s: 1.0, b: false },
                    { l: 62, t: 72, s: 1.8, b: true },
                    { l: 88, t: 48, s: 1.2, b: false },
                    { l: 28, t: 82, s: 1.0, b: true },
                    { l: 12, t: 62, s: 0.8, b: false },
                    { l: 82, t: 80, s: 0.8, b: false },
                  ].map((s, i) => (
                    <span
                      key={i}
                      className={`celestial-star ${s.b ? 'celestial-star-bright' : ''}`}
                      style={{
                        left: `${s.l}%`,
                        top: `${s.t}%`,
                        width: s.s,
                        height: s.s,
                        animationDuration: `${2 + (i % 5)}s`,
                        animationDelay: `${(i * 0.3) % 4}s`,
                      }}
                    />
                  ))}
                  {/* Label */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5 bg-gradient-to-t from-mystic-950/80 to-transparent">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <span className="text-xs font-medium text-mystic-100">
                      {tAppSettings('settings.celestialLabel', { defaultValue: 'Celestial' })}
                    </span>
                  </div>
                  {profile?.background_url === CELESTIAL_BG_URL && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-mystic-900" />
                    </div>
                  )}
                </button>

                {backgrounds.map((bg, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectBackground(bg.url)}
                    disabled={savingBackground}
                    className={`
                      relative aspect-video rounded-lg border-2 transition-all overflow-hidden min-h-[100px]
                      ${profile?.background_url === bg.url
                        ? 'border-gold ring-2 ring-gold/30'
                        : 'border-mystic-700 hover:border-mystic-500'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <img
                      src={bg.url}
                      alt={bg.name}
                      className="w-full h-full object-cover"
                    />
                    {profile?.background_url === bg.url && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-mystic-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {savingBackground && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-mystic-800/50 border border-mystic-700 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-mystic-300 mb-1">{tAppSettings('settings.disclaimerHeader')}</h4>
              <p className="text-xs text-mystic-500 leading-relaxed">
                This app is for reflection and entertainment. It does not provide medical, legal, or financial advice.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-mystic-600 space-y-1">
          <p>{tAppSettings('settings.disclaimerBody')}</p>
        </div>

        <div className="pt-4 border-t border-mystic-800">
          <button
            onClick={() => {
              setVersionTapCount(prev => {
                const next = prev + 1;
                if (next === 5) {
                  toast(tAppSettings('settings.toasts.devModeEnabled'), 'info');
                }
                return next;
              });
            }}
            className="w-full text-center text-xs text-mystic-600 hover:text-mystic-500 transition-colors"
          >
            Arcana v1.0.0
            {versionTapCount >= 5 && !isDevMode() && (
              <span className="ml-1 text-gold">(Dev)</span>
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
