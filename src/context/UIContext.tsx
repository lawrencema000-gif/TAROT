import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
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
  blog: '/blog',
  profile: '/profile',
  admin: '/admin',
  community: '/community',
  'whispering-well': '/whispering-well',
  companion: '/companion',
  advisors: '/advisors',
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

  const resolveTab = (pathname: string): Tab => {
    if (ROUTE_TO_TAB[pathname]) return ROUTE_TO_TAB[pathname];
    if (pathname.startsWith('/blog/')) return 'blog';
    return 'home';
  };

  const tabFromUrl = resolveTab(location.pathname);
  const [activeTab, setActiveTabState] = useState<Tab>(tabFromUrl);
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

  // Sync tab state when browser back/forward changes URL
  useEffect(() => {
    const tab = resolveTab(location.pathname);
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

  const value = useMemo(() => ({
    activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay,
  }), [activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay]);

  return (
    <UIContext.Provider value={value}>
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
