export interface NormalizedError {
  code: string;
  status?: number;
  message: string;
  hint?: string;
  isRetryable: boolean;
  likelyCause?: string;
  originalError?: string;
}

interface SupabaseAuthError {
  message?: string;
  status?: number;
  code?: string;
  error?: string;
  error_description?: string;
  name?: string;
}

const ERROR_MAPPINGS: Array<{
  patterns: string[];
  code: string;
  message: string;
  hint?: string;
  isRetryable: boolean;
  likelyCause?: string;
}> = [
  {
    patterns: ['invalid_grant', 'invalid grant'],
    code: 'INVALID_GRANT',
    message: 'The authorization code has expired or is invalid.',
    hint: 'This usually happens when the OAuth flow takes too long or is interrupted.',
    isRetryable: true,
    likelyCause: 'OAuth code expired before exchange. Try signing in again.',
  },
  {
    patterns: ['flow_state_not_found', 'flow state not found', 'invalid flow state'],
    code: 'FLOW_STATE_NOT_FOUND',
    message: 'Sign in session expired.',
    hint: 'The OAuth state could not be verified.',
    isRetryable: true,
    likelyCause: 'PKCE state was cleared from storage, possibly due to app reload or storage issues.',
  },
  {
    patterns: ['pkce', 'code_verifier', 'code verifier'],
    code: 'PKCE_VERIFIER_MISSING',
    message: 'Security verification failed.',
    hint: 'The PKCE code verifier was not found.',
    isRetryable: true,
    likelyCause: 'Code verifier was cleared from storage before the OAuth callback. Check if storage is persisting correctly.',
  },
  {
    patterns: ['session expired', 'session_expired', 'refresh_token_not_found'],
    code: 'SESSION_EXPIRED',
    message: 'Your session has expired.',
    hint: 'Please sign in again to continue.',
    isRetryable: true,
    likelyCause: 'Session tokens expired and could not be refreshed.',
  },
  {
    patterns: ['invalid_request', 'invalid request'],
    code: 'INVALID_REQUEST',
    message: 'The sign in request was invalid.',
    hint: 'There may be a configuration issue.',
    isRetryable: true,
    likelyCause: 'OAuth configuration may be incorrect. Check redirect URLs and client ID.',
  },
  {
    patterns: ['access_denied', 'access denied'],
    code: 'ACCESS_DENIED',
    message: 'Sign in was cancelled.',
    hint: 'You denied the sign in request.',
    isRetryable: true,
    likelyCause: 'User cancelled the OAuth consent screen.',
  },
  {
    patterns: ['unauthorized_client', 'unauthorized client'],
    code: 'UNAUTHORIZED_CLIENT',
    message: 'App is not authorized for Google Sign In.',
    hint: 'Contact support if this persists.',
    isRetryable: false,
    likelyCause: 'OAuth client ID is not configured correctly in Google Cloud Console or Supabase.',
  },
  {
    patterns: ['invalid login credentials', 'invalid email or password'],
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect.',
    hint: 'Please check your credentials and try again.',
    isRetryable: true,
    likelyCause: 'Wrong email or password entered.',
  },
  {
    patterns: ['email not confirmed'],
    code: 'EMAIL_NOT_CONFIRMED',
    message: 'Please verify your email address.',
    hint: 'Check your inbox for a verification email.',
    isRetryable: false,
    likelyCause: 'Account exists but email has not been verified.',
  },
  {
    patterns: ['user already registered', 'user with this email already exists', 'duplicate key'],
    code: 'USER_EXISTS',
    message: 'An account with this email already exists.',
    hint: 'Try signing in instead.',
    isRetryable: false,
    likelyCause: 'Email is already registered.',
  },
  {
    patterns: ['password should be at least', 'password too short'],
    code: 'PASSWORD_TOO_SHORT',
    message: 'Password must be at least 6 characters.',
    hint: 'Choose a longer password.',
    isRetryable: true,
    likelyCause: 'Password does not meet minimum length requirement.',
  },
  {
    patterns: ['invalid email'],
    code: 'INVALID_EMAIL',
    message: 'Please enter a valid email address.',
    hint: 'Check the email format.',
    isRetryable: true,
    likelyCause: 'Email format is incorrect.',
  },
  {
    patterns: ['network', 'fetch', 'connection', 'timeout', 'econnrefused'],
    code: 'NETWORK_ERROR',
    message: 'Network error. Please check your connection.',
    hint: 'Make sure you have internet access.',
    isRetryable: true,
    likelyCause: 'No internet connection or server is unreachable.',
  },
  {
    patterns: ['popup', 'blocked'],
    code: 'POPUP_BLOCKED',
    message: 'Popup was blocked.',
    hint: 'Please allow popups and try again.',
    isRetryable: true,
    likelyCause: 'Browser blocked the OAuth popup.',
  },
  {
    patterns: ['cancelled', 'closed', 'user_cancelled'],
    code: 'USER_CANCELLED',
    message: 'Sign in was cancelled.',
    hint: 'You can try again when ready.',
    isRetryable: true,
    likelyCause: 'User closed the sign in window.',
  },
  {
    patterns: ['rate limit', 'too many requests', '429'],
    code: 'RATE_LIMITED',
    message: 'Too many attempts.',
    hint: 'Please wait a moment and try again.',
    isRetryable: true,
    likelyCause: 'Too many sign in attempts in a short period.',
  },
  {
    patterns: ['not authorized', 'unauthorized', '401'],
    code: 'UNAUTHORIZED',
    message: 'You are not authorized.',
    hint: 'Your session may have expired.',
    isRetryable: true,
    likelyCause: 'Session is invalid or expired.',
  },
  {
    patterns: ['provider not enabled', 'provider_not_enabled'],
    code: 'PROVIDER_NOT_ENABLED',
    message: 'Google sign in is not available.',
    hint: 'Contact support if this persists.',
    isRetryable: false,
    likelyCause: 'Google OAuth is not enabled in Supabase project settings.',
  },
];

