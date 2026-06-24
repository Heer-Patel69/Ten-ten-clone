import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendshipDocument extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendshipDocument>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate friendships
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Index for querying user's friends efficiently
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

export const Friendship = mongoose.model<IFriendshipDocument>(
  'Friendship',
  friendshipSchema
);
