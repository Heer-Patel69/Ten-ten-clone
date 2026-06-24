/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { subscribeToSocket } from '@/lib/socket';
import { keepAlive } from '@/lib/backgroundKeepAlive';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    return subscribeToSocket((nextSocket) => {
      setSocket(nextSocket);
      setIsConnected(nextSocket?.connected ?? false);
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(false);
      return;
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsConnected(socket.connected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Audio unlock mechanism
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlocked.current) return;
      const audioEl = document.getElementById('walkietalk-audio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.play().catch(() => {});
        audioEl.pause();
        audioEl.currentTime = 0;

        keepAlive.enable();

        audioUnlocked.current = true;
        // Remove listeners after unlock
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {/* Global audio element for WebRTC */}
      <audio id="walkietalk-audio" autoPlay playsInline style={{ display: 'none' }} />
      {children}
    </SocketContext.Provider>
  );
}
