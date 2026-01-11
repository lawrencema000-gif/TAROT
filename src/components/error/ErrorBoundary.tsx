import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Moon } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <MysticErrorFallback onRetry={this.handleRetry} onGoHome={this.handleGoHome} />;
    }

    return this.props.children;
  }
}

interface MysticErrorFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  title?: string;
  message?: string;
}

export function MysticErrorFallback({
  onRetry,
  onGoHome,
  title = 'The Stars Have Shifted',
  message = 'Something unexpected disrupted your cosmic journey. The universe works in mysterious ways, but we can try again.',
}: MysticErrorFallbackProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative bg-gradient-to-br from-stone-900 to-stone-950 rounded-full w-32 h-32 mx-auto flex items-center justify-center border border-amber-900/30">
            <div className="relative">
              <Moon className="w-12 h-12 text-amber-500/50 absolute -top-2 -right-2" />
              <AlertTriangle className="w-14 h-14 text-amber-400" />
            </div>
          </div>
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <div className="absolute bottom-4 right-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse delay-300" />
          <div className="absolute top-1/3 right-1/5 w-1 h-1 bg-amber-200 rounded-full animate-pulse delay-700" />
        </div>

        <h2 className="text-2xl font-serif text-amber-100 mb-3">{title}</h2>
        <p className="text-amber-200/60 mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-stone-900 rounded-xl font-medium hover:bg-amber-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-amber-100 rounded-xl font-medium hover:bg-stone-700 transition-colors border border-amber-900/30"
            >
              <Home className="w-4 h-4" />
              Return Home
            </button>
          )}
        </div>

        <p className="mt-8 text-xs text-amber-200/30">
          If this continues, the cosmos may need a moment to realign.
        </p>
      </div>
    </div>
  );
}

export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <MysticErrorFallback
      title="Connection Lost to the Stars"
      message="We couldn't reach the cosmic servers. Check your connection and try again when the path is clear."
      onRetry={onRetry}
    />
  );
}

export function NotFoundFallback({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <MysticErrorFallback
      title="This Path Leads Nowhere"
      message="The page you seek has vanished into the void. Perhaps the stars have a different destination in mind."
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
    <div className="bg-stone-900/50 rounded-2xl p-6 border border-amber-900/20 text-center">
      <AlertTriangle className="w-10 h-10 text-amber-400/60 mx-auto mb-3" />
      <h3 className="text-amber-100 font-medium mb-2">Unable to Load {contentType}</h3>
      <p className="text-amber-200/50 text-sm mb-4">
        The {contentType.toLowerCase()} is temporarily hidden from view.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
