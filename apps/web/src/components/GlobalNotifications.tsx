'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import VideoCallModal from './VideoCallModal';
import { IMessage } from '@tentenclone/shared/types';

export default function GlobalNotifications() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    displayName?: string;
    offer: any;
    isGroup: boolean;
  } | null>(null);

  const [incomingIceCandidates, setIncomingIceCandidates] = useState<any[]>([]);

  const [toastMessage, setToastMessage] = useState<{
    id: string;
    senderName: string;
    content: string;
    chatLink: string;
  } | null>(null);

  const [acceptedCall, setAcceptedCall] = useState<{
    from: string;
    offer: any;
    isGroup: boolean;
    initialIceCandidates: any[];
  } | null>(null);

  useEffect(() => {
    if (!socket || !user) return;

    const handleVideoOffer = (data: { from: string; displayName?: string; offer: any; isGroup: boolean }) => {
      // Don't show incoming call if we are already in a call with them (shouldn't happen)
      setIncomingCall(data);
      setIncomingIceCandidates([]); // Reset buffer for new call
      // Play a ringing sound
      try {
        const audio = new Audio('/sounds/ringtone.mp3'); // We'll assume this exists or fails silently
        audio.play().catch(() => {});
      } catch (e) {}
    };

    const handleIceCandidate = (data: { candidate: any }) => {
      setIncomingIceCandidates(prev => [...prev, data.candidate]);
    };

    const handleChatReceive = (data: { message: IMessage }) => {
      const msg = data.message;
      // Don't show toast if we are currently looking at their chat room!
      const isMyMessage = msg.senderId === user._id || (msg.senderId as any)._id === user._id;
      if (isMyMessage) return;

      const senderId = (msg.senderId as any)._id || msg.senderId;
      const senderName = msg.isAnonymous ? (msg.anonymousName || 'Anonymous') : ((msg.senderId as any).displayName || 'A Friend');
      
      const chatRoute = `/chat/${msg.groupId || senderId}${msg.groupId ? '?isGroup=true' : ''}`;
      
      if (pathname !== `/chat/${msg.groupId || senderId}`) {
        setToastMessage({
          id: msg._id,
          senderName,
          content: msg.type === 'IMAGE' ? '📷 Sent a photo' : msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          chatLink: chatRoute
        });

        // Auto hide toast after 4 seconds
        setTimeout(() => {
          setToastMessage(prev => prev?.id === msg._id ? null : prev);
        }, 4000);

        // Play notification sound
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      }
    };

    socket.on('video:offer', handleVideoOffer);
    socket.on('video:ice-candidate', handleIceCandidate);
    socket.on('chat:receive', handleChatReceive);

    return () => {
      socket.off('video:offer', handleVideoOffer);
      socket.off('video:ice-candidate', handleIceCandidate);
      socket.off('chat:receive', handleChatReceive);
    };
  }, [socket, user, pathname]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      setAcceptedCall({
        ...incomingCall,
        initialIceCandidates: incomingIceCandidates
      });
      setIncomingCall(null);
      setIncomingIceCandidates([]);
    }
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
  };

  const handleCloseCall = () => {
    setAcceptedCall(null);
  };

  return (
    <>
      {/* Toast Notification for Texts */}
      {toastMessage && (
        <div 
          onClick={() => {
            router.push(toastMessage.chatLink);
            setToastMessage(null);
          }}
          className="card"
          style={{
            position: 'fixed',
            top: '5rem',
            left: '1rem',
            right: '1rem',
            zIndex: 9999,
            padding: '1rem',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderLeft: '4px solid var(--color-accent)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>
              {toastMessage.senderName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {toastMessage.senderName}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {toastMessage.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extreme Incoming Call Overlay */}
      {incomingCall && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.95)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          animation: 'pulseBg 2s infinite'
        }}>
          <style>{`
            @keyframes pulseBg {
              0% { background-color: rgba(20, 0, 10, 0.95); }
              50% { background-color: rgba(60, 0, 30, 0.95); }
              100% { background-color: rgba(20, 0, 10, 0.95); }
            }
            @keyframes slideDown {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 0 30px var(--color-accent-glow)',
            marginBottom: '2rem'
          }}>
            {incomingCall.displayName ? incomingCall.displayName.charAt(0).toUpperCase() : '?'}
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
            {incomingCall.displayName || 'Someone'}
          </h2>
          <p style={{ color: 'var(--color-accent)', fontSize: '1.2rem', marginBottom: '4rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Incoming Video Call...
          </p>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <button 
              onClick={handleDeclineCall}
              style={{
                width: '70px', height: '70px', borderRadius: '50%', border: 'none',
                backgroundColor: '#ff3b30', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(255, 59, 48, 0.4)', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>call_end</span>
            </button>
            <button 
              onClick={handleAcceptCall}
              style={{
                width: '70px', height: '70px', borderRadius: '50%', border: 'none',
                backgroundColor: '#34c759', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(52, 199, 89, 0.4)', cursor: 'pointer',
                animation: 'bounce 1s infinite'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>videocam</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      {acceptedCall && (
        <VideoCallModal
          peerId={acceptedCall.from}
          isGroup={acceptedCall.isGroup}
          incomingOffer={acceptedCall.offer}
          initialIceCandidates={acceptedCall.initialIceCandidates}
          onClose={handleCloseCall}
        />
      )}
    </>
  );
}
