import { supabase } from '../lib/supabase';
import type { TarotCard, TarotReading } from '../types';
import { appStorage } from '../lib/appStorage';

export type SavedItemType = 'reading' | 'card' | 'spread' | 'horoscope' | 'prompt';

export interface SavedItem {
  id: string;
  userId: string;
  itemType: SavedItemType;
  itemId: string;
  title: string;
  content: Record<string, unknown>;
  notes?: string;
  tags: string[];
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  userId: string;
  itemType: SavedItemType;
  itemId: string;
  title: string;
  metadata: Record<string, unknown>;
  viewedAt: string;
}

export async function saveItem(
  userId: string,
  itemType: SavedItemType,
  itemId: string,
  title: string,
  content: Record<string, unknown>,
  notes?: string,
  tags: string[] = []
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data: existing } = await supabase
    .from('saved_highlights')
    .select('id')
    .eq('user_id', userId)
    .eq('highlight_type', itemType)
    .eq('content->>itemId', itemId)
    .maybeSingle();

  if (existing) {
    return { success: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from('saved_highlights')
    .insert({
      user_id: userId,
      highlight_type: itemType,
      date: new Date().toISOString().split('T')[0],
      content: { itemId, title, ...content, notes, tags },
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function unsaveItem(
  userId: string,
  itemType: SavedItemType,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('saved_highlights')
    .delete()
    .eq('user_id', userId)
    .eq('highlight_type', itemType)
    .eq('content->>itemId', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function isItemSaved(
  userId: string,
  itemType: SavedItemType,
  itemId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('saved_highlights')
    .select('id')
    .eq('user_id', userId)
    .eq('highlight_type', itemType)
    .eq('content->>itemId', itemId)
    .maybeSingle();

  return !!data;
}

export async function getSavedItems(
  userId: string,
  itemType?: SavedItemType,
  limit = 50
): Promise<SavedItem[]> {
  let query = supabase
    .from('saved_highlights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (itemType) {
    query = query.eq('highlight_type', itemType);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    itemType: item.highlight_type as SavedItemType,
    itemId: item.content?.itemId as string || item.id,
    title: item.content?.title as string || 'Saved Item',
    content: item.content as Record<string, unknown>,
    notes: item.content?.notes as string | undefined,
    tags: (item.content?.tags as string[]) || [],
    createdAt: item.created_at,
  }));
}

export async function updateSavedItemNotes(
  userId: string,
  savedItemId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('saved_highlights')
    .select('content')
    .eq('id', savedItemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: 'Item not found' };
  }

  const { error } = await supabase
    .from('saved_highlights')
    .update({
      content: { ...existing.content, notes },
    })
    .eq('id', savedItemId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function addToHistory(
  userId: string,
  itemType: SavedItemType,
  itemId: string,
  title: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from('content_interactions').insert({
    user_id: userId,
    content_type: itemType,
    content_id: itemId,
    interaction_type: 'view',
    metadata: { title, ...metadata },
  });
}

export async function getHistory(
  userId: string,
  days = 30,
  itemType?: SavedItemType
): Promise<HistoryItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from('content_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('interaction_type', 'view')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (itemType) {
    query = query.eq('content_type', itemType);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const uniqueItems = new Map<string, HistoryItem>();
  data.forEach(item => {
    const key = `${item.content_type}-${item.content_id}`;
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, {
        id: item.id,
        userId: item.user_id,
        itemType: item.content_type as SavedItemType,
        itemId: item.content_id || item.id,
        title: (item.metadata as Record<string, unknown>)?.title as string || 'History Item',
        metadata: item.metadata as Record<string, unknown>,
        viewedAt: item.created_at,
      });
    }
  });

  return Array.from(uniqueItems.values());
}

export async function saveReading(
  userId: string,
  reading: Omit<TarotReading, 'id' | 'saved'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('tarot_readings')
    .insert({
      user_id: userId,
      date: reading.date,
      spread_type: reading.spreadType,
      cards: reading.cards,
      interpretation: reading.interpretation,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function getReadingHistory(userId: string, limit = 30): Promise<TarotReading[]> {
  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    spreadType: r.spread_type,
    cards: r.cards as TarotReading['cards'],
    interpretation: r.interpretation,
    saved: true,
  }));
}

export async function saveFavoriteCard(userId: string, cardId: number): Promise<void> {
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('favorite_cards')
    .eq('user_id', userId)
    .maybeSingle();

  const currentFavorites = (prefs?.favorite_cards as number[]) || [];
  if (!currentFavorites.includes(cardId)) {
    const updated = [...currentFavorites, cardId];
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        favorite_cards: updated,
        updated_at: new Date().toISOString(),
      });
  }
}

export async function removeFavoriteCard(userId: string, cardId: number): Promise<void> {
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('favorite_cards')
    .eq('user_id', userId)
    .maybeSingle();

  const currentFavorites = (prefs?.favorite_cards as number[]) || [];
  const updated = currentFavorites.filter(id => id !== cardId);

  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      favorite_cards: updated,
      updated_at: new Date().toISOString(),
    });
}

export async function getFavoriteCards(userId: string): Promise<number[]> {
  const { data } = await supabase
    .from('user_preferences')
    .select('favorite_cards')
    .eq('user_id', userId)
    .maybeSingle();

  return (data?.favorite_cards as number[]) || [];
}

const LOCAL_STORAGE_KEYS = {
  GUEST_SAVED: 'stellara_guest_saved',
  GUEST_HISTORY: 'stellara_guest_history',
  GUEST_FAVORITES: 'stellara_guest_favorites',
};

export async function saveItemLocally(item: Omit<SavedItem, 'id' | 'userId' | 'createdAt'>): Promise<void> {
  const saved = await getLocalSavedItems();
  const newItem: SavedItem = {
    ...item,
    id: `local_${Date.now()}`,
    userId: 'guest',
    createdAt: new Date().toISOString(),
  };
  saved.unshift(newItem);
  await appStorage.set(LOCAL_STORAGE_KEYS.GUEST_SAVED, JSON.stringify(saved.slice(0, 100)));
}

export async function unsaveItemLocally(itemType: SavedItemType, itemId: string): Promise<void> {
  const saved = await getLocalSavedItems();
  const filtered = saved.filter(item => !(item.itemType === itemType && item.itemId === itemId));
  await appStorage.set(LOCAL_STORAGE_KEYS.GUEST_SAVED, JSON.stringify(filtered));
}

export async function getLocalSavedItems(): Promise<SavedItem[]> {
  try {
    const stored = await appStorage.get(LOCAL_STORAGE_KEYS.GUEST_SAVED);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function addToLocalHistory(item: Omit<HistoryItem, 'id' | 'userId' | 'viewedAt'>): Promise<void> {
  const history = await getLocalHistory();
  const newItem: HistoryItem = {
    ...item,
    id: `local_${Date.now()}`,
    userId: 'guest',
    viewedAt: new Date().toISOString(),
  };

  const existingIndex = history.findIndex(
    h => h.itemType === item.itemType && h.itemId === item.itemId
  );

  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift(newItem);
  await appStorage.set(LOCAL_STORAGE_KEYS.GUEST_HISTORY, JSON.stringify(history.slice(0, 100)));
}

export async function getLocalHistory(): Promise<HistoryItem[]> {
  try {
    const stored = await appStorage.get(LOCAL_STORAGE_KEYS.GUEST_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function clearLocalStorage(): Promise<void> {
  for (const key of Object.values(LOCAL_STORAGE_KEYS)) {
    await appStorage.remove(key);
  }
}
