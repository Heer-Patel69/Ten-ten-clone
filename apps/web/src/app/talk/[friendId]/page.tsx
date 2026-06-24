/* eslint-disable react-hooks/set-state-in-effect */
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
        (f: { friend: { _id: string } }) => f.friend._id === friendId
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (user) fetchFriend();
  }, [user, authLoading, router, fetchFriend]);

  useEffect(() => {
    if (user && isConnected) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleToggleTalk = () => {
    if (!micInitialized) {
      handleInitMicrophone();
      return;
    }
    if (webrtc.isTalking) {
      webrtc.stopTalking();
    } else {
      webrtc.startTalking(friendId);
    }
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
    return <div className="min-h-screen flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-4xl">blur_on</span></div>;
  }

  if (!friend) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center">
        <h3 className="text-xl text-text-primary mb-4 font-semibold">Friend not found</h3>
        <button className="bg-primary text-white px-6 py-2 rounded-full" onClick={() => router.push('/friends')}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-screen flex flex-col font-primary text-text-primary">
      {/* Header */}
      <header className="glass-surface px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-white/40">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/add-friend')} className="text-text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white font-bold shadow-inner">
                {friend.displayName.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${friend.isOnline ? 'bg-secondary' : 'bg-outline'}`}></div>
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">{friend.displayName}</h1>
              <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                E2E Encrypted
              </div>
            </div>
          </div>
        </div>
        <button className="text-text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 pb-32">
        {/* Placeholder Messages to match Design Guide */}
        <div className="flex items-start gap-3">
           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-fixed to-primary flex items-center justify-center text-white text-xs font-bold shadow-inner shrink-0 mt-1">
              {friend.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-white/50 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[80%]">
              <p className="text-sm">Hey, are we still meeting in the Zen Protocol node?</p>
              <span className="text-[10px] text-text-muted mt-1 block">10:42 AM</span>
            </div>
        </div>

        <div className="flex flex-col items-end gap-1">
            <div className="bg-primary/10 backdrop-blur-md border border-primary/20 px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[80%] text-text-primary">
              <p className="text-sm">Yeah for sure. Let me just grab a coffee first ☕</p>
              <span className="text-[10px] text-text-muted mt-1 block text-right">10:45 AM</span>
            </div>
        </div>

        <div className="flex items-start gap-3">
           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-fixed to-primary flex items-center justify-center text-white text-xs font-bold shadow-inner shrink-0 mt-1">
              {friend.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-white/50 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[80%]">
              <p className="text-sm">See you there!</p>
              <span className="text-[10px] text-text-muted mt-1 block">10:46 AM</span>
            </div>
        </div>

        {/* Dynamic Voice Walkie-Talkie Status */}
        {(webrtc.isTalking || webrtc.isReceiving || !micInitialized) && (
          <div className="my-8 flex justify-center w-full">
            <div className="glass-surface px-6 py-4 rounded-3xl text-center max-w-sm w-full animate-fade-in-up">
              {!micInitialized ? (
                <div className="text-sm text-text-secondary">
                  <span className="material-symbols-outlined block text-3xl mb-2 text-primary/50">mic_off</span>
                  Mic not initialized. Tap the mic below to start.
                </div>
              ) : webrtc.isTalking ? (
                <div className="text-primary font-semibold flex flex-col items-center gap-2">
                  <span className="relative flex h-8 w-8 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                    <span className="material-symbols-outlined relative inline-flex">mic</span>
                  </span>
                  You are broadcasting...
                </div>
              ) : webrtc.isReceiving ? (
                <div className="text-secondary font-semibold flex flex-col items-center gap-2">
                  <span className="relative flex h-8 w-8 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-40"></span>
                    <span className="material-symbols-outlined relative inline-flex">volume_up</span>
                  </span>
                  {friend.displayName} is speaking...
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#fdfafb] to-transparent">
        <div className="max-w-2xl mx-auto glass-surface rounded-full flex items-center px-4 py-2 shadow-[0_8px_32px_rgba(121,82,227,0.12)] border border-white/60">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-primary transition-colors shrink-0">
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
          
          <input 
            type="text" 
            placeholder="Whisper..." 
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm placeholder:text-text-muted/60"
          />

          <button 
            onClick={handleToggleTalk}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-md transition-transform active:scale-90 ${webrtc.isTalking ? 'bg-danger shadow-danger/30' : 'bg-primary shadow-primary/30'}`}
          >
            <span className="material-symbols-outlined text-[24px] fill-icon">
              {webrtc.isTalking ? 'stop' : 'mic'}
            </span>
          </button>
        </div>
      </div>
      
    </div>
  );
}
