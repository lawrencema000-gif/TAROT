import { createContext, useContext, useState, useCallback } from 'react';
import type { Tab } from '../types';

export type OverlayType = 'search' | 'saved' | 'settings' | null;

interface UIContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

  const openOverlay = useCallback((overlay: OverlayType) => {
    setActiveOverlay(overlay);
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  return (
    <UIContext.Provider value={{
      activeTab,
      setActiveTab,
      activeOverlay,
      openOverlay,
      closeOverlay,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
