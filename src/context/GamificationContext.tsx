import { createContext, useContext, useState, useCallback } from 'react';

export interface LevelUpEvent {
  newLevel: number;
  seekerRank: string;
  xpEarned: number;
}

interface GamificationContextType {
  levelUpEvent: LevelUpEvent | null;
  triggerLevelUp: (event: LevelUpEvent) => void;
  dismissLevelUp: () => void;
  showRatePrompt: boolean;
  openRatePrompt: () => void;
  closeRatePrompt: () => void;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [showRatePrompt, setShowRatePrompt] = useState(false);

  const triggerLevelUp = useCallback((event: LevelUpEvent) => {
    setLevelUpEvent(event);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  const openRatePrompt = useCallback(() => {
    setShowRatePrompt(true);
  }, []);

  const closeRatePrompt = useCallback(() => {
    setShowRatePrompt(false);
  }, []);

  return (
    <GamificationContext.Provider value={{
      levelUpEvent,
      triggerLevelUp,
      dismissLevelUp,
      showRatePrompt,
      openRatePrompt,
      closeRatePrompt,
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}
