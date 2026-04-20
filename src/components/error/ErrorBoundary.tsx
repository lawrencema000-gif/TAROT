import { Component, type ReactNode, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Moon, Bug, Copy, CheckCircle } from 'lucide-react';
import { captureException, generateCorrelationId, getCurrentCorrelationId, isDevMode } from '../../utils/telemetry';
import { useT } from '../../i18n/useT';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onOpenDiagnostics?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  correlationId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, correlationId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const correlationId = getCurrentCorrelationId() || generateCorrelationId('render-error');

    captureException('render.error', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo, correlationId });

    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, correlationId: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleOpenDiagnostics = () => {
    this.props.onOpenDiagnostics?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <MysticErrorFallback
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onOpenDiagnostics={this.props.onOpenDiagnostics ? this.handleOpenDiagnostics : undefined}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          correlationId={this.state.correlationId}
        />
      );
    }

    return this.props.children;
  }
}

interface MysticErrorFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  onOpenDiagnostics?: () => void;
  title?: string;
  message?: string;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
  correlationId?: string | null;
}

export function MysticErrorFallback({
  onRetry,
  onGoHome,
  onOpenDiagnostics,
  title,
  message,
  error,
  errorInfo,
  correlationId,
}: MysticErrorFallbackProps) {
  const { t } = useT('app');
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayTitle = title ?? t('errorBoundary.title');
  const displayMessage = message ?? t('errorBoundary.message');

  const handleCopyError = async () => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      correlationId,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy error');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative bg-gradient-to-br from-mystic-900 to-mystic-950 rounded-full w-32 h-32 mx-auto flex items-center justify-center border border-mystic-700/30">
            <div className="relative">
              <Moon className="w-12 h-12 text-gold/50 absolute -top-2 -right-2" />
              <AlertTriangle className="w-14 h-14 text-gold" />
            </div>
          </div>
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-gold rounded-full animate-pulse" />
          <div className="absolute bottom-4 right-1/4 w-1.5 h-1.5 bg-gold/70 rounded-full animate-pulse delay-300" />
          <div className="absolute top-1/3 right-1/5 w-1 h-1 bg-gold/60 rounded-full animate-pulse delay-700" />
        </div>

        <h2 className="text-2xl font-serif text-mystic-100 mb-3">{displayTitle}</h2>
        <p className="text-mystic-400 mb-8 leading-relaxed">{displayMessage}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gold text-mystic-950 rounded-xl font-medium hover:bg-gold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('errorBoundary.tryAgain')}
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-mystic-800 text-mystic-100 rounded-xl font-medium hover:bg-mystic-700 transition-colors border border-mystic-700/30"
            >
              <Home className="w-4 h-4" />
              {t('errorBoundary.returnHome')}
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="flex items-center gap-1.5 text-xs text-mystic-500 hover:text-mystic-300 transition-colors"
            >
              <Bug className="w-3.5 h-3.5" />
              {t('errorBoundary.viewDiagnostics')}
            </button>
          )}
          {(isDevMode() || error) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-mystic-500 hover:text-mystic-300 transition-colors"
            >
              {showDetails ? t('errorBoundary.hideDetails') : t('errorBoundary.showDetails')}
            </button>
          )}
        </div>

        {showDetails && error && (
          <div className="mt-4 text-left bg-mystic-900/80 border border-mystic-700/30 rounded-xl p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-mystic-500">{t('errorBoundary.errorDetails')}</span>
              <button
                onClick={handleCopyError}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    {t('errorBoundary.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    {t('errorBoundary.copy')}
                  </>
                )}
              </button>
            </div>
            {correlationId && (
              <p className="text-xs text-mystic-500 mb-2 font-mono">
                ID: {correlationId}
              </p>
            )}
            <p className="text-sm text-coral font-medium mb-2">{error.message}</p>
            {isDevMode() && error.stack && (
              <pre className="text-xs text-mystic-500 overflow-x-auto whitespace-pre-wrap max-h-40">
                {error.stack}
              </pre>
            )}
            {isDevMode() && errorInfo?.componentStack && (
              <pre className="mt-2 text-xs text-mystic-600 overflow-x-auto whitespace-pre-wrap max-h-32">
                {errorInfo.componentStack}
              </pre>
            )}
          </div>
        )}

        <p className="mt-8 text-xs text-mystic-600">
          {t('errorBoundary.tailFooter')}
        </p>
      </div>
    </div>
  );
}

export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  const { t } = useT('app');
  return (
    <MysticErrorFallback
      title={t('errorBoundary.networkTitle')}
      message={t('errorBoundary.networkMessage')}
      onRetry={onRetry}
    />
  );
}

export function NotFoundFallback({ onGoHome }: { onGoHome?: () => void }) {
  const { t } = useT('app');
  return (
    <MysticErrorFallback
      title={t('errorBoundary.notFoundTitle')}
      message={t('errorBoundary.notFoundMessage')}
      onGoHome={onGoHome}
    />
  );
}

export function ContentErrorFallback({
  onRetry,
  contentType = 'content',
}: {
  onRetry?: () => void;
  contentType?: string;
}) {
  return (
    <div className="bg-mystic-900/50 rounded-2xl p-6 border border-mystic-700/20 text-center">
      <AlertTriangle className="w-10 h-10 text-gold/60 mx-auto mb-3" />
      <h3 className="text-mystic-100 font-medium mb-2">Unable to Load {contentType}</h3>
      <p className="text-mystic-500 text-sm mb-4">
        The {contentType.toLowerCase()} is temporarily hidden from view.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-gold text-sm hover:text-gold flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
