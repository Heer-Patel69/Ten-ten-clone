import mongoose from 'mongoose';

const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true }, // Base64 or external link
  type: { type: String, enum: ['IMAGE', 'VIDEO', 'TEXT'], default: 'IMAGE' },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL index: auto deletes after 24 hours (86400 seconds)
});

export const Story = mongoose.model('Story', StorySchema);
