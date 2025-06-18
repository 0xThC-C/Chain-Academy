import { Request } from 'express';

// User types
export interface User {
  address: string;
  chainId: number;
  nonce?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  address: string;
  username?: string;
  bio?: string;
  avatar?: string;
  isMentor: boolean;
  skills?: string[];
  hourlyRate?: number;
  currency?: 'USDT' | 'USDC';
  availability?: Availability;
  rating?: number;
  totalSessions?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  timezone: string;
  schedule: ScheduleSlot[];
}

export interface ScheduleSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

// Mentorship types
export interface Mentorship {
  id: string;
  mentorAddress: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  duration: number; // in minutes
  price: number;
  currency: 'USDT' | 'USDC';
  maxStudents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipSession {
  id: string;
  mentorshipId: string;
  mentorAddress: string;
  studentAddress: string;
  scheduledAt: Date;
  duration: number;
  price: number;
  currency: 'USDT' | 'USDC';
  status: SessionStatus;
  transactionHash?: string;
  roomId?: string;
  feedback?: SessionFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export interface SessionFeedback {
  rating: number;
  comment?: string;
  submittedBy: string;
  submittedAt: Date;
}

// Financial types
export interface Earnings {
  address: string;
  totalEarnings: {
    USDT: number;
    USDC: number;
  };
  pendingEarnings: {
    USDT: number;
    USDC: number;
  };
  withdrawnEarnings: {
    USDT: number;
    USDC: number;
  };
  earnings: EarningRecord[];
}

export interface EarningRecord {
  sessionId: string;
  amount: number;
  currency: 'USDT' | 'USDC';
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'withdrawn';
  transactionHash?: string;
  earnedAt: Date;
}

// Auth types
export interface AuthRequest extends Request {
  session: {
    siwe?: SiweMessage;
    nonce?: string;
    address?: string;
    chainId?: number;
    expirationTime?: string;
    lastIP?: string;
    lastActivity?: Date;
    switchCount?: number;
    touch?: () => void;
    destroy?: (callback?: (err?: any) => void) => void;
  };
  user?: {
    address: string;
    chainId?: number;
    authenticated: boolean;
    sessionId: string;
  };
  sessionID?: string;
}

export interface SiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

// WebRTC types
export interface WebRTCRoom {
  roomId: string;
  sessionId: string;
  participants: string[];
  createdAt: Date;
  config: RTCConfiguration;
}

export interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'chat-message' | 'screen-share' | 'media-state';
  from: string;
  to?: string;
  roomId: string;
  data?: any;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  from: string;
  message: string;
  timestamp: Date;
}

export interface MediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

export interface RoomParticipant {
  address: string;
  socketId: string;
  mediaState: MediaState;
  joinedAt: Date;
}