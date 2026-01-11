import { supabase } from '../lib/supabase';

interface CardInfo {
  name: string;
  storagePath: string;
}

const CUPS_CARDS: CardInfo[] = [
  { name: 'Ace of Cups', storagePath: 'cups/ace_of_cups.png' },
  { name: 'Two of Cups', storagePath: 'cups/two_of_cups.png' },
  { name: 'Three of Cups', storagePath: 'cups/three_of_cups.png' },
  { name: 'Four of Cups', storagePath: 'cups/four_of_cups.png' },
  { name: 'Five of Cups', storagePath: 'cups/five_of_cups.png' },
  { name: 'Six of Cups', storagePath: 'cups/six_of_cups.png' },
  { name: 'Seven of Cups', storagePath: 'cups/seven_of_cups.png' },
  { name: 'Eight of Cups', storagePath: 'cups/eight_of_cups.png' },
  { name: 'Nine of Cups', storagePath: 'cups/nine_of_cups.png' },
  { name: 'Ten of Cups', storagePath: 'cups/ten_of_cups.png' },
  { name: 'Page of Cups', storagePath: 'cups/page_of_cups.png' },
  { name: 'Knight of Cups', storagePath: 'cups/knight_of_cups.png' },
  { name: 'Queen of Cups', storagePath: 'cups/queen_of_cups.png' },
  { name: 'King of Cups', storagePath: 'cups/king_of_cups.png' },
];

const SWORDS_CARDS: CardInfo[] = [
  { name: 'Ace of Swords', storagePath: 'swords/ace_of_swords.png' },
  { name: 'Two of Swords', storagePath: 'swords/two_of_swords.png' },
  { name: 'Three of Swords', storagePath: 'swords/three_of_swords.png' },
  { name: 'Four of Swords', storagePath: 'swords/four_of_swords.png' },
  { name: 'Five of Swords', storagePath: 'swords/five_of_swords.png' },
  { name: 'Six of Swords', storagePath: 'swords/six_of_swords.png' },
  { name: 'Seven of Swords', storagePath: 'swords/seven_of_swords.png' },
  { name: 'Eight of Swords', storagePath: 'swords/eight_of_swords.png' },
  { name: 'Nine of Swords', storagePath: 'swords/nine_of_swords.png' },
  { name: 'Ten of Swords', storagePath: 'swords/ten_of_swords.png' },
  { name: 'Page of Swords', storagePath: 'swords/page_of_swords.png' },
  { name: 'Knight of Swords', storagePath: 'swords/knight_of_swords.png' },
  { name: 'Queen of Swords', storagePath: 'swords/queen_of_swords.png' },
  { name: 'King of Swords', storagePath: 'swords/king_of_swords.png' },
];

