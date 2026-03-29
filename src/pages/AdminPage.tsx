import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image, Layers, RefreshCw, ChevronDown, ChevronUp, Check, Star, Sparkles, Flame } from 'lucide-react';
import { Button, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRitual } from '../context/RitualContext';
import { supabase } from '../lib/supabase';
import { AdAnalyticsPanel } from '../components/admin/AdAnalyticsPanel';
import { BlogManager } from '../components/admin/BlogManager';
import type { BlogPost } from '../types/blog';

interface TarotCardData {
  id: string;
  name: string;
  suit: string | null;
  arcana: string;
  image_url: string | null;
}

interface StorageFile {
  name: string;
  url: string;
  bucket: string;
  path: string;
  createdAt?: string;
}

type UploadSection = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles' | 'cardBacks' | 'backgrounds' | 'customIcons';

const SECTIONS: { id: UploadSection; label: string; description: string }[] = [
  { id: 'customIcons', label: 'Custom Icons', description: 'Star, Sparkles, and Flame icons' },
  { id: 'major', label: 'Major Arcana', description: '22 cards (The Fool to The World)' },
  { id: 'wands', label: 'Wands', description: '14 cards (Ace to King)' },
  { id: 'cups', label: 'Cups', description: '14 cards (Ace to King)' },
  { id: 'swords', label: 'Swords', description: '14 cards (Ace to King)' },
  { id: 'pentacles', label: 'Pentacles', description: '14 cards (Ace to King)' },
  { id: 'cardBacks', label: 'Card Backs', description: 'Custom card back designs' },
  { id: 'backgrounds', label: 'Backgrounds', description: 'App background images' },
];

