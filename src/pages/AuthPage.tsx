import { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { supabase } from '../lib/supabase';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

interface AuthPageProps {
  onSwitchToOnboarding: () => void;
}

export function AuthPage({ onSwitchToOnboarding }: AuthPageProps) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorDescription = urlParams.get('error_description');
    const errorParam = urlParams.get('error');

    if (errorDescription || errorParam) {
      const decodedError = (errorDescription || errorParam || '').replace(/\+/g, ' ');
      toast(decodedError, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setVerifyEmail(email);
        setShowVerifyEmail(true);
      } else {
        toast(getAuthErrorMessage(error), 'error');
      }
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: verifyEmail });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResendSent(true);
      }
    } catch {
      toast('Failed to resend verification email.', 'error');
    }
    setResendLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast('Please enter your email address.', 'error');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        toast(getAuthErrorMessage(error), 'error');
      } else {
        setResetSent(true);
      }
    } catch {
      toast('Failed to send reset email. Please try again.', 'error');
    }
    setResetLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast(getAuthErrorMessage(error), 'error');
    }
    setGoogleLoading(false);
  };

  if (showVerifyEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm">
          <button
            onClick={() => { setShowVerifyEmail(false); setResendSent(false); }}
            className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
              <Mail className="w-10 h-10 text-gold" />
              <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
            </div>
            <h1 className="font-display text-3xl text-mystic-100 mb-2">Verify Your Email</h1>
            <p className="text-mystic-400">
              We sent a verification link to <span className="text-mystic-200">{verifyEmail}</span>. Please check your inbox.
            </p>
          </div>

          <div className="space-y-4">
            {resendSent ? (
              <div className="flex items-center justify-center gap-2 text-gold py-3">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Verification email sent!</span>
              </div>
            ) : (
              <Button
                variant="outline"
                fullWidth
                onClick={handleResendVerification}
                loading={resendLoading}
                className="min-h-[52px]"
              >
                Resend Verification Email
              </Button>
            )}
            <p className="text-sm text-mystic-500 text-center">
              Check your spam folder if you don't see it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-sm">
          <button
            onClick={() => { setShowResetPassword(false); setResetSent(false); }}
            className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
              {resetSent ? (
                <CheckCircle className="w-10 h-10 text-gold" />
              ) : (
                <Mail className="w-10 h-10 text-gold" />
              )}
              <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
            </div>
            <h1 className="font-display text-3xl text-mystic-100 mb-2">
              {resetSent ? 'Check Your Email' : 'Reset Password'}
            </h1>
            <p className="text-mystic-400">
              {resetSent
                ? `We've sent a reset link to ${resetEmail}`
                : 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {!resetSent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="Email address"
                icon={<Mail className="w-5 h-5" />}
                required
              />
              <Button type="submit" variant="gold" fullWidth loading={resetLoading} className="min-h-[52px]">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-mystic-400 text-center">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setResetSent(false)}
                className="min-h-[52px]"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center relative">
            <Sparkles className="w-10 h-10 text-gold" />
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse-slow" />
          </div>
          <h1 className="font-display text-3xl text-mystic-100 mb-2">Welcome Back</h1>
          <p className="text-mystic-400">Sign in to continue your journey</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            loading={googleLoading}
            className="min-h-[52px] bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-mystic-700/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-mystic-900 text-sm text-mystic-500">or</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            icon={<Mail className="w-5 h-5" />}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              icon={<Lock className="w-5 h-5" />}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-mystic-400 hover:text-mystic-200 p-2"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button type="submit" variant="gold" fullWidth loading={loading} className="min-h-[52px]">
            Sign In
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setShowResetPassword(true); setResetEmail(email); }}
          className="w-full mt-4 text-sm text-mystic-400 hover:text-gold transition-colors py-2"
        >
          Forgot your password?
        </button>

        <div className="mt-8 pt-8 border-t border-mystic-800">
          <p className="text-center text-mystic-400 mb-4">New to Arcana?</p>
          <Button
            variant="outline"
            fullWidth
            onClick={onSwitchToOnboarding}
            className="min-h-[52px]"
          >
            Create Account
          </Button>
        </div>

        <p className="mt-8 text-xs text-center text-mystic-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          <br />This app is for entertainment purposes only.
        </p>
      </div>
    </div>
  );
}
