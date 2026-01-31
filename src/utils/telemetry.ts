import { Preferences } from '@capacitor/preferences';
import { getPlatform, isNative } from './platform';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  correlationId: string;
  level: LogLevel;
  step: string;
  message: string;
  timestamp: number;
  elapsed?: number;
  data?: Record<string, unknown>;
  stackTrace?: string;
  platform: string;
}

export interface Span {
  id: string;
  name: string;
  startTime: number;
  correlationId: string;
  data?: Record<string, unknown>;
}

export interface DiagnosticsReport {
  generatedAt: string;
  platform: string;
  correlationId?: string;
  sessionState: {
    hasSession: boolean;
    userId?: string;
  };
  authConfig: {
    flowType: string;
    detectSessionInUrl: boolean;
    redirectTo?: string;
  };
  recentLogs: LogEntry[];
  errors: LogEntry[];
}

const STORAGE_KEY = 'arcana-diagnostics-logs';
const MAX_MEMORY_LOGS = 200;
const MAX_PERSISTED_LOGS = 50;

let memoryLogs: LogEntry[] = [];
let currentCorrelationId: string | null = null;
let devMode = import.meta.env.DEV;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCorrelationId(prefix = 'auth'): string {
  currentCorrelationId = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return currentCorrelationId;
}

export function getCurrentCorrelationId(): string | null {
  return currentCorrelationId;
}

export function setCorrelationId(id: string | null): void {
  currentCorrelationId = id;
}

export function setDevMode(enabled: boolean): void {
  devMode = enabled;
}

export function isDevMode(): boolean {
  return devMode;
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['code', 'access_token', 'refresh_token', 'token', 'state', 'code_verifier'];

    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        const value = parsed.searchParams.get(param) || '';
        parsed.searchParams.set(param, value.length > 0 ? `[REDACTED:${value.length}chars]` : '[EMPTY]');
      }
    });

    const hashParams = new URLSearchParams(parsed.hash.replace('#', ''));
    let sanitizedHash = '';
    if (hashParams.toString()) {
      sensitiveParams.forEach(param => {
        if (hashParams.has(param)) {
          const value = hashParams.get(param) || '';
          hashParams.set(param, value.length > 0 ? `[REDACTED:${value.length}chars]` : '[EMPTY]');
        }
      });
      sanitizedHash = '#' + hashParams.toString();
    }

    return `${parsed.origin}${parsed.pathname}${parsed.search}${sanitizedHash}`;
  } catch {
    return '[INVALID_URL]';
  }
}

