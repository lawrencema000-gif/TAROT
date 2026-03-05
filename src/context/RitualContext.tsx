import { createContext, useContext, useState, useCallback } from 'react';
import type { DailyHoroscope, TarotReading, JournalEntry } from '../types';

interface RitualContextType {
  todayHoroscope: DailyHoroscope | null;
  setTodayHoroscope: (horoscope: DailyHoroscope | null) => void;
  todayTarot: TarotReading | null;
  setTodayTarot: (reading: TarotReading | null) => void;
  todayJournalEntry: JournalEntry | null;
  setTodayJournalEntry: (entry: JournalEntry | null) => void;
  streak: number;
  setStreak: (streak: number) => void;
  ritualCompleted: boolean;
  completeRitual: () => void;
  tarotRefreshTrigger: number;
  refreshTarotCards: () => void;
}

const RitualContext = createContext<RitualContextType | null>(null);

export function RitualProvider({ children }: { children: React.ReactNode }) {
  const [todayHoroscope, setTodayHoroscope] = useState<DailyHoroscope | null>(null);
  const [todayTarot, setTodayTarot] = useState<TarotReading | null>(null);
  const [todayJournalEntry, setTodayJournalEntry] = useState<JournalEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [ritualCompleted, setRitualCompleted] = useState(false);
  const [tarotRefreshTrigger, setTarotRefreshTrigger] = useState(0);

  const completeRitual = useCallback(() => {
    setRitualCompleted(true);
  }, []);

  const refreshTarotCards = useCallback(() => {
    setTarotRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <RitualContext.Provider value={{
      todayHoroscope,
      setTodayHoroscope,
      todayTarot,
      setTodayTarot,
      todayJournalEntry,
      setTodayJournalEntry,
      streak,
      setStreak,
      ritualCompleted,
      completeRitual,
      tarotRefreshTrigger,
      refreshTarotCards,
    }}>
      {children}
    </RitualContext.Provider>
  );
}

export function useRitual() {
  const context = useContext(RitualContext);
  if (!context) {
    throw new Error('useRitual must be used within RitualProvider');
  }
  return context;
}
