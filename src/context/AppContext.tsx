import { createContext, useContext, useState, useCallback } from 'react';
import type { Tab, DailyHoroscope, TarotReading, JournalEntry } from '../types';

export type OverlayType = 'search' | 'saved' | 'settings' | null;

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
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
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
  tarotRefreshTrigger: number;
  refreshTarotCards: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [todayHoroscope, setTodayHoroscope] = useState<DailyHoroscope | null>(null);
  const [todayTarot, setTodayTarot] = useState<TarotReading | null>(null);
  const [todayJournalEntry, setTodayJournalEntry] = useState<JournalEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [ritualCompleted, setRitualCompleted] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [tarotRefreshTrigger, setTarotRefreshTrigger] = useState(0);

  const completeRitual = useCallback(() => {
    setRitualCompleted(true);
  }, []);

  const openOverlay = useCallback((overlay: OverlayType) => {
    setActiveOverlay(overlay);
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  const refreshTarotCards = useCallback(() => {
    setTarotRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
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
      activeOverlay,
      openOverlay,
      closeOverlay,
      tarotRefreshTrigger,
      refreshTarotCards,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
