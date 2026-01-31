import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  getLogs,
  getErrors,
  generateDiagnosticsReport,
  loadPersistedLogs,
  setDevMode,
  isDevMode,
  LogEntry,
  DiagnosticsReport,
} from '../utils/telemetry';

interface DiagnosticsContextType {
  isOpen: boolean;
  openDiagnostics: (correlationId?: string) => void;
  closeDiagnostics: () => void;
  focusedCorrelationId: string | null;
  setFocusedCorrelationId: (id: string | null) => void;
  devModeEnabled: boolean;
  toggleDevMode: () => void;
  errorCount: number;
  logs: LogEntry[];
  errors: LogEntry[];
  getReport: () => DiagnosticsReport;
  refreshLogs: () => void;
  lastError: LogEntry | null;
  sessionState: { hasSession: boolean; userId?: string };
  setSessionState: (state: { hasSession: boolean; userId?: string }) => void;
  authConfig: { flowType: string; detectSessionInUrl: boolean; redirectTo?: string };
  setAuthConfig: (config: { flowType: string; detectSessionInUrl: boolean; redirectTo?: string }) => void;
}

const DiagnosticsContext = createContext<DiagnosticsContextType | undefined>(undefined);

interface DiagnosticsProviderProps {
  children: ReactNode;
}

export function DiagnosticsProvider({ children }: DiagnosticsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedCorrelationId, setFocusedCorrelationId] = useState<string | null>(null);
  const [devModeEnabled, setDevModeEnabled] = useState(isDevMode());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [sessionState, setSessionState] = useState<{ hasSession: boolean; userId?: string }>({
    hasSession: false,
  });
  const [authConfig, setAuthConfig] = useState<{
    flowType: string;
    detectSessionInUrl: boolean;
    redirectTo?: string;
  }>({
    flowType: 'pkce',
    detectSessionInUrl: false,
  });

  useEffect(() => {
    loadPersistedLogs().then(() => {
      refreshLogs();
    });
  }, []);

  const refreshLogs = useCallback(() => {
    setLogs(getLogs());
    setErrors(getErrors());
  }, []);

  const openDiagnostics = useCallback((correlationId?: string) => {
    refreshLogs();
    if (correlationId) {
      setFocusedCorrelationId(correlationId);
    }
    setIsOpen(true);
  }, [refreshLogs]);

  const closeDiagnostics = useCallback(() => {
    setIsOpen(false);
    setFocusedCorrelationId(null);
  }, []);

  const toggleDevMode = useCallback(() => {
    const newValue = !devModeEnabled;
    setDevModeEnabled(newValue);
    setDevMode(newValue);
  }, [devModeEnabled]);

  const getReport = useCallback((): DiagnosticsReport => {
    return generateDiagnosticsReport(sessionState, authConfig, focusedCorrelationId || undefined);
  }, [sessionState, authConfig, focusedCorrelationId]);

  const lastError = errors.length > 0 ? errors[errors.length - 1] : null;

  return (
    <DiagnosticsContext.Provider
      value={{
        isOpen,
        openDiagnostics,
        closeDiagnostics,
        focusedCorrelationId,
        setFocusedCorrelationId,
        devModeEnabled,
        toggleDevMode,
        errorCount: errors.length,
        logs,
        errors,
        getReport,
        refreshLogs,
        lastError,
        sessionState,
        setSessionState,
        authConfig,
        setAuthConfig,
      }}
    >
      {children}
    </DiagnosticsContext.Provider>
  );
}

export function useDiagnostics(): DiagnosticsContextType {
  const context = useContext(DiagnosticsContext);
  if (context === undefined) {
    throw new Error('useDiagnostics must be used within a DiagnosticsProvider');
  }
  return context;
}
