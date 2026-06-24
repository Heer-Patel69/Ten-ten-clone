'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [step, setStep] = useState<'form' | 'success'>('form');
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const code = await register(displayName.trim(), password);
      setGeneratedCode(code);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  if (step === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-card liquid-glass">
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🎉</div>
          <h1 className="auth-logo" style={{ fontSize: 'var(--fs-2xl)' }}>
            Welcome!
          </h1>
          <p className="auth-subtitle">
            Your account has been created. Here&apos;s your unique code — share it with friends so they can add you!
          </p>

          <div className="auth-code-display">{generatedCode}</div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)', marginBottom: 'var(--space-lg)' }}>
            Remember this code — you&apos;ll use it to log in
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <button className="btn btn-secondary btn-full" onClick={handleCopyCode}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Code
            </button>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push('/friends')}>
              Start Chatting →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card liquid-glass">
        <h1 className="auth-logo">BLINK</h1>
        <p className="auth-subtitle">Create your account & get your unique code</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              className="input"
              placeholder="What should friends call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="regPassword">Password</label>
            <input
              id="regPassword"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              placeholder="Type your password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have a code?{' '}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
