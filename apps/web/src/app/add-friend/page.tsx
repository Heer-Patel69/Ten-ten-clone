'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface PendingRequest {
  _id: string;
  requester: {
    userCode: string;
    displayName: string;
  };
}

export default function AddFriendPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [tab, setTab] = useState<'add' | 'requests'>('add');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.getFriendRequests();
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) fetchRequests();
  }, [user, authLoading, router, fetchRequests]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setError('Enter a valid 4-digit code');
      return;
    }

    if (code === user?.userCode) {
      setError("You can't add yourself!");
      return;
    }

    setLoading(true);
    try {
      await api.sendFriendRequest(code);
      setSuccess(`Friend request sent to #${code}!`);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await api.acceptFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
      setSuccess('Friend added! 🎉');
    } catch (err: any) {
      setError(err.message || 'Failed to accept');
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await api.rejectFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    }
  };

  if (authLoading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="page-title">Add Friend</h1>
        <div style={{ width: '60px' }} />
      </div>

      <div className="page-content">
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          marginBottom: 'var(--space-xl)',
        }}>
          <button
            className={`btn btn-sm btn-full ${tab === 'add' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('add')}
          >
            Add by Code
          </button>
          <button
            className={`btn btn-sm btn-full ${tab === 'requests' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('requests')}
            style={{ position: 'relative' }}
          >
            Requests
            {requests.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: '6px' }}>
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'add' ? (
          <>
            {/* Your Code */}
            <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <p className="text-secondary" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-sm)' }}>
                Your Code — Share with friends
              </p>
              <div className="auth-code-display" style={{ fontSize: 'var(--fs-4xl)' }}>
                {user?.userCode}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(user?.userCode || '');
                  setSuccess('Code copied!');
                  setTimeout(() => setSuccess(''), 2000);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </button>
            </div>

            {/* Add by Code Form */}
            <form onSubmit={handleSendRequest}>
              <div className="input-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label>Enter Friend&apos;s Code</label>
                <input
                  type="text"
                  className="input input-code"
                  placeholder="0000"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCode(val);
                  }}
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-sm)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ color: 'var(--color-accent)', fontSize: 'var(--fs-sm)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || code.length !== 4}
              >
                {loading ? <span className="spinner" /> : 'Send Friend Request'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {requests.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48 }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <h3>No pending requests</h3>
                <p>Share your code with friends to receive requests</p>
              </div>
            ) : (
              requests.map((req, i) => (
                <div key={req._id} className="friend-card stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="avatar">
                    {req.requester.displayName.charAt(0)}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{req.requester.displayName}</div>
                    <div className="friend-code">#{req.requester.userCode}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req._id)}>
                      Accept
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleReject(req._id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ color: 'var(--color-accent)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>
                {success}
              </div>
            )}
          </div>
        )}
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
          <Link href="/add-friend" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add
          </Link>
          <Link href="/profile" className="nav-item">
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
