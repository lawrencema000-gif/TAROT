import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trash2,
  Clock,
  Bug,
  CheckCircle,
  Smartphone,
  Globe,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, toast } from '../ui';
import { useDiagnostics } from '../../context/DiagnosticsContext';
import {
  copyReportToClipboard,
  exportReportAsJson,
  clearLogs,
  LogEntry,
} from '../../utils/telemetry';
import { getPlatform } from '../../utils/platform';

interface DiagnosticsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function DiagnosticsSheet({ open, onClose }: DiagnosticsSheetProps) {
  const {
    logs,
    errors,
    focusedCorrelationId,
    setFocusedCorrelationId,
    devModeEnabled,
    toggleDevMode,
    getReport,
    refreshLogs,
    sessionState,
    authConfig,
  } = useDiagnostics();

  const [activeTab, setActiveTab] = useState<'logs' | 'errors' | 'config'>('logs');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'auth' | 'errors'>('all');

  const filteredLogs = useMemo(() => {
    let result = focusedCorrelationId
      ? logs.filter(log => log.correlationId === focusedCorrelationId)
      : logs;

    if (filter === 'auth') {
      result = result.filter(log => log.step.startsWith('auth.'));
    } else if (filter === 'errors') {
      result = result.filter(log => log.level === 'error');
    }

    return result.slice(-100).reverse();
  }, [logs, focusedCorrelationId, filter]);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleCopyReport = async () => {
    try {
      const report = getReport();
      await copyReportToClipboard(report);
      toast('Diagnostics copied to clipboard', 'success');
    } catch {
      toast('Failed to copy diagnostics', 'error');
    }
  };

  const handleExportJson = () => {
    try {
      const report = getReport();
      exportReportAsJson(report);
      toast('Diagnostics exported', 'success');
    } catch {
      toast('Failed to export diagnostics', 'error');
    }
  };