export async function uploadCupsCard(
  cardIndex: number,
  file: File
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    if (cardIndex < 0 || cardIndex >= CUPS_CARDS.length) {
      return { success: false, message: 'Invalid card index' };
    }

    const cardInfo = CUPS_CARDS[cardIndex];

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tarot-images')
      .upload(cardInfo.storagePath, file, {
        cacheControl: '0',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, message: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('tarot-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('tarot_cards')
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('name', cardInfo.name)
      .eq('suit', 'cups');

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, message: `Database update failed: ${updateError.message}` };
    }

    return {
      success: true,
      message: `${cardInfo.name} uploaded successfully!`,
      url: publicUrl
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export function getCupsCards() {
  return CUPS_CARDS.map((card, index) => ({
    index,
    name: card.name,
  }));
}

export async function uploadSwordsCard(
  cardIndex: number,
  file: File
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    if (cardIndex < 0 || cardIndex >= SWORDS_CARDS.length) {
      return { success: false, message: 'Invalid card index' };
    }

    const cardInfo = SWORDS_CARDS[cardIndex];

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tarot-images')
      .upload(cardInfo.storagePath, file, {
        cacheControl: '0',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, message: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('tarot-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('tarot_cards')
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('name', cardInfo.name)
      .eq('suit', 'swords');

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, message: `Database update failed: ${updateError.message}` };
    }

    return {
      success: true,
      message: `${cardInfo.name} uploaded successfully!`,
      url: publicUrl
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export function getSwordsCards() {
  return SWORDS_CARDS.map((card, index) => ({
    index,
    name: card.name,
  }));
}

const PENTACLES_CARDS: CardInfo[] = [
  { name: 'Ace of Pentacles', storagePath: 'pentacles/ace_of_pentacles.png' },
  { name: 'Two of Pentacles', storagePath: 'pentacles/two_of_pentacles.png' },
  { name: 'Three of Pentacles', storagePath: 'pentacles/three_of_pentacles.png' },
  { name: 'Four of Pentacles', storagePath: 'pentacles/four_of_pentacles.png' },
  { name: 'Five of Pentacles', storagePath: 'pentacles/five_of_pentacles.png' },
  { name: 'Six of Pentacles', storagePath: 'pentacles/six_of_pentacles.png' },
  { name: 'Seven of Pentacles', storagePath: 'pentacles/seven_of_pentacles.png' },
  { name: 'Eight of Pentacles', storagePath: 'pentacles/eight_of_pentacles.png' },
  { name: 'Nine of Pentacles', storagePath: 'pentacles/nine_of_pentacles.png' },
  { name: 'Ten of Pentacles', storagePath: 'pentacles/ten_of_pentacles.png' },
  { name: 'Page of Pentacles', storagePath: 'pentacles/page_of_pentacles.png' },
  { name: 'Knight of Pentacles', storagePath: 'pentacles/knight_of_pentacles.png' },
  { name: 'Queen of Pentacles', storagePath: 'pentacles/queen_of_pentacles.png' },
  { name: 'King of Pentacles', storagePath: 'pentacles/king_of_pentacles.png' },
];

export async function uploadPentaclesCard(
  cardIndex: number,
  file: File
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    if (cardIndex < 0 || cardIndex >= PENTACLES_CARDS.length) {
      return { success: false, message: 'Invalid card index' };
    }

    const cardInfo = PENTACLES_CARDS[cardIndex];

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tarot-images')
      .upload(cardInfo.storagePath, file, {
        cacheControl: '0',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, message: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('tarot-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('tarot_cards')
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('name', cardInfo.name)
      .eq('suit', 'pentacles');

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, message: `Database update failed: ${updateError.message}` };
    }

    return {
      success: true,
      message: `${cardInfo.name} uploaded successfully!`,
      url: publicUrl
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export function getPentaclesCards() {
  return PENTACLES_CARDS.map((card, index) => ({
    index,
    name: card.name,
  }));
}

export async function uploadCardBack(
  userId: string,
  file: File
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    const storagePath = `${userId}/card_back.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-backs')
      .upload(storagePath, file, {
        cacheControl: '0',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, message: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('card-backs')
      .getPublicUrl(uploadData.path);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        card_back_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, message: `Database update failed: ${updateError.message}` };
    }

    return {
      success: true,
      message: 'Card back uploaded successfully!',
      url: publicUrl
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export async function uploadBackground(
  userId: string,
  file: File
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    const timestamp = Date.now();
    const storagePath = `${userId}/background_${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backgrounds')
      .upload(storagePath, file, {
        cacheControl: '0',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, message: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(uploadData.path);

    const publicUrl = `${urlData.publicUrl}?v=${timestamp}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        background_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, message: `Database update failed: ${updateError.message}` };
    }

    return {
      success: true,
      message: 'Background uploaded successfully!',
      url: publicUrl
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export interface BackgroundItem {
  name: string;
  url: string;
  createdAt: string;
}

export async function listUserBackgrounds(userId: string): Promise<BackgroundItem[]> {
  try {
    const { data, error } = await supabase.storage
      .from('backgrounds')
      .list(userId, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('List backgrounds error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter(file => file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.webp'))
      .map(file => {
        const { data: urlData } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(`${userId}/${file.name}`);

        return {
          name: file.name,
          url: urlData.publicUrl,
          createdAt: file.created_at || '',
        };
      });
  } catch (error) {
    console.error('Unexpected error listing backgrounds:', error);
    return [];
  }
}

export async function selectBackground(
  userId: string,
  backgroundUrl: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        background_url: backgroundUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Select background error:', error);
      return { success: false, message: `Failed to select background: ${error.message}` };
    }

    return {
      success: true,
      message: backgroundUrl ? 'Background selected!' : 'Background removed!'
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

export async function deleteBackground(
  userId: string,
  fileName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.storage
      .from('backgrounds')
      .remove([`${userId}/${fileName}`]);

    if (error) {
      console.error('Delete background error:', error);
      return { success: false, message: `Failed to delete: ${error.message}` };
    }

    return {
      success: true,
      message: 'Background deleted!'
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}
