'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

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
    // Poll for the socket instance if it's not immediately available
    const checkSocket = () => {
      const s = getSocket();
      if (s && s !== socket) {
        setSocket(s);
        setIsConnected(s.connected);

        s.on('connect', () => setIsConnected(true));
        s.on('disconnect', () => setIsConnected(false));
      }
    };

    const interval = setInterval(checkSocket, 500);
    checkSocket();

    return () => {
      clearInterval(interval);
    };
  }, [socket]);

  // Audio unlock mechanism for mobile browsers
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlocked.current) return;
      const audioEl = document.getElementById('walkietalk-audio') as HTMLAudioElement;
      if (audioEl) {
        audioEl.play().catch(() => {});
        audioEl.pause();
        audioEl.currentTime = 0;
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
