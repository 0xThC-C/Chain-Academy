// Application constants

export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
} as const;

export const SUPPORTED_CURRENCIES = ['USDT', 'USDC'] as const;

export const SESSION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;

export const PLATFORM_FEE_PERCENTAGE = 10; // 10%

export const SESSION_CONSTRAINTS = {
  MIN_DURATION: 30, // 30 minutes
  MAX_DURATION: 480, // 8 hours
  MAX_STUDENTS_PER_SESSION: 10,
} as const;

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  MENTORSHIP_TITLE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 100,
  },
  MENTORSHIP_DESCRIPTION: {
    MIN_LENGTH: 20,
    MAX_LENGTH: 1000,
  },
  FEEDBACK_COMMENT: {
    MAX_LENGTH: 500,
  },
} as const;

export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10,
  },
} as const;