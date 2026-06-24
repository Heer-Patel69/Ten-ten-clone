import mongoose, { Schema, Document } from 'mongoose';

export interface IReportDocument extends Document {
  reporter: mongoose.Types.ObjectId;
  reportedUser: mongoose.Types.ObjectId;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReportDocument>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'other'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
    resolution: {
      type: String,
      maxlength: 500,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model<IReportDocument>('Report', reportSchema);
