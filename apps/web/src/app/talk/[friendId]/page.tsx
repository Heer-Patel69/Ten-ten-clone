'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api } from '@/lib/api';

interface FriendInfo {
  _id: string;
  userCode: string;
  displayName: string;
  isOnline: boolean;
}

export default function TalkPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [micInitialized, setMicInitialized] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const webrtc = useWebRTC({
    onIncomingVoice: () => {},
    onVoiceEnd: () => {},
    onVoiceUnavailable: (reason) => {
      alert(`Cannot reach ${friend?.displayName || 'friend'}: The app on their phone might be closed or they have no internet.`);
    },
  });

  const fetchFriend = useCallback(async () => {
    try {
      const res = await api.getFriends();
      const found = res.data.friends.find(
        (f: any) => f.friend._id === friendId
      );
      if (found) {
        setFriend(found.friend);
      }
    } catch (err) {
      console.error('Failed to fetch friend:', err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) fetchFriend();
  }, [user, authLoading, router, fetchFriend]);

  useEffect(() => {
    if (user && isConnected) {
      fetchFriend();
    }
  }, [user, isConnected, fetchFriend]);

  // Socket presence updates
  useEffect(() => {
    if (!socket) return;

    const handleOnline = (data: { userId: string }) => {
      if (data.userId === friendId) {
        setFriend((prev) => (prev ? { ...prev, isOnline: true } : prev));
      }
    };
    const handleOffline = (data: { userId: string }) => {
      if (data.userId === friendId) {
        setFriend((prev) => (prev ? { ...prev, isOnline: false } : prev));
      }
    };

    socket.on('friend:online', handleOnline);
    socket.on('friend:offline', handleOffline);
    return () => {
      socket.off('friend:online', handleOnline);
      socket.off('friend:offline', handleOffline);
    };
  }, [friendId, socket]);

  // WebRTC listeners
  useEffect(() => {
    if (!socket) return;
    const cleanup = webrtc.setupListeners();
    return cleanup;
  }, [socket, webrtc.setupListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webrtc.cleanup();
    };
  }, [webrtc.cleanup]);

  const handlePTTStart = () => {
    webrtc.startTalking(friendId);
  };

  const handlePTTEnd = () => {
    webrtc.stopTalking();
  };

  const handleInitMicrophone = async () => {
    setInitLoading(true);
    const success = await webrtc.initializeMicrophone();
    if (success) {
      setMicInitialized(true);
    }
    setInitLoading(false);
  };

  if (authLoading || loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  if (!friend) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <h3>Friend not found</h3>
            <button className="btn btn-primary" onClick={() => router.push('/friends')}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/friends')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-lg)' }}>
            {friend.displayName}
          </div>
          <div className="friend-status" style={{ justifyContent: 'center' }}>
            <span className={`status-dot ${friend.isOnline ? 'status-online' : 'status-offline'}`} />
            {friend.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Main Talk Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-xl)',
        padding: 'var(--space-xl)',
      }}>
        {/* Friend Avatar */}
        <div className="avatar avatar-lg" style={{
          width: '100px',
          height: '100px',
          fontSize: 'var(--fs-4xl)',
          boxShadow: friend.isOnline ? 'var(--shadow-glow)' : 'none',
          transition: 'box-shadow var(--transition-base)',
        }}>
          {friend.displayName.charAt(0)}
        </div>

        {/* Voice Waveform — visible when talking or receiving */}
        {(webrtc.isTalking || webrtc.isReceiving) && (
          <div className="voice-waves">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="voice-wave-bar" style={{
                background: webrtc.isTalking ? 'var(--color-danger)' : 'var(--color-accent)',
              }} />
            ))}
          </div>
        )}

        {/* Status Text or Init Button */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          {!micInitialized ? (
            <div style={{ padding: 'var(--space-md)' }}>
              <p className="text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
                You must allow microphone access to talk.
              </p>
              <button
                className={`btn btn-primary ${initLoading ? 'loading' : ''}`}
                onClick={handleInitMicrophone}
                disabled={initLoading}
                style={{ width: '100%' }}
              >
                {initLoading ? 'Requesting...' : 'Enable Microphone & Join'}
              </button>
            </div>
          ) : webrtc.isTalking ? (
            <p style={{ color: 'var(--color-danger)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-lg)' }}>
              🔴 You are talking...
            </p>
          ) : webrtc.isReceiving ? (
            <p style={{ color: 'var(--color-accent)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-lg)' }}>
              🟢 {friend.displayName} is talking...
            </p>
          ) : (
            <p className="text-secondary">
              Hold the button to talk
            </p>
          )}
          {webrtc.remotePlaybackBlocked && (
            <button
              className="btn btn-primary btn-sm"
              onClick={webrtc.retryRemotePlayback}
              style={{ marginTop: 'var(--space-md)' }}
            >
              Enable Speaker
            </button>
          )}
        </div>

        {/* Push-to-Talk Button */}
        <div className="ptt-container">
          <button
            className={`ptt-button ${webrtc.isTalking ? 'recording' : ''}`}
            onMouseDown={handlePTTStart}
            onMouseUp={handlePTTEnd}
            onMouseLeave={handlePTTEnd}
            onTouchStart={(e) => {
              e.preventDefault();
              handlePTTStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handlePTTEnd();
            }}
            disabled={!micInitialized}
            style={{
              opacity: micInitialized ? 1 : 0.4,
              cursor: micInitialized ? 'pointer' : 'not-allowed',
            }}
          >
            <div className="ptt-ring" />
            <div className="ptt-ring" />
            <div className="ptt-ring" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <p className="ptt-label">
            Hold to Talk
          </p>
        </div>
      </div>
      {/* Debug Panel */}
      <div style={{
        margin: 'var(--space-md)',
        padding: 'var(--space-md)',
        background: '#1a1a1a',
        borderRadius: 'var(--radius-md)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '10px',
        maxHeight: '150px',
        overflowY: 'auto',
        textAlign: 'left'
      }}>
        <div style={{ color: '#fff', marginBottom: '4px', fontWeight: 'bold' }}>
          Diagnostics (Socket: {isConnected ? 'CONNECTED' : 'DISCONNECTED'})
        </div>
        {webrtc.debugLogs.length === 0 ? (
          <div style={{ color: '#888' }}>Waiting for activity...</div>
        ) : (
          webrtc.debugLogs.map((log, i) => (
            <div key={i}>{log}</div>
          ))
        )}
      </div>

    </div>
  );
}
