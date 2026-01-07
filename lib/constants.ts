/**
 * Application Constants
 * Central location for all magic numbers, strings, and configuration values
 */

// ============================================================================
// ROUND CONFIGURATION
// ============================================================================

/**
 * Maximum age (in minutes) for a round to be considered "recent" and restorable
 */
export const MAX_ROUND_AGE_MINUTES = 30;

/**
 * Round status values
 */
export const ROUND_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
} as const;

export type RoundStatus = typeof ROUND_STATUS[keyof typeof ROUND_STATUS];

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

/**
 * Keys used for localStorage persistence
 */
export const STORAGE_KEYS = {
  // Round data
  CURRENT_ROUND: 'currentRound',
  CACHED_ROUNDS: 'cachedRounds',
  ROUND_HISTORY: 'roundHistory',

  // Betting data
  FUNDATORY_BETS: 'fundatoryBets',
  ACTIVE_BETS: 'activeBets',
  CARRY_OVER_BETS: 'carryOverBets',

  // MRTZ data
  MRTZ_BALANCES: 'mrtzBalances',

  // Course data
  COURSES: 'courses',
  RECENT_COURSES: 'recentCourses',
  RECENT_COURSES_DATA: 'recentCoursesData',

  // Player data
  PLAYERS: 'players',
  RECENT_PLAYERS: 'recentPlayers',

  // UI settings
  THEME: 'theme',
  PWA_INSTALL_PROMPT_SEEN: 'pwa-install-prompt-seen',

  // Voice personality
  VOICE_PERSONALITY_MODE: 'voicePersonalityMode',
  VOICE_JOKE_HISTORY: 'voiceJokeHistory',

  // Sync queue
  SYNC_QUEUE: 'syncQueue',
} as const;

// ============================================================================
// BETTING TYPES
// ============================================================================

/**
 * Types of bets available in the app
 */
export const BET_TYPES = {
  FUNDATORY: 'fundatory',
  SKINS: 'skins',
  NASSAU: 'nassau',
} as const;

export type BetType = typeof BET_TYPES[keyof typeof BET_TYPES];

/**
 * Fundatory bet outcome statuses
 */
export const FUNDATORY_STATUS = {
  SUCCESS: 'success',
  FAIL: 'fail',
  PENDING: 'pending',
} as const;

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

/**
 * Configuration for offline sync operations
 */
export const SYNC_CONFIG = {
  /** Maximum number of retry attempts for failed sync operations */
  MAX_RETRIES: 3,

  /** Delay (ms) before retrying a failed sync operation */
  RETRY_DELAY_MS: 500,

  /** Delay (ms) before retrying sync queue processing */
  QUEUE_RETRY_DELAY_MS: 1000,

  /** Delay (ms) for operation processing */
  OPERATION_DELAY_MS: 100,
} as const;

// ============================================================================
// UI TIMEOUTS & ANIMATIONS
// ============================================================================

/**
 * Timeouts and delays for UI interactions and animations
 */
export const UI_TIMEOUTS = {
  /** Delay before hiding the "starting voice" indicator */
  VOICE_START_INDICATOR_MS: 2000,

  /** Duration of hole-in-one animation */
  HOLE_IN_ONE_ANIMATION_MS: 3000,

  /** Duration of snowman (8 on par 3) animation */
  SNOWMAN_ANIMATION_MS: 2000,

  /** Duration of turkey (3 consecutive birdies) animation */
  TURKEY_ANIMATION_MS: 3000,

  /** Duration of birdie animation */
  BIRDIE_ANIMATION_MS: 2000,

  /** Delay before showing PWA install prompt */
  PWA_INSTALL_PROMPT_DELAY_MS: 3000,

  /** Duration before auto-closing achievement toast */
  ACHIEVEMENT_TOAST_DURATION_MS: 300,

  /** Delay between course scraping operations */
  COURSE_SCRAPE_DELAY_MS: 2000,
} as const;

// ============================================================================
// FIREBASE TIMEOUTS
// ============================================================================

/**
 * Timeout values for Firebase operations
 */
export const FIREBASE_TIMEOUTS = {
  /** Timeout for Firebase query operations (30 seconds) */
  QUERY_TIMEOUT_MS: 30000,

  /** Timeout for Firebase write operations (10 seconds) */
  OPERATION_TIMEOUT_MS: 10000,
} as const;

// ============================================================================
// CACHE & HISTORY LIMITS
// ============================================================================

/**
 * Limits for cached data and history
 */
export const CACHE_LIMITS = {
  /** Maximum number of cached rounds to store */
  MAX_CACHED_ROUNDS: 50,

  /** Maximum number of rounds to keep in history */
  MAX_ROUND_HISTORY: 50,

  /** Maximum number of recent courses to display */
  MAX_RECENT_COURSES_DISPLAY: 5,

  /** Maximum number of recent courses to store */
  MAX_RECENT_COURSES_STORED: 10,

  /** Maximum number of nearby courses to display */
  MAX_NEARBY_COURSES: 5,

  /** Maximum number of recent players to display */
  MAX_RECENT_PLAYERS_DISPLAY: 20,

  /** Maximum number of recent players to track */
  MAX_RECENT_PLAYERS_STORED: 10,
} as const;

// ============================================================================
// QUERY LIMITS
// ============================================================================

/**
 * Limits for database queries
 */
export const QUERY_LIMITS = {
  /** Default limit for MRTZ ledger queries */
  MRTZ_LEDGER_DEFAULT: 100,

  /** Maximum number of player suggestions to show */
  PLAYER_SUGGESTIONS: 5,

  /** Number of recent rounds to analyze for statistics */
  STATS_RECENT_ROUNDS: 3,

  /** Maximum number of best rounds to display */
  BEST_ROUNDS_DISPLAY: 10,

  /** Maximum number of players to show in history preview */
  HISTORY_PLAYER_PREVIEW: 3,
} as const;

