import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  content: { type: String, required: true }, // Can be encrypted text or base64 image
  type: { type: String, enum: ['TEXT', 'IMAGE', 'GIF', 'STICKER'], default: 'TEXT' },
  isAnonymous: { type: Boolean, default: false },
  anonymousName: { type: String }, // Random fun nickname
  isViewed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Message = mongoose.model('Message', MessageSchema);
