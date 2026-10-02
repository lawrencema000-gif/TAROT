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

/** `pathname` is `prefix` or lives under it. */
function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Deep routes that belong to a tab without being its root. The bottom nav
 * lights the parent: every oracle and the tarot library sit under Readings,
 * a blog post under News. Anything not listed here and not a tab root is a
 * route page, and no tab lights for it — the nav used to fall back to Home
 * on every one of them, so "Home" glowed over the runes, the dice, a
 * report and a shared reading.
 */
const TAB_PARENTS: ReadonlyArray<readonly [prefix: string, tab: Tab]> = [
  ['/blog', 'blog'],
  ['/runes', 'readings'],
  ['/dice', 'readings'],
  ['/iching', 'readings'],
  ['/ziwei', 'readings'],
  ['/mansions', 'readings'],
  ['/good-days', 'readings'],
  ['/celestial-map', 'readings'],
  ['/spreads', 'readings'],
  ['/tarot-meanings', 'readings'],
  ['/pick-a-card', 'readings'],
  ['/cartomancy', 'readings'],
];

/**
 * Route pages reached from the More menu. They are not tabs, so no tab
 * lights for them — the More button does. The social tabs are listed too:
 * they are tabs only while their flag is on, and the URL works either way.
 */
const MORE_GROUP_ROUTES: readonly string[] = [
  '/community',
  '/whispering-well',
  '/companion',
  '/wishing-sky',
  '/love-tree',
  '/soulmate-score',
  '/people',
  '/charts',
];

/** True when the pathname is one of the bottom-nav tab roots. Deep pages
 *  (/people/:id, /pick-a-card, /reports/*, …) return false — the Android
 *  hardware-back handler uses this to go BACK instead of exiting the app. */
export function isTabRoot(pathname: string): boolean {
  return pathname in ROUTE_TO_TAB;
}

/** The tab a path belongs to, or null for a route page that belongs to none. */
export function resolveTab(pathname: string): Tab | null {
  if (ROUTE_TO_TAB[pathname]) return ROUTE_TO_TAB[pathname];
  for (const [prefix, tab] of TAB_PARENTS) {
    if (under(pathname, prefix)) return tab;
  }
  return null;
}

/** True when the path is one the More menu leads to. */
export function isMoreGroupRoute(pathname: string): boolean {
  return MORE_GROUP_ROUTES.some((prefix) => under(pathname, prefix));
}

interface UIContextType {
  /** The lit tab. Null on a route page that belongs to no tab. */
  activeTab: Tab | null;
  setActiveTab: (tab: Tab) => void;
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTabState] = useState<Tab | null>(() => resolveTab(location.pathname));
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);

  // Sync tab state when browser back/forward changes URL
  useEffect(() => {
    setActiveTabState(resolveTab(location.pathname));
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
