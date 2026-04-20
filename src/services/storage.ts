import { supabase } from '../lib/supabase'; // retained for user_preferences (internal-only service table)
import { savedHighlights, contentInteractions, tarotReadings as tarotReadingsDal } from '../dal';
import type { TarotReading } from '../types';
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
  const existingRes = await savedHighlights.findByItem(userId, itemType, itemId);
  if (existingRes.ok && existingRes.data) {
    return { success: true, id: existingRes.data.id };
  }

  const res = await savedHighlights.insertReturningId({
    userId,
    highlightType: itemType,
    date: new Date().toISOString().split('T')[0],
    content: { itemId, title, ...content, notes, tags },
  });

  if (!res.ok) {
    return { success: false, error: res.error };
  }

  return { success: true, id: res.data.id };
}

export async function unsaveItem(
  userId: string,
  itemType: SavedItemType,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await savedHighlights.deleteByItem(userId, itemType, itemId);
  if (!res.ok) {
    return { success: false, error: res.error };
  }
  return { success: true };
}

export async function isItemSaved(
  userId: string,
  itemType: SavedItemType,
  itemId: string
): Promise<boolean> {
  const res = await savedHighlights.findByItem(userId, itemType, itemId);
  return res.ok && res.data !== null;
}

export async function getSavedItems(
  userId: string,
  itemType?: SavedItemType,
  limit = 50,
  offset = 0
): Promise<SavedItem[]> {
  const res = await savedHighlights.listForUser(userId, {
    highlightType: itemType,
    limit,
    offset,
  });

  if (!res.ok) return [];

  return res.data.map(item => ({
    id: item.id,
    userId: item.userId,
    itemType: item.highlightType as SavedItemType,
    itemId: (item.content?.itemId as string) || item.id,
    title: (item.content?.title as string) || 'Saved Item',
    content: item.content,
    notes: item.content?.notes as string | undefined,
    tags: (item.content?.tags as string[]) || [],
    createdAt: item.createdAt,
  }));
}

export async function updateSavedItemNotes(
  userId: string,
  savedItemId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const existingRes = await savedHighlights.getContentById(userId, savedItemId);
  if (!existingRes.ok) {
    return { success: false, error: existingRes.error };
  }
  if (!existingRes.data) {
    return { success: false, error: 'Item not found' };
  }

  const res = await savedHighlights.updateContentById(userId, savedItemId, {
    ...existingRes.data,
    notes,
  });
  if (!res.ok) {
    return { success: false, error: res.error };
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
  await contentInteractions.insert({
    userId,
    contentType: itemType,
    contentId: itemId,
    interactionType: 'view',
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

  const res = await contentInteractions.listRecent(userId, {
    sinceIso: since.toISOString(),
    interactionType: 'view',
    contentType: itemType,
    range: [0, 99],
  });

  if (!res.ok) return [];

  const uniqueItems = new Map<string, HistoryItem>();
  res.data.forEach(item => {
    const key = `${item.content_type}-${item.content_id}`;
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, {
        id: item.id,
        userId: item.user_id,
        itemType: item.content_type as SavedItemType,
        itemId: item.content_id || item.id,
        title: (item.metadata?.title as string) || 'History Item',
        metadata: item.metadata,
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
  const res = await tarotReadingsDal.insertReturningId({
    userId,
    date: reading.date,
    spreadType: reading.spreadType,
    cards: reading.cards,
    interpretation: reading.interpretation,
  });
  if (!res.ok) {
    return { success: false, error: res.error };
  }
  return { success: true, id: res.data.id };
}

export async function getReadingHistory(userId: string, limit = 30, offset = 0): Promise<TarotReading[]> {
  const res = await tarotReadingsDal.listHistory(userId, limit, offset);
  return res.ok ? res.data : [];
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
  GUEST_SAVED: 'arcana_guest_saved',
  GUEST_HISTORY: 'arcana_guest_history',
  GUEST_FAVORITES: 'arcana_guest_favorites',
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

export async function migrateGuestData(userId: string): Promise<{ migrated: number }> {
  let migrated = 0;
  let savedMigrated = false;
  let historyMigrated = false;

  const savedItems = await getLocalSavedItems();
  if (savedItems.length > 0) {
    const res = await savedHighlights.upsertMany(
      savedItems.map(item => ({
        userId,
        highlightType: item.itemType,
        date: item.createdAt.split('T')[0],
        content: { itemId: item.itemId, title: item.title, ...item.content, notes: item.notes, tags: item.tags },
      })),
      { onConflict: 'user_id,highlight_type,date' },
    );

    if (res.ok) {
      migrated += savedItems.length;
      savedMigrated = true;
    }
  }

  const history = await getLocalHistory();
  if (history.length > 0) {
    // Preserves pre-DAL behavior: interaction_type was set to the item type,
    // content_type column was not set (relies on its DB default).
    const res = await contentInteractions.insertMany(
      history.map(item => ({
        userId,
        interactionType: item.itemType,
        contentId: item.itemId,
        metadata: { title: item.title, ...item.metadata },
        createdAt: item.viewedAt,
      })),
    );

    if (res.ok) {
      migrated += history.length;
      historyMigrated = true;
    }
  }

  // Only clear local storage if ALL migrations succeeded
  if ((savedItems.length === 0 || savedMigrated) && (history.length === 0 || historyMigrated)) {
    await clearLocalStorage();
  }

  return { migrated };
}
