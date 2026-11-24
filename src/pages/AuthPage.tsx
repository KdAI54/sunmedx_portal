import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { getAuth, AuthUser } from '../services/authService';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
  externalNotice?: string;
  onDismissNotice?: () => void;
  onSuccess: (user: AuthUser) => void;
  onCancel: () => void;
}

export default function AuthPage({
  initialMode = 'signin',
  externalNotice = '',
  onDismissNotice,
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
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (onDismissNotice) onDismissNotice();
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

  return (
    <div className="min-h-[78vh] bg-[#F4F6FA] flex items-center justify-center px-6 py-12 page-fade-in">
      <div className="w-full max-w-[440px] space-y-5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#211D70] hover:text-[#F26522] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
          {/* Segmented Control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'signin'
                  ? 'bg-[#211D70] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#211D70]'
              }`}
            >
              Sign In to Portal
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-[#211D70] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#211D70]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="space-y-1">
            <h1 className="font-syne font-bold text-2xl text-[#211D70] tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to access your portal, reports, and contracts.'
                : 'Register your clinic or hospital profile to get started.'}
            </p>
          </div>

          {externalNotice && !error && (
            <div
              role="alert"
              className="text-xs text-[#9A3412] bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 leading-relaxed font-semibold flex items-start justify-between gap-2"
            >
              <span>{externalNotice}</span>
              {onDismissNotice && (
                <button
                  type="button"
                  onClick={onDismissNotice}
                  className="text-[11px] underline shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="text-xs text-[#EA2227] bg-[#EA2227]/10 border border-[#EA2227]/30 rounded-lg px-4 py-3 leading-relaxed font-semibold"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
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
                    autoComplete="off"
                    placeholder="Dr. Ananya Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-[#211D70] placeholder-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#211D70]"
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
                    autoComplete="off"
                    placeholder="City Care Hospital"
                    value={hospital}
                    onChange={e => setHospital(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-[#211D70] placeholder-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#211D70]"
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
                autoComplete="off"
                placeholder="name@hospital.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 text-[#211D70] placeholder-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#211D70]"
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-[#211D70] placeholder-slate-400 rounded-lg pl-4 pr-11 py-2.5 text-sm focus:outline-none focus:border-[#211D70]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#211D70] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#211D70] hover:bg-[#1a1658] text-[#F8C72E] text-sm font-bold transition-colors disabled:opacity-60 shadow-xs"
            >
              {submitting
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                ? 'Sign In to Portal'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
