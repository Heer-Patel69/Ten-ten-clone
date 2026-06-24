// ============================================
// Ten Ten Clone — Shared Types
// ============================================

// --- User ---
export interface IUser {
  _id: string;
  userCode: string;        // 4-digit unique code (e.g., "1234")
  displayName: string;
  password?: string;       // never sent to client
  isOnline: boolean;
  lastSeen: string;
  role: 'user' | 'admin';
  pushSubscription?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IUserPublic {
  _id: string;
  userCode: string;
  displayName: string;
  isOnline: boolean;
  lastSeen: string;
}

// --- Auth ---
export interface RegisterRequest {
  displayName: string;
  password: string;
}

export interface RegisterResponse {
  user: IUserPublic;
  userCode: string;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  userCode: string;
  password: string;
}

export interface LoginResponse {
  user: IUserPublic;
  accessToken: string;
  refreshToken: string;
}

// --- Friendship ---
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface IFriendship {
  _id: string;
  requester: string | IUserPublic;
  recipient: string | IUserPublic;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Report ---
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface IReport {
  _id: string;
  reporter: string | IUserPublic;
  reportedUser: string | IUserPublic;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  resolution?: string;
  resolvedBy?: string | IUserPublic;
  createdAt: string;
  updatedAt: string;
}

// --- Socket Events ---
export interface ServerToClientEvents {
  // Presence
  'friend:online': (data: { userId: string }) => void;
  'friend:offline': (data: { userId: string; lastSeen: string }) => void;

  // Friend requests
  'friend:request': (data: { friendship: IFriendship }) => void;
  'friend:accepted': (data: { friendship: IFriendship }) => void;
  'friend:removed': (data: { userId: string }) => void;

  // WebRTC Signaling
  'voice:offer': (data: { from: string; offer: RTCSessionDescriptionInit; callId?: string }) => void;
  'voice:answer': (data: { from: string; answer: RTCSessionDescriptionInit; callId?: string }) => void;
  'voice:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit; callId?: string }) => void;
  'voice:start': (data: { from: string; displayName: string; callId?: string }) => void;
  'voice:end': (data: { from: string; callId?: string }) => void;
  'voice:unavailable': (data: { to: string; callId?: string; reason?: string }) => void;
}

export interface ClientToServerEvents {
  // Presence
  'presence:online': () => void;

  // WebRTC Signaling
  'voice:offer': (data: { to: string; offer: RTCSessionDescriptionInit; callId?: string }) => void;
  'voice:answer': (data: { to: string; answer: RTCSessionDescriptionInit; callId?: string }) => void;
  'voice:ice-candidate': (data: { to: string; candidate: RTCIceCandidateInit; callId?: string }) => void;
  'voice:start': (data: { to: string; callId?: string }) => void;
  'voice:end': (data: { to: string; callId?: string | null }) => void;
}

// --- API Response Wrapper ---
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// --- Constants ---
export const MAX_FRIENDS = 10;
export const USER_CODE_LENGTH = 4;
export const MIN_PASSWORD_LENGTH = 6;
export const ACCESS_TOKEN_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY = '7d';