interface AdAnalytics {
  total_impressions: number;
  total_clicks: number;
  android_impressions: number;
  ios_impressions: number;
  reading_triggers: number;
  quiz_triggers: number;
  journal_triggers: number;
  estimated_revenue: number;
  date: string;
}

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { refreshTarotCards } = useRitual();
  const [tarotCards, setTarotCards] = useState<TarotCardData[]>([]);
  const [cardBacks, setCardBacks] = useState<StorageFile[]>([]);
  const [backgrounds, setBackgrounds] = useState<StorageFile[]>([]);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<UploadSection | null>('customIcons');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [uploadType, setUploadType] = useState<'card' | 'cardBack' | 'background' | 'icon'>('card');
  const [selectedIconType, setSelectedIconType] = useState<'star' | 'sparkles' | 'flame'>('star');
  const [adAnalytics, setAdAnalytics] = useState<AdAnalytics | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadTarotCards(),
      loadCardBacks(),
      loadBackgrounds(),
      loadCustomIcons(),
      loadAdAnalytics(),
      loadBlogPosts(),
    ]);
    setLoading(false);
  };

  const loadBlogPosts = async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false });
    if (data) setBlogPosts(data);
  };

  const loadCustomIcons = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['star_icon_url', 'sparkles_icon_url', 'flame_icon_url']);

      if (!error && data) {
        const icons: Record<string, string> = {};
        data.forEach((row) => {
          icons[row.setting_key] = row.setting_value;
        });
        setCustomIcons(icons);
      }
    } catch (error) {
      console.error('Failed to load custom icons:', error);
    }
  };

  const loadAdAnalytics = async () => {
    const { data, error } = await supabase
      .from('ad_analytics_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setAdAnalytics(data as AdAnalytics);
    }
  };

  const loadTarotCards = async () => {
    const { data, error } = await supabase
      .from('tarot_cards')
      .select('id, name, suit, arcana, image_url')
      .order('arcana', { ascending: false })
      .order('suit')
      .order('name');

    if (!error && data) {
      setTarotCards(data);
    }
  };

  const loadCardBacks = async () => {
    const { data, error } = await supabase.storage
      .from('card-backs')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (!error && data) {
      const files: StorageFile[] = [];
      for (const folder of data) {
        if (!folder.id) {
          const { data: innerFiles } = await supabase.storage
            .from('card-backs')
            .list(folder.name, { limit: 100 });

          if (innerFiles) {
            for (const file of innerFiles) {
              if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
                const path = `${folder.name}/${file.name}`;
                const { data: urlData } = supabase.storage
                  .from('card-backs')
                  .getPublicUrl(path);
                files.push({
                  name: file.name,
                  url: urlData.publicUrl,
                  bucket: 'card-backs',
                  path,
                  createdAt: file.created_at,
                });
              }
            }
          }
        }
      }
      setCardBacks(files);
    }
  };

  const loadBackgrounds = async () => {
    const { data, error } = await supabase.storage
      .from('backgrounds')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (!error && data) {
      const files: StorageFile[] = [];
      for (const folder of data) {
        if (!folder.id) {
          const { data: innerFiles } = await supabase.storage
            .from('backgrounds')
            .list(folder.name, { limit: 100 });

          if (innerFiles) {
            for (const file of innerFiles) {
              if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
                const path = `${folder.name}/${file.name}`;
                const { data: urlData } = supabase.storage
                  .from('backgrounds')
                  .getPublicUrl(path);
                files.push({
                  name: file.name,
                  url: urlData.publicUrl,
                  bucket: 'backgrounds',
                  path,
                  createdAt: file.created_at,
                });
              }
            }
          }
        }
      }
      setBackgrounds(files);
    }
  };

  const handleCardUploadClick = (card: TarotCardData) => {
    setSelectedCard(card);
    setUploadType('card');
    fileInputRef.current?.click();
  };

  const handleCardBackUploadClick = () => {
    setSelectedCard(null);
    setUploadType('cardBack');
    fileInputRef.current?.click();
  };

  const handleBackgroundUploadClick = () => {
    setSelectedCard(null);
    setUploadType('background');
    fileInputRef.current?.click();
  };

  const handleIconUploadClick = (iconType: 'star' | 'sparkles' | 'flame') => {
    setSelectedCard(null);
    setSelectedIconType(iconType);
    setUploadType('icon');
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadType === 'card' && selectedCard) {
      await uploadCardImage(selectedCard, file);
    } else if (uploadType === 'cardBack') {
      await uploadCardBack(file);
    } else if (uploadType === 'background') {
      await uploadBackground(file);
    } else if (uploadType === 'icon') {
      await uploadCustomIcon(file, selectedIconType);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadCardImage = async (card: TarotCardData, file: File) => {
    setUploading(card.id);
    try {
      const folder = card.suit || 'major';
      const fileName = card.name.toLowerCase().replace(/\s+/g, '_') + '.png';
      const storagePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tarot-images')
        .upload(storagePath, file, { cacheControl: '0', upsert: true });

      if (uploadError) {
        toast(`Upload failed: ${uploadError.message}`, 'error');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('tarot-images')
        .getPublicUrl(storagePath);

      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('tarot_cards')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', card.id);

      if (updateError) {
        toast(`Database update failed: ${updateError.message}`, 'error');
        return;
      }

      toast(`${card.name} uploaded successfully!`, 'success');
      await loadTarotCards();
      refreshTarotCards();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const uploadCardBack = async (file: File) => {
    if (!user) return;
    setUploading('cardBack');
    try {
      const timestamp = Date.now();
      const storagePath = `${user.id}/card_back_${timestamp}.png`;

      const { error: uploadError } = await supabase.storage
        .from('card-backs')
        .upload(storagePath, file, { cacheControl: '0', upsert: false });

      if (uploadError) {
        toast(`Upload failed: ${uploadError.message}`, 'error');
        return;
      }

      toast('Card back uploaded successfully!', 'success');
      await loadCardBacks();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const uploadBackground = async (file: File) => {
    if (!user) return;
    setUploading('background');
    try {
      const timestamp = Date.now();
      const storagePath = `${user.id}/background_${timestamp}.png`;

      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(storagePath, file, { cacheControl: '0', upsert: false });

      if (uploadError) {
        toast(`Upload failed: ${uploadError.message}`, 'error');
        return;
      }

      toast('Background uploaded successfully!', 'success');
      await loadBackgrounds();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const uploadCustomIcon = async (file: File, iconType: 'star' | 'sparkles' | 'flame') => {
    if (!user) return;
    setUploading(`icon_${iconType}`);
    try {
      const timestamp = Date.now();
      const storagePath = `${iconType}_${timestamp}.png`;

      const { error: uploadError } = await supabase.storage
        .from('custom-icons')
        .upload(storagePath, file, { cacheControl: '0', upsert: false });

      if (uploadError) {
        toast(`Upload failed: ${uploadError.message}`, 'error');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('custom-icons')
        .getPublicUrl(storagePath);

      const settingKey = `${iconType}_icon_url`;
      const { error: settingError } = await supabase
        .from('app_settings')
        .upsert(
          { setting_key: settingKey, setting_value: urlData.publicUrl, updated_at: new Date().toISOString() },
          { onConflict: 'setting_key' }
        );

      if (settingError) {
        toast(`Failed to save setting: ${settingError.message}`, 'error');
        return;
      }

      toast(`${iconType.charAt(0).toUpperCase() + iconType.slice(1)} icon uploaded successfully!`, 'success');
      await loadCustomIcons();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const deleteCustomIcon = async (iconType: 'star' | 'sparkles' | 'flame') => {
    if (!confirm(`Remove the custom ${iconType} icon?`)) return;

    setUploading(`icon_${iconType}`);
    try {
      const settingKey = `${iconType}_icon_url`;
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('setting_key', settingKey);

      if (error) {
        toast(`Failed to remove: ${error.message}`, 'error');
        return;
      }

      toast(`Custom ${iconType} icon removed`, 'success');
      await loadCustomIcons();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const deleteCardImage = async (card: TarotCardData) => {
    if (!confirm(`Remove image from ${card.name}?`)) return;

    setUploading(card.id);
    try {
      const { error } = await supabase
        .from('tarot_cards')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', card.id);

      if (error) {
        toast(`Failed to remove: ${error.message}`, 'error');
        return;
      }

      toast(`Image removed from ${card.name}`, 'success');
      await loadTarotCards();
      refreshTarotCards();
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const deleteStorageFile = async (file: StorageFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    setUploading(file.path);
    try {
      const { error } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);

      if (error) {
        toast(`Failed to delete: ${error.message}`, 'error');
        return;
      }

      toast('File deleted successfully', 'success');
      if (file.bucket === 'card-backs') {
        await loadCardBacks();
      } else {
        await loadBackgrounds();
      }
    } catch (error) {
      toast(`Unexpected error: ${error}`, 'error');
    } finally {
      setUploading(null);
    }
  };

  const getCardsBySection = (section: UploadSection): TarotCardData[] => {
    switch (section) {
      case 'major':
        return tarotCards.filter(c => c.arcana === 'major');
      case 'wands':
        return tarotCards.filter(c => c.suit === 'wands');
      case 'cups':
        return tarotCards.filter(c => c.suit === 'cups');
      case 'swords':
        return tarotCards.filter(c => c.suit === 'swords');
      case 'pentacles':
        return tarotCards.filter(c => c.suit === 'pentacles');
      default:
        return [];
    }
  };

  const getUploadProgress = (section: UploadSection): { uploaded: number; total: number } => {
    if (section === 'cardBacks') {
      return { uploaded: cardBacks.length, total: cardBacks.length };
    }
    if (section === 'backgrounds') {
      return { uploaded: backgrounds.length, total: backgrounds.length };
    }
    const cards = getCardsBySection(section);
    const uploaded = cards.filter(c => c.image_url).length;
    return { uploaded, total: cards.length };
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mystic-400">Admin access required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="loading-constellation" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-mystic-100">Admin Panel</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadAllData}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AdAnalyticsPanel analytics={adAnalytics} />

      <BlogManager posts={blogPosts} onRefresh={loadBlogPosts} />

      <div className="space-y-3">
        {SECTIONS.map(section => {
          const progress = getUploadProgress(section.id);
          const isExpanded = expandedSection === section.id;
          const isCardSection = ['major', 'wands', 'cups', 'swords', 'pentacles'].includes(section.id);

          return (
            <div
              key={section.id}
              className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mystic-800 flex items-center justify-center">
                    {isCardSection ? (
                      <Layers className="w-5 h-5 text-gold" />
                    ) : (
                      <Image className="w-5 h-5 text-gold" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-mystic-100">{section.label}</h3>
                    <p className="text-sm text-mystic-400">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isCardSection && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-mystic-400">
                        {progress.uploaded}/{progress.total}
                      </span>
                      {progress.uploaded === progress.total && progress.total > 0 && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  )}
                  {!isCardSection && (
                    <span className="text-sm text-mystic-400">
                      {progress.total} files
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-mystic-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-mystic-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-mystic-700/50 p-4">
                  {isCardSection ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {getCardsBySection(section.id).map(card => (
                        <div
                          key={card.id}
                          className="relative group"
                        >
                          <div
                            className={`aspect-[2/3] rounded-lg border-2 overflow-hidden ${
                              card.image_url
                                ? 'border-emerald-500/50'
                                : 'border-mystic-600/50 border-dashed'
                            }`}
                          >
                            {card.image_url ? (
                              <img
                                src={card.image_url}
                                alt={card.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-mystic-800/50">
                                <Image className="w-6 h-6 text-mystic-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-mystic-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleCardUploadClick(card)}
                                disabled={uploading === card.id}
                                className="p-2 bg-gold rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50"
                              >
                                <Upload className="w-4 h-4 text-mystic-950" />
                              </button>
                              {card.image_url && (
                                <button
                                  onClick={() => deleteCardImage(card)}
                                  disabled={uploading === card.id}
                                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4 text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-mystic-400 text-center truncate">
                            {card.name.replace('The ', '').split(' of ')[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : section.id === 'cardBacks' ? (
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCardBackUploadClick}
                        disabled={uploading === 'cardBack'}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Card Back
                      </Button>
                      {cardBacks.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {cardBacks.map(file => (
                            <div key={file.path} className="relative group">
                              <div className="aspect-[2/3] rounded-lg border border-mystic-600/50 overflow-hidden">
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-mystic-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => deleteStorageFile(file)}
                                    disabled={uploading === file.path}
                                    className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-mystic-500">No card backs uploaded yet</p>
                      )}
                    </div>
                  ) : section.id === 'customIcons' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-mystic-400 mb-4">
                        Upload custom icons to replace the default Star, Sparkles, and Flame icons used throughout the app.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {([
                          { type: 'star' as const, label: 'Star Icon', Icon: Star },
                          { type: 'sparkles' as const, label: 'Sparkles Icon', Icon: Sparkles },
                          { type: 'flame' as const, label: 'Flame Icon', Icon: Flame },
                        ]).map(({ type, label, Icon }) => {
                          const iconUrl = customIcons[`${type}_icon_url`];
                          const isUploading = uploading === `icon_${type}`;
                          return (
                            <div key={type} className="bg-mystic-800/40 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-mystic-700/50 flex items-center justify-center">
                                  {iconUrl ? (
                                    <img src={iconUrl} alt={label} className="w-6 h-6 object-contain" />
                                  ) : (
                                    <Icon className="w-5 h-5 text-gold" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-mystic-100">{label}</h4>
                                  <p className="text-xs text-mystic-400">
                                    {iconUrl ? 'Custom' : 'Default'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleIconUploadClick(type)}
                                  disabled={isUploading}
                                  className="flex-1 gap-1.5 text-xs"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  {iconUrl ? 'Replace' : 'Upload'}
                                </Button>
                                {iconUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCustomIcon(type)}
                                    disabled={isUploading}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : section.id === 'backgrounds' ? (
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackgroundUploadClick}
                        disabled={uploading === 'background'}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Background
                      </Button>
                      {backgrounds.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {backgrounds.map(file => (
                            <div key={file.path} className="relative group">
                              <div className="aspect-video rounded-lg border border-mystic-600/50 overflow-hidden">
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-mystic-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => deleteStorageFile(file)}
                                    disabled={uploading === file.path}
                                    className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-mystic-500">No backgrounds uploaded yet</p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
