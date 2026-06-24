'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Friend {
  friendshipId: string;
  friend: {
    _id: string;
    userCode: string;
    displayName: string;
    isOnline: boolean;
    lastSeen: string;
  };
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [incomingVoice, setIncomingVoice] = useState<{ from: string; name: string } | null>(null);

  const webrtc = useWebRTC({
    onIncomingVoice: (from, displayName) => {
      setIncomingVoice({ from, name: displayName });
    },
    onVoiceEnd: () => {
      setIncomingVoice(null);
    },
  });

  const fetchFriends = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
      ]);
      setFriends(friendsRes.data.friends);
      setPendingCount(requestsRes.data.requests.length);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      fetchFriends();
    }
  }, [user, authLoading, router, fetchFriends]);

  useEffect(() => {
    if (user && isConnected) {
      fetchFriends();
    }
  }, [user, isConnected, fetchFriends]);

  // Socket listeners for real-time presence
  useEffect(() => {
    if (!socket) return;

    const handleOnline = (data: { userId: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.friend._id === data.userId
            ? { ...f, friend: { ...f.friend, isOnline: true } }
            : f
        )
      );
    };

    const handleOffline = (data: { userId: string; lastSeen: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.friend._id === data.userId
            ? { ...f, friend: { ...f.friend, isOnline: false, lastSeen: data.lastSeen } }
            : f
        )
      );
    };

    socket.on('friend:online', handleOnline);
    socket.on('friend:offline', handleOffline);

    return () => {
      socket.off('friend:online', handleOnline);
      socket.off('friend:offline', handleOffline);
    };
  }, [socket]);

  // WebRTC listeners
  useEffect(() => {
    if (!socket) return;
    const cleanup = webrtc.setupListeners();
    return cleanup;
  }, [socket, webrtc.setupListeners]);

  const formatLastSeen = (date: string) => {
    if (!date) return 'Unknown';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (authLoading || loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Incoming voice overlay */}
      {incomingVoice && (
        <div className="voice-overlay">
          <div className="avatar avatar-lg">
            {incomingVoice.name.charAt(0)}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)' }}>
            {incomingVoice.name}
          </h2>
          <p className="text-secondary">is talking to you...</p>
          <div className="voice-waves">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="voice-wave-bar" />
            ))}
          </div>
          {webrtc.remotePlaybackBlocked && (
            <button className="btn btn-primary" onClick={webrtc.retryRemotePlayback}>
              Enable Speaker
            </button>
          )}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '0.5rem' }}>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-display)' }}>Friends</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <Link href="/groups/join" className="btn btn-sm" style={{ fontFamily: 'var(--font-primary)' }}>
            Join Group
          </Link>
          <Link href="/groups/create" className="btn btn-sm" style={{ fontFamily: 'var(--font-primary)' }}>
            Create Group
          </Link>
          <Link href="/add-friend" className="btn btn-primary btn-sm" style={{ position: 'relative', fontFamily: 'var(--font-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
            {pendingCount > 0 && (
              <span className="badge badge-danger" style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '18px', height: '18px', fontSize: '10px', padding: '0 4px' }}>
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Stories Section (Instagram Style) */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', scrollbarWidth: 'none', borderBottom: '1px solid var(--color-border)' }}>
        {/* "My Story" button */}
        <Link href="/stories/create" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0, textDecoration: 'none' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px dashed var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '1.5rem' }}>
            +
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-primary)', color: 'var(--color-text-secondary)' }}>My Story</span>
        </Link>
        
        {/* Friend Stories */}
        {friends.map(f => (
          <Link key={f.friend._id} href={`/stories/${f.friend._id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0, textDecoration: 'none' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid var(--color-accent)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-primary)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
                {f.friend.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-primary)', color: 'var(--color-text-secondary)', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.friend.displayName}
            </span>
          </Link>
        ))}
      </div>

      <div className="page-content" style={{ paddingBottom: '100px', paddingTop: '1rem' }}>
        {friends.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <h3>No friends yet</h3>
            <p>Add friends using their 4-digit code to start chatting!</p>
            <Link href="/add-friend" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
              Add Your First Friend
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {friends.map((f, index) => (
              <div
                key={f.friendshipId}
                className={`friend-card stagger-item`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => router.push(`/talk/${f.friend._id}`)}
              >
                <div className="avatar">
                  {f.friend.displayName.charAt(0)}
                </div>
                <div className="friend-info">
                  <div className="friend-name">{f.friend.displayName}</div>
                  <div className="friend-status">
                    <span className={`status-dot ${f.friend.isOnline ? 'status-online' : 'status-offline'}`} />
                    {f.friend.isOnline ? 'Online' : formatLastSeen(f.friend.lastSeen)}
                  </div>
                  <div className="friend-code">#{f.friend.userCode}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/talk/${f.friend._id}`);
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                  Talk
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="nav-bar">
        <div className="nav-bar-inner">
          <Link href="/friends" className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Friends
          </Link>
          <Link href="/add-friend" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add
          </Link>
          <Link href="/profile" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
