import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Tab } from '../types';

export type OverlayType = 'search' | 'saved' | 'settings' | null;

const TAB_ROUTES: Record<Tab, string> = {
  home: '/',
  readings: '/readings',
  quizzes: '/quizzes',
  horoscope: '/horoscope',
  achievements: '/achievements',
  journal: '/journal',
  profile: '/profile',
  admin: '/admin',
};

const ROUTE_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab as Tab])
) as Record<string, Tab>;

interface UIContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabFromUrl = ROUTE_TO_TAB[location.pathname] || 'home';
  const [activeTab, setActiveTabState] = useState<Tab>(tabFromUrl);
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

  // Sync tab state when browser back/forward changes URL
  useEffect(() => {
    const tab = ROUTE_TO_TAB[location.pathname] || 'home';
    setActiveTabState(tab);
  }, [location.pathname]);

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    navigate(TAB_ROUTES[tab]);
  }, [navigate]);

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
