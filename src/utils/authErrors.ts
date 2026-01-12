export function getAuthErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('invalid login credentials') ||
      lowerError.includes('invalid email or password')) {
    return 'Email or password is incorrect. Please try again.';
  }

  if (lowerError.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  if (lowerError.includes('user already registered') ||
      lowerError.includes('user with this email already exists') ||
      lowerError.includes('duplicate key value')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (lowerError.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }

  if (lowerError.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  if (lowerError.includes('network') ||
      lowerError.includes('fetch') ||
      lowerError.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (lowerError.includes('popup') ||
      lowerError.includes('blocked')) {
    return 'Popup was blocked. Please allow popups and try again.';
  }

  if (lowerError.includes('cancelled') ||
      lowerError.includes('closed')) {
    return 'Sign in was cancelled. Please try again.';
  }

  if (lowerError.includes('oauth')) {
    return 'Google sign in failed. Please try again or use email.';
  }

  if (lowerError.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (lowerError.includes('not authorized') ||
      lowerError.includes('unauthorized')) {
    return 'You are not authorized to perform this action.';
  }

  if (errorMessage) {
    return errorMessage;
  }

  return 'An unexpected error occurred. Please try again.';
}