  const handleClearLogs = () => {
    clearLogs();
    refreshLogs();
    toast('Logs cleared', 'success');
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-coral" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-gold" />;
      default:
        return <Info className="w-4 h-4 text-cosmic-blue" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions);
  };

  const correlationIds = useMemo(() => {
    const ids = new Set<string>();
    logs.forEach(log => {
      if (log.correlationId && log.correlationId !== 'no-correlation') {
        ids.add(log.correlationId);
      }
    });
    return Array.from(ids).slice(-10).reverse();
  }, [logs]);

  return (
    <Sheet open={open} onClose={onClose} title="Developer Diagnostics">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-mystic-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            {getPlatform() === 'web' ? (
              <Globe className="w-4 h-4 text-cosmic-blue" />
            ) : (
              <Smartphone className="w-4 h-4 text-cosmic-blue" />
            )}
            <span className="text-sm text-mystic-300">{getPlatform()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-mystic-500">Dev Mode</span>
            <button
              onClick={toggleDevMode}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                devModeEnabled ? 'bg-gold' : 'bg-mystic-700'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  devModeEnabled ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 bg-mystic-800/30 rounded-xl">
          <div className="text-center">
            <div className="text-lg font-semibold text-mystic-100">{logs.length}</div>
            <div className="text-xs text-mystic-500">Total Logs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-coral">{errors.length}</div>
            <div className="text-xs text-mystic-500">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-mystic-100">
              {sessionState.hasSession ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
              ) : (
                <AlertCircle className="w-5 h-5 text-mystic-500 mx-auto" />
              )}
            </div>
            <div className="text-xs text-mystic-500">Session</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'logs' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </Button>
          <Button
            variant={activeTab === 'errors' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('errors')}
          >
            Errors ({errors.length})
          </Button>
          <Button
            variant={activeTab === 'config' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('config')}
          >
            Config
          </Button>
        </div>

        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="px-3 py-1.5 bg-mystic-800 border border-mystic-700 rounded-lg text-sm text-mystic-200 focus:outline-none focus:border-gold/50"
              >
                <option value="all">All Logs</option>
                <option value="auth">Auth Only</option>
                <option value="errors">Errors Only</option>
              </select>

              {correlationIds.length > 0 && (
                <select
                  value={focusedCorrelationId || ''}
                  onChange={(e) => setFocusedCorrelationId(e.target.value || null)}
                  className="px-3 py-1.5 bg-mystic-800 border border-mystic-700 rounded-lg text-sm text-mystic-200 focus:outline-none focus:border-gold/50 max-w-[200px]"
                >
                  <option value="">All Sessions</option>
                  {correlationIds.map(id => (
                    <option key={id} value={id}>
                      {id.substring(0, 20)}...
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={refreshLogs}
                className="p-1.5 bg-mystic-800 border border-mystic-700 rounded-lg hover:bg-mystic-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-mystic-400" />
              </button>
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-mystic-500">
                  <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logs yet</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border transition-colors ${
                      log.level === 'error'
                        ? 'bg-coral/10 border-coral/20'
                        : log.level === 'warn'
                          ? 'bg-gold/10 border-gold/20'
                          : 'bg-mystic-800/30 border-mystic-700/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleLogExpand(log.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-2">
                        {getLogIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-mystic-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            {log.elapsed && (
                              <span className="text-xs text-mystic-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {log.elapsed}ms
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-mystic-200 font-medium truncate">
                            {log.step}
                          </p>
                          <p className="text-xs text-mystic-400 truncate">
                            {log.message}
                          </p>
                        </div>
                        {(log.data || log.stackTrace) && (
                          expandedLogs.has(log.id) ? (
                            <ChevronDown className="w-4 h-4 text-mystic-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0" />
                          )
                        )}
                      </div>
                    </button>

                    {expandedLogs.has(log.id) && (
                      <div className="mt-2 pt-2 border-t border-mystic-700/50">
                        {log.correlationId && log.correlationId !== 'no-correlation' && (
                          <div className="mb-2">
                            <span className="text-xs text-mystic-500">Correlation ID: </span>
                            <span className="text-xs font-mono text-mystic-300">
                              {log.correlationId}
                            </span>
                          </div>
                        )}
                        {log.data && (
                          <pre className="text-xs font-mono text-mystic-300 bg-mystic-900/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                        {devModeEnabled && log.stackTrace && (
                          <pre className="mt-2 text-xs font-mono text-coral/80 bg-coral/5 p-2 rounded overflow-x-auto">
                            {log.stackTrace}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-mystic-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                <p className="text-sm">No errors recorded</p>
              </div>
            ) : (
              errors.slice(-20).reverse().map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-coral/10 border border-coral/20"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-mystic-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-coral font-medium">{log.step}</p>
                      <p className="text-sm text-mystic-300 mt-1">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 text-xs font-mono text-mystic-400 bg-mystic-900/50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                      {devModeEnabled && log.stackTrace && (
                        <pre className="mt-2 text-xs font-mono text-coral/70 bg-coral/5 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {log.stackTrace}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-3">
            <div className="p-3 bg-mystic-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-mystic-200 mb-2">Auth Configuration</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-mystic-500">Flow Type</span>
                  <span className="text-mystic-300 font-mono">{authConfig.flowType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mystic-500">Detect Session In URL</span>
                  <span className="text-mystic-300 font-mono">
                    {String(authConfig.detectSessionInUrl)}
                  </span>
                </div>
                {authConfig.redirectTo && (
                  <div className="flex justify-between">
                    <span className="text-mystic-500">Redirect To</span>
                    <span className="text-mystic-300 font-mono truncate max-w-[200px]">
                      {authConfig.redirectTo}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-mystic-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-mystic-200 mb-2">Session State</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-mystic-500">Has Session</span>
                  <span className={`font-mono ${sessionState.hasSession ? 'text-emerald-500' : 'text-coral'}`}>
                    {String(sessionState.hasSession)}
                  </span>
                </div>
                {sessionState.userId && (
                  <div className="flex justify-between">
                    <span className="text-mystic-500">User ID</span>
                    <span className="text-mystic-300 font-mono truncate max-w-[150px]">
                      {sessionState.userId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-mystic-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-mystic-200 mb-2">Environment</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-mystic-500">Platform</span>
                  <span className="text-mystic-300 font-mono">{getPlatform()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mystic-500">Dev Mode</span>
                  <span className={`font-mono ${devModeEnabled ? 'text-gold' : 'text-mystic-500'}`}>
                    {String(devModeEnabled)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-4 border-t border-mystic-800">
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={handleCopyReport}
            >
              <Copy className="w-4 h-4" />
              Copy Diagnostics
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={handleExportJson}
            >
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={handleClearLogs}
            className="text-coral hover:bg-coral/10"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

interface CompactErrorDisplayProps {
  message: string;
  hint?: string;
  likelyCause?: string;
  onViewDetails: () => void;
}

export function CompactErrorDisplay({ message, hint, likelyCause, onViewDetails }: CompactErrorDisplayProps) {
  return (
    <div className="p-4 bg-coral/10 border border-coral/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-coral">{message}</p>
          {hint && (
            <p className="text-xs text-mystic-400 mt-1">{hint}</p>
          )}
          {likelyCause && (
            <p className="text-xs text-mystic-500 mt-1 italic">
              Likely cause: {likelyCause}
            </p>
          )}
          <button
            onClick={onViewDetails}
            className="mt-2 text-xs text-cosmic-blue hover:text-cosmic-blue/80 transition-colors"
          >
            View diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
