'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [user, authLoading, router]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (authLoading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <div />
      </div>

      <div className="page-content" style={{ paddingBottom: '100px' }}>
        {/* Profile Card */}
        <div className="glass-card" style={{
          padding: 'var(--space-2xl)',
          textAlign: 'center',
          marginBottom: 'var(--space-xl)',
        }}>
          <div className="avatar avatar-lg" style={{
            width: '80px',
            height: '80px',
            fontSize: 'var(--fs-3xl)',
            margin: '0 auto var(--space-lg)',
          }}>
            {user?.displayName.charAt(0)}
          </div>

          {editing ? (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                setEditing(false);
                setDisplayName(user?.displayName || '');
              }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)' }}>
                {user?.displayName}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <p className="text-secondary" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-xs)' }}>
              Your Code
            </p>
            <div style={{
              fontFamily: "'Outfit', monospace",
              fontSize: 'var(--fs-3xl)',
              fontWeight: 'var(--fw-bold)',
              color: 'var(--color-accent)',
              letterSpacing: '0.2em',
            }}>
              {user?.userCode}
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(user?.userCode || '');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Code
          </button>
        </div>

        {/* Admin Link */}
        {user?.role === 'admin' && (
          <Link href="/admin" className="glass-card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-md)',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <div>
              <div style={{ fontWeight: 'var(--fw-semibold)' }}>Admin Dashboard</div>
              <div className="text-secondary" style={{ fontSize: 'var(--fs-xs)' }}>Manage users & reports</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto' }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}

        {/* Logout */}
        <button
          className="btn btn-danger btn-full"
          onClick={handleLogout}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="nav-bar">
        <div className="nav-bar-inner">
          <Link href="/friends" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Friends
          </Link>
          <Link href="/add-friend" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add
          </Link>
          <Link href="/profile" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
