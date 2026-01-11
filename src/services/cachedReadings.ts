import { supabase } from '../lib/supabase';
import type { ZodiacSign, Goal } from '../types';
import { generateDailyReading, type DailyReading } from './dailyContent';

export interface CachedReading extends DailyReading {
  cached: boolean;
}

export async function getCachedDailyReading(
  sign: ZodiacSign,
  date: string
): Promise<CachedReading> {
  const { data: cached } = await supabase
    .from('daily_readings_cache')
    .select('content')
    .eq('sign', sign)
    .eq('date', date)
    .maybeSingle();

  if (cached?.content) {
    return { ...(cached.content as DailyReading), cached: true };
  }

  const reading = generateDailyReading({ sign, date });

  supabase
    .from('daily_readings_cache')
    .insert({ sign, date, content: reading })
    .then(() => {});

  return { ...reading, cached: false };
}

export async function getDailyReadingWithGoals(
  sign: ZodiacSign,
  date: string,
  goals: Goal[]
): Promise<DailyReading> {
  const reading = generateDailyReading({ sign, date, goals });
  return reading;
}

export async function getAllSignsDaily(date: string): Promise<Map<ZodiacSign, DailyReading>> {
  const signs: ZodiacSign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  const { data: cached } = await supabase
    .from('daily_readings_cache')
    .select('sign, content')
    .eq('date', date);

  const readings = new Map<ZodiacSign, DailyReading>();
  const cachedSigns = new Set(cached?.map(c => c.sign) || []);

  cached?.forEach(c => {
    readings.set(c.sign as ZodiacSign, c.content as DailyReading);
  });

  const uncachedSigns = signs.filter(s => !cachedSigns.has(s));
  const newReadings: { sign: string; date: string; content: DailyReading }[] = [];

  for (const sign of uncachedSigns) {
    const reading = generateDailyReading({ sign, date });
    readings.set(sign, reading);
    newReadings.push({ sign, date, content: reading });
  }

  if (newReadings.length > 0) {
    supabase.from('daily_readings_cache').insert(newReadings).then(() => {});
  }

  return readings;
}

export interface PremiumReading {
  id: string;
  userId: string;
  readingType: string;
  context: Record<string, unknown>;
  content: string;
  cards: { id: number; name: string; reversed: boolean }[];
  createdAt: string;
}

export async function savePremiumReading(
  userId: string,
  readingType: string,
  content: string,
  context: Record<string, unknown> = {},
  cards: { id: number; name: string; reversed: boolean }[] = []
): Promise<PremiumReading | null> {
  const { data, error } = await supabase
    .from('premium_readings')
    .insert({
      user_id: userId,
      reading_type: readingType,
      content,
      context,
      cards,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error saving premium reading:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    readingType: data.reading_type,
    context: data.context,
    content: data.content,
    cards: data.cards,
    createdAt: data.created_at,
  };
}

export async function getUserPremiumReadings(
  userId: string,
  limit = 20
): Promise<PremiumReading[]> {
  const { data, error } = await supabase
    .from('premium_readings')
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
    readingType: r.reading_type,
    context: r.context,
    content: r.content,
    cards: r.cards,
    createdAt: r.created_at,
  }));
}

export async function getPremiumReadingById(
  userId: string,
  readingId: string
): Promise<PremiumReading | null> {
  const { data, error } = await supabase
    .from('premium_readings')
    .select('*')
    .eq('id', readingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    readingType: data.reading_type,
    context: data.context,
    content: data.content,
    cards: data.cards,
    createdAt: data.created_at,
  };
}

export async function deletePremiumReading(
  userId: string,
  readingId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('premium_readings')
    .delete()
    .eq('id', readingId)
    .eq('user_id', userId);

  return !error;
}

export async function cleanupOldCache(daysToKeep = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  await supabase
    .from('daily_readings_cache')
    .delete()
    .lt('date', cutoffStr);
}
