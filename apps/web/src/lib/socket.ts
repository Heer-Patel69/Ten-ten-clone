import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;
const socketListeners = new Set<(socket: Socket | null) => void>();

function notifySocketListeners() {
  socketListeners.forEach((listener) => listener(socket));
}

export function getSocket(): Socket | null {
  notifySocketListeners();
  return socket;
}

export function subscribeToSocket(listener: (socket: Socket | null) => void): () => void {
  socketListeners.add(listener);
  listener(socket);

  return () => {
    socketListeners.delete(listener);
  };
}

export function connectSocket(token: string): Socket {
  const currentToken =
    socket && typeof socket.auth === 'object' && socket.auth
      ? (socket.auth as { token?: string }).token
      : undefined;

  if (socket && currentToken === token) {
    if (!socket.connected) {
      socket.connect();
    }
    notifySocketListeners();
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket?.emit('presence:online');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    notifySocketListeners();
  }
}
