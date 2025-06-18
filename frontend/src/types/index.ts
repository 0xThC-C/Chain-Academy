// Core Types for Chain Academy V2
export interface User {
  id: string;
  address: string;
  ensName?: string;
  avatar?: string;
  bio?: string;
  skills: string[];
  isMentor: boolean;
  reputation: number;
  totalSessions: number;
  createdAt: Date;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  title: string;
  description: string;
  category: string;
  price: number; // in USDC
  duration: number; // in minutes
  skills: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  mentorshipId: string;
  menteeId: string;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentTxHash?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
}

// WebRTC Types
export interface MediaState {
  audio: boolean;
  video: boolean;
  screenShare: boolean;
}

export interface Participant {
  id: string;
  address: string;
  name?: string;
  mediaState: MediaState;
  joinedAt: Date;
  isLocal?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
}

// Progressive Payment Types
export interface SessionData {
  sessionId: string;
  student: string;
  mentor: string;
  paymentToken: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  sessionDuration: bigint;
  startTime: bigint;
  lastHeartbeat: bigint;
  pausedTime: bigint;
  createdAt: bigint;
  status: number;
  isActive: boolean;
  isPaused: boolean;
  surveyCompleted: boolean;
  platformFeeCollected?: boolean;
  elapsedTime?: bigint;
}

export interface PaymentHookState {
  sessionData: SessionData | null;
  isConnected: boolean;
  availablePayment: number;
  progressPercentage: number;
  timeElapsed: number;
  paymentReleased: number;
  needsHeartbeat: boolean;
  shouldAutoPause: boolean;
  isLoading: boolean;
  error: string | null;
  isStartingSession: boolean;
  isReleasingPayment: boolean;
  isSendingHeartbeat: boolean;
  isCompletingSession: boolean;
  lastHeartbeatTime: number;
  securityValidation: SecurityValidation;
  isPaused: boolean;
}

// UI Component Types
export interface ButtonVariant {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export interface ThemeState {
  darkMode: boolean;
  isDarkMode: boolean;
}

// Notification Types
export interface NotificationFeedback {
  sessionId: string;
  mentorAddress: string;
  studentAddress: string;
  mentorName: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  priority: 'low' | 'medium' | 'high';
  type: 'general' | 'payment_pending';
}

// Modal Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AlertModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Form Types
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// Enhanced Session Status with Security States
export enum EnhancedSessionStatus {
  CREATED = 0,
  ACTIVE = 1,
  PAUSED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
  AUTO_COMPLETED = 5,
  SECURITY_PAUSED = 6,
  EMERGENCY_STOPPED = 7
}

// Platform Fee Status
export enum PlatformFeeStatus {
  PENDING = 0,
  COLLECTED = 1,
  BYPASSED = 2,
  FAILED = 3
}

// Heartbeat Validation
export interface HeartbeatValidation {
  isValid: boolean;
  cooldownRemaining: number;
  timeSinceLastHeartbeat: number;
  consecutiveFailures: number;
}

// Payment Security
export interface PaymentSecurity {
  totalExpected: bigint;
  currentReleased: bigint;
  availableForRelease: bigint;
  platformFeeAmount: bigint;
  hasOverpaymentRisk: boolean;
  isWithinThreshold: boolean;
}

// Circuit Breaker State
export interface CircuitBreakerState {
  isTripped: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

// Utility Types
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  securityInfo?: SecurityValidation;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
}>;

// Event Handler Types
export type VoidFunction = () => void;
export type StringCallback = (value: string) => void;
export type NumberCallback = (value: number) => void;
export type BooleanCallback = (value: boolean) => void;

// Component Props Base Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Wallet Types
export interface WalletInfo {
  name: string;
  detected: boolean;
  installed: boolean;
  connected: boolean;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  network?: string;
  balance?: string;
}

// Error Types
export interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Session Room Types
export interface SessionRoomProps {
  sessionId: string;
  userAddress: string;
  onLeave: VoidFunction;
  isStudent?: boolean;
  mentorAddress?: string;
  mentorName?: string;
  sessionTitle?: string;
  sessionDuration?: number;
  totalAmount?: number;
}

// Security Types
export interface SecurityValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityConfig {
  heartbeatCooldown: number;
  maxSessionDuration: number;
  autoCompleteTimeout: number;
  platformFeePercentage: number;
  maxOverpaymentThreshold: number;
}

export interface AccessControl {
  hasStudentAccess: (address: string, sessionId: string) => boolean;
  hasMentorAccess: (address: string, sessionId: string) => boolean;
  hasAdminAccess: (address: string) => boolean;
  canAutoComplete: (sessionId: string) => boolean;
}

// Progressive Payment Hook Return Type
export interface ProgressivePaymentHook extends PaymentHookState {
  startProgressiveSession: VoidFunction;
  releaseProgressivePayment: VoidFunction;
  sendHeartbeat: VoidFunction;
  pauseSession: VoidFunction;
  resumeSession: VoidFunction;
  completeSession: (rating?: number, feedback?: string) => Promise<void>;
  autoCompleteSession: VoidFunction;
  handleWebRTCConnection: BooleanCallback;
  startTracking: VoidFunction;
  stopTracking: VoidFunction;
  validateSecurity: (sessionData: SessionData | null) => SecurityValidation;
  formatPaymentAmount: (amount: number) => string;
  getProgressPercentage: () => number;
  getTimeElapsedFormatted: () => string;
}

// WebRTC Context Types
export interface WebRTCContextType {
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  mediaState: MediaState;
  chatMessages: ChatMessage[];
  isInActiveSession: boolean;
  activeSession: ActiveSession | null;
  joinRoom: (roomId: string, userId: string, requestMedia?: boolean) => Promise<void>;
  leaveRoom: VoidFunction;
  sendChatMessage: StringCallback;
  toggleVideo: VoidFunction;
  toggleAudio: VoidFunction;
  startScreenShare: () => Promise<void>;
  stopScreenShare: VoidFunction;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  setActiveSession: (session: ActiveSession) => void;
  clearActiveSession: VoidFunction;
  requestLeaveSession: (onConfirm: VoidFunction, onCancel: VoidFunction) => void;
}

export interface ActiveSession {
  sessionId: string;
  mentorAddress: string;
  menteeAddress: string;
  startTime: Date;
  sessionType: 'video' | 'audio' | 'chat';
}

// Enhanced Component Prop Types with Better Generics
export interface ComponentWithChildren extends BaseComponentProps {
  children: React.ReactNode;
}

export interface ComponentWithOptionalChildren extends BaseComponentProps {
  children?: React.ReactNode;
}

// Union types for better type safety
export type SessionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'auto_completed' | 'security_paused';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'general' | 'payment_pending' | 'security_alert' | 'platform_fee';
export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'security';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariantType = 'primary' | 'secondary' | 'ghost' | 'danger' | 'security';
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export type PaymentValidationType = 'heartbeat' | 'amount' | 'timing' | 'access_control' | 'platform_fee';

// Utility type for making all properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Security-aware utility types
export type SecureSession<T = SessionData> = T & {
  securityValidation: SecurityValidation;
  accessControl: AccessControl;
  paymentSecurity: PaymentSecurity;
};

export type WithSecurity<T> = T & {
  securityLevel: SecurityLevel;
  validationChecks: PaymentValidationType[];
  lastSecurityCheck: number;
};

// Authentication Types
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

export interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  sessionToken: string | null;
  sessionExpiry: Date | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
}