export function sanitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return '[INVALID_EMAIL]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'access_token', 'refresh_token', 'token', 'code', 'code_verifier',
    'password', 'secret', 'apiKey', 'api_key', 'authorization'
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = `[REDACTED:${value.length}chars]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (lowerKey === 'email' && typeof value === 'string') {
      sanitized[key] = devMode ? value : sanitizeEmail(value);
    } else if (lowerKey === 'url' && typeof value === 'string') {
      sanitized[key] = sanitizeUrl(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function createLogEntry(
  level: LogLevel,
  step: string,
  message: string,
  data?: Record<string, unknown>,
  stackTrace?: string,
  elapsed?: number
): LogEntry {
  return {
    id: generateId(),
    correlationId: currentCorrelationId || 'no-correlation',
    level,
    step,
    message,
    timestamp: Date.now(),
    elapsed,
    data: data ? sanitizeData(data) : undefined,
    stackTrace: devMode ? stackTrace : undefined,
    platform: getPlatform(),
  };
}

function addLog(entry: LogEntry): void {
  memoryLogs.push(entry);

  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs = memoryLogs.slice(-MAX_MEMORY_LOGS);
  }

  if (devMode) {
    const style = entry.level === 'error'
      ? 'color: #ef4444; font-weight: bold'
      : entry.level === 'warn'
        ? 'color: #f59e0b; font-weight: bold'
        : 'color: #6b7280';

    console.log(
      `%c[${entry.level.toUpperCase()}] [${entry.correlationId}] ${entry.step}: ${entry.message}`,
      style,
      entry.data || ''
    );
  }

  persistLogsAsync();
}

async function persistLogsAsync(): Promise<void> {
  try {
    const toPersist = memoryLogs.slice(-MAX_PERSISTED_LOGS);
    const json = JSON.stringify(toPersist);

    if (isNative()) {
      await Preferences.set({ key: STORAGE_KEY, value: json });
    } else {
      localStorage.setItem(STORAGE_KEY, json);
    }
  } catch (e) {
    console.warn('[Telemetry] Failed to persist logs:', e);
  }
}

export async function loadPersistedLogs(): Promise<void> {
  try {
    let json: string | null = null;

    if (isNative()) {
      const result = await Preferences.get({ key: STORAGE_KEY });
      json = result.value;
    } else {
      json = localStorage.getItem(STORAGE_KEY);
    }

    if (json) {
      const persisted = JSON.parse(json) as LogEntry[];
      memoryLogs = [...persisted, ...memoryLogs].slice(-MAX_MEMORY_LOGS);
    }
  } catch (e) {
    console.warn('[Telemetry] Failed to load persisted logs:', e);
  }
}

export function logInfo(step: string, message: string, data?: Record<string, unknown>): void {
  addLog(createLogEntry('info', step, message, data));
}

export function logWarn(step: string, message: string, data?: Record<string, unknown>): void {
  addLog(createLogEntry('warn', step, message, data));
}

export function logError(step: string, message: string, data?: Record<string, unknown>, error?: Error): void {
  addLog(createLogEntry('error', step, message, data, error?.stack));
}

export function captureException(step: string, error: unknown, data?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const errorData = {
    ...data,
    errorName: err.name,
    errorMessage: err.message,
  };
  addLog(createLogEntry('error', step, err.message, errorData, err.stack));
}

export function startSpan(name: string, data?: Record<string, unknown>): Span {
  const span: Span = {
    id: generateId(),
    name,
    startTime: performance.now(),
    correlationId: currentCorrelationId || 'no-correlation',
    data,
  };

  logInfo(name, `Started: ${name}`, data);
  return span;
}

export function endSpan(span: Span, result?: 'success' | 'failure', data?: Record<string, unknown>): number {
  const elapsed = Math.round(performance.now() - span.startTime);
  const message = result === 'failure'
    ? `Failed: ${span.name} (${elapsed}ms)`
    : `Completed: ${span.name} (${elapsed}ms)`;

  const level = result === 'failure' ? 'error' : 'info';
  addLog(createLogEntry(level, span.name, message, { ...span.data, ...data }, undefined, elapsed));

  return elapsed;
}

export function getLogs(): LogEntry[] {
  return [...memoryLogs];
}

export function getLogsByCorrelationId(correlationId: string): LogEntry[] {
  return memoryLogs.filter(log => log.correlationId === correlationId);
}

export function getErrors(): LogEntry[] {
  return memoryLogs.filter(log => log.level === 'error');
}

export function getRecentErrors(count = 10): LogEntry[] {
  return getErrors().slice(-count);
}

export function clearLogs(): void {
  memoryLogs = [];
  persistLogsAsync();
}

export function generateDiagnosticsReport(
  sessionState: { hasSession: boolean; userId?: string },
  authConfig: { flowType: string; detectSessionInUrl: boolean; redirectTo?: string },
  correlationId?: string
): DiagnosticsReport {
  const logs = correlationId
    ? getLogsByCorrelationId(correlationId)
    : getLogs().slice(-50);

  return {
    generatedAt: new Date().toISOString(),
    platform: getPlatform(),
    correlationId,
    sessionState: {
      hasSession: sessionState.hasSession,
      userId: sessionState.userId ? sanitizeEmail(sessionState.userId) : undefined,
    },
    authConfig,
    recentLogs: logs,
    errors: getErrors().slice(-20),
  };
}

export function formatReportForClipboard(report: DiagnosticsReport): string {
  const separator = '='.repeat(50);

  let output = `ARCANA DIAGNOSTICS REPORT
${separator}
Generated: ${report.generatedAt}
Platform: ${report.platform}
${report.correlationId ? `Correlation ID: ${report.correlationId}` : ''}

SESSION STATE
${separator}
Has Session: ${report.sessionState.hasSession}
${report.sessionState.userId ? `User: ${report.sessionState.userId}` : ''}

AUTH CONFIGURATION
${separator}
Flow Type: ${report.authConfig.flowType}
Detect Session In URL: ${report.authConfig.detectSessionInUrl}
${report.authConfig.redirectTo ? `Redirect To: ${report.authConfig.redirectTo}` : ''}

RECENT LOGS (${report.recentLogs.length})
${separator}
`;

  report.recentLogs.forEach(log => {
    const time = new Date(log.timestamp).toISOString();
    const elapsed = log.elapsed ? ` [${log.elapsed}ms]` : '';
    output += `[${log.level.toUpperCase()}] ${time}${elapsed}\n`;
    output += `  ${log.step}: ${log.message}\n`;
    if (log.data) {
      output += `  Data: ${JSON.stringify(log.data, null, 2).split('\n').join('\n  ')}\n`;
    }
    output += '\n';
  });

  if (report.errors.length > 0) {
    output += `\nERRORS (${report.errors.length})\n${separator}\n`;
    report.errors.forEach(log => {
      const time = new Date(log.timestamp).toISOString();
      output += `[${time}] ${log.step}: ${log.message}\n`;
      if (log.stackTrace) {
        output += `Stack: ${log.stackTrace}\n`;
      }
      output += '\n';
    });
  }

  return output;
}

export function copyReportToClipboard(report: DiagnosticsReport): Promise<void> {
  const text = formatReportForClipboard(report);
  return navigator.clipboard.writeText(text);
}

export function exportReportAsJson(report: DiagnosticsReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arcana-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createDiagnosticsAction(correlationId?: string): { label: string; onClick: () => void } {
  return {
    label: 'View details',
    onClick: () => {
      import('../context/DiagnosticsContext').then(({ openGlobalDiagnostics }) => {
        openGlobalDiagnostics(correlationId || currentCorrelationId || undefined);
      });
    },
  };
}
