import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';

// Map userId -> socketId for routing messages
const onlineUsers = new Map<string, string>();

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
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

    console.log(`🟢 User connected: ${displayName} (${userId})`);

    // Track online status
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Notify friends that this user is online
    notifyFriendsPresence(io, userId, true);

    // --- PRESENCE ---
    socket.on('presence:online', () => {
      onlineUsers.set(userId, socket.id);
    });

    // --- WEBRTC SIGNALING ---

    // User starts talking to a friend
    socket.on('voice:start', (data: { to: string }) => {
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:start', {
          from: userId,
          displayName,
        });
      }
    });

    // WebRTC offer
    socket.on('voice:offer', (data: { to: string; offer: any }) => {
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:offer', {
          from: userId,
          offer: data.offer,
        });
      }
    });

    // WebRTC answer
    socket.on('voice:answer', (data: { to: string; answer: any }) => {
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:answer', {
          from: userId,
          answer: data.answer,
        });
      }
    });

    // ICE candidate exchange
    socket.on('voice:ice-candidate', (data: { to: string; candidate: any }) => {
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:ice-candidate', {
          from: userId,
          candidate: data.candidate,
        });
      }
    });

    // User stops talking
    socket.on('voice:end', (data: { to: string }) => {
      const targetSocketId = onlineUsers.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:end', { from: userId });
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`🔴 User disconnected: ${displayName} (${userId})`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      notifyFriendsPresence(io, userId, false);
    });
  });

  return io;
}

// Helper: notify all friends about online/offline status
async function notifyFriendsPresence(
  io: Server,
  userId: string,
  isOnline: boolean
) {
  try {
    // Import here to avoid circular dependency
    const { Friendship } = await import('../models/Friendship');

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    for (const f of friendships) {
      const friendId =
        f.requester.toString() === userId
          ? f.recipient.toString()
          : f.requester.toString();

      const friendSocketId = onlineUsers.get(friendId);
      if (friendSocketId) {
        if (isOnline) {
          io.to(friendSocketId).emit('friend:online', { userId });
        } else {
          io.to(friendSocketId).emit('friend:offline', {
            userId,
            lastSeen: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error notifying friends:', error);
  }
}

export { onlineUsers };