export interface AuthSession {
  token: string;
  expiry: string;
  address: string;
  timestamp: number;
}

export interface NonceData {
  timestamp: number;
  used: boolean;
}

export interface SessionValidation {
  valid: boolean;
  expired: boolean;
  payload?: any;
}

// Enhanced Type Guards with Security Validation
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidNonce = (nonce: string): boolean => {
  return /^[a-f0-9]{64}$/.test(nonce);
};

export const isValidSessionToken = (token: string): boolean => {
  try {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch {
    return false;
  }
};

export const isValidSessionId = (sessionId: string): boolean => {
  return sessionId.length > 0 && sessionId.length <= 100;
};

export const isSecureSessionId = (sessionId: string): boolean => {
  // Enhanced validation for deterministic session IDs
  return sessionId.startsWith('0x') && sessionId.length === 66;
};

export const validateHeartbeatTiming = (lastHeartbeat: number, cooldown: number): HeartbeatValidation => {
  const now = Date.now();
  const timeSince = now - lastHeartbeat;
  const isValid = timeSince >= cooldown;
  
  return {
    isValid,
    cooldownRemaining: Math.max(0, cooldown - timeSince),
    timeSinceLastHeartbeat: timeSince,
    consecutiveFailures: 0 // This would be tracked separately
  };
};

export const validatePaymentSecurity = (
  totalAmount: bigint,
  releasedAmount: bigint,
  availablePayment: bigint,
  platformFeePercentage: number
): PaymentSecurity => {
  const platformFeeAmount = (totalAmount * BigInt(platformFeePercentage)) / BigInt(100);
  const maxAllowablePayment = totalAmount - platformFeeAmount;
  const potentialTotal = releasedAmount + availablePayment;
  
  return {
    totalExpected: totalAmount,
    currentReleased: releasedAmount,
    availableForRelease: availablePayment,
    platformFeeAmount,
    hasOverpaymentRisk: potentialTotal > maxAllowablePayment,
    isWithinThreshold: potentialTotal <= maxAllowablePayment
  };
};

export const isSessionSecure = (sessionData: SessionData | null): SecurityValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!sessionData) {
    errors.push('No session data available');
    return { isValid: false, errors, warnings };
  }
  
  // Check for platform fee collection
  if (!sessionData.platformFeeCollected && sessionData.status >= EnhancedSessionStatus.COMPLETED) {
    errors.push('Platform fee not collected for completed session');
  }
  
  // Check session duration
  const now = Math.floor(Date.now() / 1000);
  const sessionDuration = now - Number(sessionData.startTime);
  if (sessionDuration > 14400) { // 4 hours
    warnings.push('Session exceeds maximum duration');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};