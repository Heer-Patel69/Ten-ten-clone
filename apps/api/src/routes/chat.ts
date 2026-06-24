import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Message } from '../models/Message';
import { encrypt, decrypt } from '../utils/crypto';

const router = Router();

// Get unviewed messages for a specific peer
router.get('/:peerId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user?._id, receiverId: req.params.peerId },
        { senderId: req.params.peerId, receiverId: req.user?._id }
      ],
      isViewed: false // Only fetch unviewed messages
    }).sort({ createdAt: 1 }).populate('senderId', 'displayName userCode');

    // Decrypt messages before sending to client
    const decryptedMessages = messages.map(msg => {
      const doc = msg.toObject();
      if (doc.type === 'TEXT') {
        doc.content = decrypt(doc.content);
      }
      return doc;
    });

    res.json({ success: true, data: decryptedMessages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Mark message as viewed (Snapchat style auto-delete)
router.post('/view', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.body;
    
    // We physically delete it instead of just marking isViewed = true
    // This satisfies the "gone forever" requirement.
    const deleted = await Message.findOneAndDelete({ 
      _id: messageId,
      $or: [{ receiverId: req.user?._id }, { senderId: req.user?._id }] 
    });

    if (deleted) {
      // Notify sender that it was viewed (and deleted)
      const io = req.app.get('io');
      if (io) {
        io.to(deleted.senderId.toString()).emit('chat:viewed', { messageId, from: req.user?._id });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark viewed' });
  }
});

// Send a message via REST (fallback, usually sent via sockets but good for large images)
router.post('/send', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, groupId, content, type, isAnonymous, anonymousName } = req.body;

    let finalContent = content;
    // Encrypt TEXT messages only (Images are base64, encrypting them takes too much CPU, we just delete them instantly anyway)
    if (type === 'TEXT') {
      finalContent = encrypt(content);
    }

    const message = await Message.create({
      senderId: req.user?._id,
      receiverId,
      groupId,
      content: finalContent,
      type,
      isAnonymous,
      anonymousName
    });

    const populatedMsg = await message.populate('senderId', 'displayName userCode');
    
    // Decrypt for the real-time event broadcast
    const eventMsg = populatedMsg.toObject();
    if (eventMsg.type === 'TEXT') {
      eventMsg.content = decrypt(eventMsg.content);
    }

    const io = req.app.get('io');
    if (io) {
      if (groupId) {
        io.to(groupId).emit('chat:receive', { message: eventMsg });
      } else if (receiverId) {
        io.to(receiverId).emit('chat:receive', { message: eventMsg });
        // Also emit to self for multi-device sync
        io.to(req.user?._id.toString()).emit('chat:receive', { message: eventMsg });
      }
    }

    res.json({ success: true, data: eventMsg });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;