export function normalizeSupabaseError(error: unknown): NormalizedError {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'An unknown error occurred.',
      isRetryable: true,
    };
  }

  let errorMessage = '';
  let status: number | undefined;
  let originalError = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    originalError = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
    originalError = error;
  } else if (typeof error === 'object') {
    const authError = error as SupabaseAuthError;
    errorMessage = authError.message || authError.error_description || authError.error || '';
    status = authError.status;
    originalError = JSON.stringify(error);
  }

  const lowerError = errorMessage.toLowerCase();

  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.patterns.some(pattern => lowerError.includes(pattern.toLowerCase()))) {
      return {
        code: mapping.code,
        status,
        message: mapping.message,
        hint: mapping.hint,
        isRetryable: mapping.isRetryable,
        likelyCause: mapping.likelyCause,
        originalError,
      };
    }
  }

  return {
    code: 'UNKNOWN',
    status,
    message: errorMessage || 'An unexpected error occurred.',
    isRetryable: true,
    originalError,
  };
}

/**
 * Return a user-facing, localized error message.
 * Looks up common:errors.auth.<code> in the active i18n locale.
 * Falls back to the English message if the key isn't present.
 */
export function getAuthErrorMessage(error: Error | string): string {
  const normalized = normalizeSupabaseError(error);
  try {
    // Dynamic import via require-like access to avoid circular graph at module load.
    // react-i18next's singleton exposes .t() with locale-aware lookup + fallback.
    const i18n = (globalThis as unknown as {
      __arcanaI18n?: { t: (key: string, opts?: Record<string, unknown>) => string };
    }).__arcanaI18n;
    if (i18n) {
      const key = `common:errors.auth.${normalized.code}`;
      const translated = i18n.t(key, { defaultValue: '' });
      if (translated) return translated;
    }
  } catch {
    // swallow — fall back to English
  }
  return normalized.message;
}

export function isRetryableError(error: unknown): boolean {
  const normalized = normalizeSupabaseError(error);
  return normalized.isRetryable;
}

export function getErrorDiagnostics(error: unknown): {
  code: string;
  message: string;
  likelyCause?: string;
  hint?: string;
} {
  const normalized = normalizeSupabaseError(error);
  return {
    code: normalized.code,
    message: normalized.message,
    likelyCause: normalized.likelyCause,
    hint: normalized.hint,
  };
}

export function detectOAuthIssues(url: string): string[] {
  const issues: string[] = [];

  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;
    const hashParams = new URLSearchParams(parsed.hash.replace('#', ''));

    if (hashParams.has('code') && !searchParams.has('code')) {
      issues.push('OAuth code is in URL hash (#) instead of query (?). This may indicate implicit flow instead of PKCE.');
    }

    if (searchParams.has('error')) {
      const errorCode = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');
      issues.push(`OAuth error in callback: ${errorCode}${errorDesc ? ` - ${errorDesc}` : ''}`);
    }

    if (hashParams.has('error')) {
      const errorCode = hashParams.get('error');
      const errorDesc = hashParams.get('error_description');
      issues.push(`OAuth error in hash: ${errorCode}${errorDesc ? ` - ${errorDesc}` : ''}`);
    }

    if (!searchParams.has('code') && !hashParams.has('code') &&
        !searchParams.has('access_token') && !hashParams.has('access_token') &&
        !searchParams.has('error') && !hashParams.has('error')) {
      issues.push('Callback URL does not contain expected OAuth parameters (code, access_token, or error).');
    }

  } catch {
    issues.push('Failed to parse callback URL.');
  }

  return issues;
}

export function analyzeCallbackUrl(url: string): {
  hasCode: boolean;
  hasState: boolean;
  hasAccessToken: boolean;
  hasError: boolean;
  errorCode?: string;
  errorDescription?: string;
  codeLocation?: 'query' | 'hash';
  scheme?: string;
  host?: string;
  path?: string;
} {
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;
    const hashParams = new URLSearchParams(parsed.hash.replace('#', ''));

    const hasCodeInQuery = searchParams.has('code');
    const hasCodeInHash = hashParams.has('code');

    return {
      hasCode: hasCodeInQuery || hasCodeInHash,
      hasState: searchParams.has('state') || hashParams.has('state'),
      hasAccessToken: searchParams.has('access_token') || hashParams.has('access_token'),
      hasError: searchParams.has('error') || hashParams.has('error'),
      errorCode: searchParams.get('error') || hashParams.get('error') || undefined,
      errorDescription: searchParams.get('error_description') || hashParams.get('error_description') || undefined,
      codeLocation: hasCodeInQuery ? 'query' : hasCodeInHash ? 'hash' : undefined,
      scheme: parsed.protocol.replace(':', ''),
      host: parsed.host,
      path: parsed.pathname,
    };
  } catch {
    return {
      hasCode: false,
      hasState: false,
      hasAccessToken: false,
      hasError: false,
    };
  }
}