// ============================================================================
// SCORE TERMS
// ============================================================================

/**
 * Voice recognition score terms and their relative par values
 */
export const SCORE_TERMS: { [key: string]: number } = {
  // Eagle and better
  'ace': -2,
  'hole in one': -2,
  'double eagle': -3,
  'albatross': -3,
  'eagle': -2,

  // Birdie
  'birdie': -1,
  'birdy': -1,

  // Par
  'par': 0,

  // Bogey
  'bogey': 1,
  'bogie': 1,
  'bogy': 1,

  // Double bogey and worse
  'double bogey': 2,
  'double bogie': 2,
  'triple bogey': 3,
  'triple bogie': 3,
  'quadruple bogey': 4,

  // Specific scores
  'snowman': 8, // 8 on a par 3
} as const;

// ============================================================================
// VOICE RECOGNITION
// ============================================================================

/**
 * Configuration for voice recognition
 */
export const VOICE_CONFIG = {
  /** Hotword phrase to activate voice commands */
  HOTWORD: 'hey caddie',

  /** Alternative hotword variations */
  HOTWORD_VARIATIONS: ['hey caddy', 'hey cady', 'hey katie'],

  /** Debounce delay for voice input (ms) */
  DEBOUNCE_MS: 300,

  /** Timeout for voice recognition (ms) */
  TIMEOUT_MS: 5000,

  /** Maximum retry count for voice recognition failures */
  MAX_RETRIES: 5,
} as const;

// ============================================================================
// VOICE PERSONALITY
// ============================================================================

/**
 * Configuration for voice personality system
 */
export const PERSONALITY_CONFIG = {
  /** Available personality modes */
  MODES: ['casual', 'professional', 'funny', 'encouraging'] as const,

  /** Default personality mode */
  DEFAULT_MODE: 'casual' as const,

  /** Number of recent jokes to track (avoid repetition) */
  JOKE_HISTORY_SIZE: 20,

  /** Pause duration between joke setup and punchline (ms) */
  JOKE_PAUSE_MS: 1500,
} as const;

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

/**
 * Types of achievements that can be earned
 */
export const ACHIEVEMENT_TYPES = {
  HOLE_IN_ONE: 'hole_in_one',
  EAGLE: 'eagle',
  BIRDIE_STREAK: 'birdie_streak',
  TURKEY: 'turkey', // 3 consecutive birdies
  SNOWMAN: 'snowman', // 8 on a par 3
  PERFECT_ROUND: 'perfect_round',
  UNDER_PAR: 'under_par',
} as const;

export type AchievementType = typeof ACHIEVEMENT_TYPES[keyof typeof ACHIEVEMENT_TYPES];

// ============================================================================
// MRTZ STATUS
// ============================================================================

/**
 * Status values for MRTZ ledger entries
 */
export const MRTZ_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
} as const;

export type MRTZStatus = typeof MRTZ_STATUS[keyof typeof MRTZ_STATUS];

// ============================================================================
// SETTLEMENT TYPES
// ============================================================================

/**
 * Types of MRTZ settlements
 */
export const SETTLEMENT_TYPES = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  GOOD_DEED: 'good_deed',
} as const;

export type SettlementType = typeof SETTLEMENT_TYPES[keyof typeof SETTLEMENT_TYPES];

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Validation rules and limits
 */
export const VALIDATION = {
  /** Minimum number of holes for a valid round */
  MIN_HOLES: 1,

  /** Standard number of holes in a round */
  STANDARD_HOLES: 18,

  /** Maximum number of holes allowed */
  MAX_HOLES: 27,

  /** Minimum par value for a hole */
  MIN_PAR: 2,

  /** Maximum par value for a hole */
  MAX_PAR: 6,

  /** Typical par for a full 18-hole round */
  STANDARD_PAR: 54,

  /** Minimum number of players for a round */
  MIN_PLAYERS: 1,

  /** Maximum number of players for a round */
  MAX_PLAYERS: 8,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  FIREBASE_TIMEOUT: 'Firebase operation timed out',
  FIREBASE_QUERY_TIMEOUT: 'Firebase query timed out',
  NETWORK_ERROR: 'Network error occurred',
  SYNC_FAILED: 'Sync operation failed',
  INVALID_ROUND_DATA: 'Invalid round data',
  NO_ACTIVE_ROUND: 'No active round found',
  PLAYER_NOT_FOUND: 'Player not found',
  COURSE_NOT_FOUND: 'Course not found',
} as const;

// ============================================================================
// COURSE LAYOUTS
// ============================================================================

/**
 * Standard course layout types
 */
export const COURSE_LAYOUTS = {
  RED: 'red',
  BLUE: 'blue',
  GOLD: 'gold',
  WHITE: 'white',
  CUSTOM: 'custom',
} as const;

export type CourseLayout = typeof COURSE_LAYOUTS[keyof typeof COURSE_LAYOUTS];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a value is a valid round status
 */
export function isValidRoundStatus(status: string): status is RoundStatus {
  return Object.values(ROUND_STATUS).includes(status as RoundStatus);
}

/**
 * Check if a value is a valid bet type
 */
export function isValidBetType(type: string): type is BetType {
  return Object.values(BET_TYPES).includes(type as BetType);
}

/**
 * Check if a value is a valid MRTZ status
 */
export function isValidMRTZStatus(status: string): status is MRTZStatus {
  return Object.values(MRTZ_STATUS).includes(status as MRTZStatus);
}

/**
 * Check if a value is a valid settlement type
 */
export function isValidSettlementType(type: string): type is SettlementType {
  return Object.values(SETTLEMENT_TYPES).includes(type as SettlementType);
}
