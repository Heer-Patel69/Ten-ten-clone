import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  userCode: string;
  displayName: string;
  password: string;
  isOnline: boolean;
  lastSeen: Date;
  role: 'user' | 'admin';
  pushSubscription: any;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    userCode: {
      type: String,
      unique: true,
      required: true,
      match: /^\d{4}$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    pushSubscription: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in JSON
userSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUserDocument>('User', userSchema);

// Generate unique 4-digit code
export async function generateUniqueCode(): Promise<string> {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const existing = await User.findOne({ userCode: code });
    if (!existing) return code;
  }
  throw new Error('Unable to generate unique code. Database may be full.');
}
