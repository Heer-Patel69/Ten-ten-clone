import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';

// Map userId -> active socket ids. A user can have the PWA open in multiple tabs/devices.
const onlineUsers = new Map<string, Set<string>>();

interface ActiveCall {
  callerUserId: string;
  callerSocketId: string;
  calleeUserId: string;
  calleeSocketId: string;
}

const activeCalls = new Map<string, ActiveCall>();

function addUserSocket(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId) ?? new Set<string>();
  const wasOffline = sockets.size === 0;

  sockets.add(socketId);
  onlineUsers.set(userId, sockets);

  return wasOffline;
}

function removeUserSocket(userId: string, socketId: string) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  return false;
}

function getPrimarySocketId(userId: string) {
  const sockets = onlineUsers.get(userId);
  if (!sockets?.size) return null;

  const socketIds = Array.from(sockets);
  return socketIds[socketIds.length - 1] ?? null;
}

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  const sockets = onlineUsers.get(userId);
  if (!sockets?.size) return false;

  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });

  return true;
}

function makeCallId(socketId: string) {
  return `${socketId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function notifyVoiceUnavailable(
  socket: Socket,
  to: string,
  callId: string | undefined,
  reason: string
) {
  socket.emit('voice:unavailable', { to, callId, reason });
}

function endCallsForSocket(io: Server, socketId: string) {
  for (const [callId, call] of activeCalls) {
    if (call.callerSocketId === socketId) {
      io.to(call.calleeSocketId).emit('voice:end', {
        from: call.callerUserId,
        callId,
      });
      activeCalls.delete(callId);
    } else if (call.calleeSocketId === socketId) {
      io.to(call.callerSocketId).emit('voice:end', {
        from: call.calleeUserId,
        callId,
      });
      activeCalls.delete(callId);
    }
  }
}

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).userCode = user.userCode;
      (socket as any).displayName = user.displayName;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const displayName = (socket as any).displayName as string;

    console.log(`User connected: ${displayName} (${userId})`);

    const wasOffline = addUserSocket(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });

    if (wasOffline) {
      notifyFriendsPresence(io, userId, true);
    }

    // --- PRESENCE ---
    socket.on('presence:online', async () => {
      const wasOfflineOnPing = addUserSocket(userId, socket.id);

      if (wasOfflineOnPing) {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        notifyFriendsPresence(io, userId, true);
      }
    });

    // --- WEBRTC SIGNALING ---
    socket.on('voice:start', (data: { to: string; callId?: string }) => {
      const callId = data.callId ?? makeCallId(socket.id);
      const targetSocketId = getPrimarySocketId(data.to);

      if (!targetSocketId) {
        notifyVoiceUnavailable(socket, data.to, callId, 'Friend is not reachable');
        return;
      }

      activeCalls.set(callId, {
        callerUserId: userId,
        callerSocketId: socket.id,
        calleeUserId: data.to,
        calleeSocketId: targetSocketId,
      });

      io.to(targetSocketId).emit('voice:start', {
        from: userId,
        displayName,
        callId,
      });
    });

    socket.on('voice:offer', (data: { to: string; offer: any; callId?: string }) => {
      const callId = data.callId ?? makeCallId(socket.id);
      let call = activeCalls.get(callId);
      const targetSocketId = call?.calleeSocketId ?? getPrimarySocketId(data.to);

      if (!targetSocketId) {
        notifyVoiceUnavailable(socket, data.to, callId, 'Friend is not reachable');
        return;
      }

      if (!call) {
        call = {
          callerUserId: userId,
          callerSocketId: socket.id,
          calleeUserId: data.to,
          calleeSocketId: targetSocketId,
        };
        activeCalls.set(callId, call);
      }

      io.to(targetSocketId).emit('voice:offer', {
        from: userId,
        offer: data.offer,
        callId,
      });
    });

    socket.on('voice:answer', (data: { to: string; answer: any; callId?: string }) => {
      const call = data.callId ? activeCalls.get(data.callId) : undefined;
      const targetSocketId = call?.callerSocketId ?? getPrimarySocketId(data.to);

      if (!targetSocketId) {
        notifyVoiceUnavailable(socket, data.to, data.callId, 'Caller is not reachable');
        return;
      }

      io.to(targetSocketId).emit('voice:answer', {
        from: userId,
        answer: data.answer,
        callId: data.callId,
      });
    });

    socket.on('voice:ice-candidate', (data: { to: string; candidate: any; callId?: string }) => {
      const call = data.callId ? activeCalls.get(data.callId) : undefined;
      let targetSocketId: string | null = null;

      if (call) {
        targetSocketId =
          socket.id === call.callerSocketId ? call.calleeSocketId : call.callerSocketId;
      } else {
        targetSocketId = getPrimarySocketId(data.to);
      }

      if (!targetSocketId) {
        notifyVoiceUnavailable(socket, data.to, data.callId, 'Peer is not reachable');
        return;
      }

      io.to(targetSocketId).emit('voice:ice-candidate', {
        from: userId,
        candidate: data.candidate,
        callId: data.callId,
      });
    });

    socket.on('voice:end', (data: { to: string; callId?: string | null }) => {
      const call = data.callId ? activeCalls.get(data.callId) : undefined;
      let targetSocketId: string | null = null;

      if (call) {
        targetSocketId =
          socket.id === call.callerSocketId ? call.calleeSocketId : call.callerSocketId;
      } else {
        targetSocketId = getPrimarySocketId(data.to);
      }

      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:end', {
          from: userId,
          callId: data.callId ?? undefined,
        });
      }

      if (data.callId) {
        activeCalls.delete(data.callId);
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${displayName} (${userId})`);

      endCallsForSocket(io, socket.id);

      const isOffline = removeUserSocket(userId, socket.id);
      if (!isOffline) return;

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      notifyFriendsPresence(io, userId, false);
    });
  });

  return io;
}

async function notifyFriendsPresence(
  io: Server,
  userId: string,
  isOnline: boolean
) {
  try {
    const { Friendship } = await import('../models/Friendship');

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    for (const friendship of friendships) {
      const friendId =
        friendship.requester.toString() === userId
          ? friendship.recipient.toString()
          : friendship.requester.toString();

      if (isOnline) {
        emitToUser(io, friendId, 'friend:online', { userId });
      } else {
        emitToUser(io, friendId, 'friend:offline', {
          userId,
          lastSeen: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error notifying friends:', error);
  }
}

export { activeCalls, onlineUsers };
