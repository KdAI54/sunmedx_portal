import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { getAuth, AuthUser } from '../services/authService';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
  onSuccess: (user: AuthUser) => void;
  onCancel: () => void;
}

export default function AuthPage({
  initialMode = 'signin',
  onSuccess,
  onCancel,
}: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [hospital, setHospital] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const auth = getAuth();
      const result =
        mode === 'signin'
          ? await auth.signIn(email, password)
          : await auth.signUp({ name, hospital, email, password });

      onSuccess(result.user);
    } catch (err: any) {
      setError(err?.message || 'Unable to complete request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setMode('signin');
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-[78vh] bg-[#EAEAEA]/60 flex items-center justify-center px-6 py-12 page-fade-in">
      <div className="w-full max-w-[420px] space-y-5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#211D70] hover:text-[#F26522] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </button>

        <div className="bg-white border-2 border-[#211D70] rounded-xl p-8 space-y-6 shadow-xl">
          {/* Segmented Control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#EAEAEA] rounded-lg border border-[#D4D6E2]">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                mode === 'signin'
                  ? 'bg-[#211D70] text-[#F8C72E]'
                  : 'text-[#404041] hover:text-[#211D70]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-[#211D70] text-[#F8C72E]'
                  : 'text-[#404041] hover:text-[#211D70]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="space-y-1">
            <h1 className="font-syne font-bold text-2xl text-[#211D70] tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-[#505050] leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to view calibration reports, bookings, and contracts.'
                : 'Register your clinic or hospital profile to manage biomedical assets.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="text-xs text-[#EA2227] bg-[#EA2227]/10 border border-[#EA2227]/30 rounded-lg px-4 py-3 leading-relaxed font-semibold"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-[#211D70]">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Dr. Ananya Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] placeholder-[#505050]/55 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-hospital" className="block text-xs font-semibold text-[#211D70]">
                    Hospital or organization
                  </label>
                  <input
                    id="auth-hospital"
                    type="text"
                    required
                    autoComplete="organization"
                    placeholder="City Care Hospital"
                    value={hospital}
                    onChange={e => setHospital(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] placeholder-[#505050]/55 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[#211D70]">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@hospital.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-[#D4D6E2] text-[#211D70] placeholder-[#505050]/55 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-semibold text-[#211D70]">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#D4D6E2] text-[#211D70] placeholder-[#505050]/55 rounded-lg pl-4 pr-11 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#505050] hover:text-[#211D70] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] text-sm font-bold transition-colors disabled:opacity-60"
            >
              {submitting
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="pt-4 border-t border-[#E6E7EE] space-y-2">
              <p className="text-xs text-[#505050]">Quick demo accounts (password: password123)</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => fillDemo('client@sunmedx.in')}
                  className="text-[#211D70] hover:text-[#F26522] hover:underline"
                >
                  Client
                </button>
                <span aria-hidden="true" className="text-[#D4D6E2]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => fillDemo('tech@sunmedx.in')}
                  className="text-[#211D70] hover:text-[#F26522] hover:underline"
                >
                  Technician
                </button>
                <span aria-hidden="true" className="text-[#D4D6E2]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => fillDemo('admin@sunmedx.in')}
                  className="text-[#211D70] hover:text-[#F26522] hover:underline"
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
