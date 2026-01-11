import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image, Layers, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

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

type UploadSection = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles' | 'cardBacks' | 'backgrounds';

const SECTIONS: { id: UploadSection; label: string; description: string }[] = [
  { id: 'major', label: 'Major Arcana', description: '22 cards (The Fool to The World)' },
  { id: 'wands', label: 'Wands', description: '14 cards (Ace to King)' },
  { id: 'cups', label: 'Cups', description: '14 cards (Ace to King)' },
  { id: 'swords', label: 'Swords', description: '14 cards (Ace to King)' },
  { id: 'pentacles', label: 'Pentacles', description: '14 cards (Ace to King)' },
  { id: 'cardBacks', label: 'Card Backs', description: 'Custom card back designs' },
  { id: 'backgrounds', label: 'Backgrounds', description: 'App background images' },
];

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { refreshTarotCards } = useApp();
  const [tarotCards, setTarotCards] = useState<TarotCardData[]>([]);
  const [cardBacks, setCardBacks] = useState<StorageFile[]>([]);
  const [backgrounds, setBackgrounds] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<UploadSection | null>('major');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [uploadType, setUploadType] = useState<'card' | 'cardBack' | 'background'>('card');

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
    ]);
    setLoading(false);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadType === 'card' && selectedCard) {
      await uploadCardImage(selectedCard, file);
    } else if (uploadType === 'cardBack') {
      await uploadCardBack(file);
    } else if (uploadType === 'background') {
      await uploadBackground(file);
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
                  ) : (
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
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
