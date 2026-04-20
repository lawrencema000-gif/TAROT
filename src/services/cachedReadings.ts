import { dailyReadingsCache, premiumReadings } from '../dal';
import type { ZodiacSign, Goal } from '../types';
import { generateDailyReading, type DailyReading } from './dailyContent';

export interface CachedReading extends DailyReading {
  cached: boolean;
}

export async function getCachedDailyReading(
  sign: ZodiacSign,
  date: string
): Promise<CachedReading> {
  const cachedRes = await dailyReadingsCache.getBySignAndDate<DailyReading>(sign, date);
  if (cachedRes.ok && cachedRes.data) {
    return { ...cachedRes.data, cached: true };
  }

  const reading = generateDailyReading({ sign, date });

  dailyReadingsCache.insertManyDetached([{ sign, date, content: reading }]);

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

  const cachedRes = await dailyReadingsCache.listByDate<DailyReading>(date);

  const readings = new Map<ZodiacSign, DailyReading>();
  const cachedSigns = new Set<string>();

  if (cachedRes.ok) {
    cachedRes.data.forEach(c => {
      readings.set(c.sign, c.content);
      cachedSigns.add(c.sign);
    });
  }

  const uncachedSigns = signs.filter(s => !cachedSigns.has(s));
  const newReadings: { sign: string; date: string; content: DailyReading }[] = [];

  for (const sign of uncachedSigns) {
    const reading = generateDailyReading({ sign, date });
    readings.set(sign, reading);
    newReadings.push({ sign, date, content: reading });
  }

  if (newReadings.length > 0) {
    dailyReadingsCache.insertManyDetached(newReadings);
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
  const res = await premiumReadings.insert({
    userId,
    readingType,
    content,
    context,
    cards,
  });
  if (!res.ok) return null;
  return res.data;
}

export async function getUserPremiumReadings(
  userId: string,
  limit = 20
): Promise<PremiumReading[]> {
  const res = await premiumReadings.listForUser(userId, limit);
  return res.ok ? res.data : [];
}

export async function getPremiumReadingById(
  userId: string,
  readingId: string
): Promise<PremiumReading | null> {
  const res = await premiumReadings.getById(userId, readingId);
  return res.ok ? res.data : null;
}

export async function deletePremiumReading(
  userId: string,
  readingId: string
): Promise<boolean> {
  const res = await premiumReadings.deleteById(userId, readingId);
  return res.ok;
}

export async function cleanupOldCache(daysToKeep = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  await dailyReadingsCache.deleteOlderThan(cutoffStr);
}
