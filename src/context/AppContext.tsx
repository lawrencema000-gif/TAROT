import { UIProvider, useUI } from './UIContext';
import { RitualProvider, useRitual } from './RitualContext';
import { GamificationProvider, useGamification } from './GamificationContext';

// Re-export types for backwards compatibility
export type { OverlayType } from './UIContext';
export type { LevelUpEvent } from './GamificationContext';

/**
 * Composed provider — wraps UIContext + RitualContext + GamificationContext.
 * Each context re-renders only its own consumers, avoiding the "everything
 * re-renders on any state change" problem of the old monolithic context.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <RitualProvider>
        <GamificationProvider>
          {children}
        </GamificationProvider>
      </RitualProvider>
    </UIProvider>
  );
}

/**
 * Backwards-compatible hook — merges all three contexts.
 * Prefer using useUI(), useRitual(), or useGamification() directly
 * in new code for more granular re-render control.
 */
export function useApp() {
  const ui = useUI();
  const ritual = useRitual();
  const gamification = useGamification();

  return {
    ...ui,
    ...ritual,
    ...gamification,
  };
}
