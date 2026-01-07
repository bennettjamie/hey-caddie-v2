/**
 * Logging Utility
 * Centralized logging system for HeyCaddie
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Environment-aware (disabled in production)
 * - Structured logging with context
 * - Integration-ready for error tracking services (Sentry, etc.)
 * - Performance timing utilities
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export interface LoggerConfig {
  /** Minimum log level to output (default: 'debug' in dev, 'warn' in prod) */
  minLevel?: LogLevel;

  /** Enable/disable logging (default: true in dev, false in prod for debug/info) */
  enabled?: boolean;

  /** Prefix for all log messages (default: '[HeyCaddie]') */
  prefix?: string;

  /** Enable timestamps in logs (default: true) */
  timestamps?: boolean;

  /** Enable stack traces for errors (default: true) */
  stackTraces?: boolean;

  /** External error tracking service (e.g., Sentry) */
  errorTracker?: {
    captureException: (error: Error, context?: any) => void;
    captureMessage: (message: string, level: string, context?: any) => void;
  };
}

// ============================================================================
// LOG LEVELS
// ============================================================================

const LOG_LEVELS: { [key in LogLevel]: number } = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_LEVEL_COLORS: { [key in LogLevel]: string } = {
  debug: '#6B7280', // Gray
  info: '#3B82F6',  // Blue
  warn: '#F59E0B',  // Orange
  error: '#EF4444', // Red
};

// ============================================================================
// LOGGER CLASS
// ============================================================================

type ResolvedLoggerConfig = Required<Omit<LoggerConfig, 'errorTracker'>> & {
  errorTracker: LoggerConfig['errorTracker'] | null;
};

class Logger {
  private config: ResolvedLoggerConfig;
  private timers: Map<string, number> = new Map();

  constructor(config?: LoggerConfig) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.config = {
      minLevel: config?.minLevel ?? (isDevelopment ? 'debug' : 'warn'),
      enabled: config?.enabled ?? isDevelopment,
      prefix: config?.prefix ?? '[HeyCaddie]',
      timestamps: config?.timestamps ?? true,
      stackTraces: config?.stackTraces ?? true,
      errorTracker: config?.errorTracker ?? null,
    };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled && (level === 'debug' || level === 'info')) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format timestamp
   */
  private getTimestamp(): string {
    if (!this.config.timestamps) return '';
    const now = new Date();
    return `[${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
  }

  /**
   * Format log message with metadata
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string[] {
    const parts: string[] = [];

    if (this.config.timestamps) {
      parts.push(this.getTimestamp());
    }

    parts.push(this.config.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts;
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const formattedParts = this.formatMessage(level, message, context);
    const consoleMethod = level === 'debug' ? 'log' : level;

    // Browser console styling (only works in browser, not Node.js)
    if (typeof window !== 'undefined' && level !== 'error') {
      console[consoleMethod](
        `%c${formattedParts.join(' ')}`,
        `color: ${LOG_LEVEL_COLORS[level]}; font-weight: ${level === 'warn' ? 'bold' : 'normal'}`
      );
    } else {
      console[consoleMethod](...formattedParts);
    }

    // Log context if provided
    if (context && Object.keys(context).length > 0) {
      console[consoleMethod]('Context:', context);
    }

    // Log error with stack trace if provided
    if (error) {
      if (this.config.stackTraces && error.stack) {
        console.error('Stack:', error.stack);
      } else {
        console.error('Error:', error);
      }

      // Send to external error tracker
      if (this.config.errorTracker && level === 'error') {
        this.config.errorTracker.captureException(error, context);
      }
    }
  }

  /**
   * Debug level - Detailed information for debugging
   * Only shown in development
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level - General informational messages
   * Only shown in development
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warn level - Warning messages
   * Shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);

    // Send warnings to error tracker
    if (this.config.errorTracker) {
      this.config.errorTracker.captureMessage(message, 'warning', context);
    }
  }

  /**
   * Error level - Error messages
   * Shown in all environments
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log('error', message, context, errorObj);
  }

  // ============================================================================
  // SPECIALIZED LOGGING METHODS
  // ============================================================================

  /**
   * Log round-related events
   */
  round(action: string, details?: LogContext): void {
    this.info(`Round: ${action}`, details);
  }

  /**
   * Log betting-related events
   */
  betting(action: string, details?: LogContext): void {
    this.info(`Betting: ${action}`, details);
  }

  /**
   * Log MRTZ-related events
   */
  mrtz(action: string, details?: LogContext): void {
    this.info(`MRTZ: ${action}`, details);
  }

  /**
   * Log voice recognition events
   */
  voice(action: string, details?: LogContext): void {
    this.debug(`Voice: ${action}`, details);
  }

  /**
   * Log sync-related events
   */
  sync(action: string, details?: LogContext): void {
    this.info(`Sync: ${action}`, details);
  }

  /**
   * Log Firebase operations
   */
  firebase(action: string, details?: LogContext): void {
    this.debug(`Firebase: ${action}`, details);
  }

  /**
   * Log storage operations
   */
  storage(action: string, details?: LogContext): void {
    this.debug(`Storage: ${action}`, details);
  }

  /**
   * Log API calls
   */
  api(method: string, endpoint: string, details?: LogContext): void {
    this.debug(`API: ${method} ${endpoint}`, details);
  }

  // ============================================================================
  // PERFORMANCE TIMING
  // ============================================================================

  /**
   * Start a performance timer
   */
  time(label: string): void {
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }

  /**
   * End a performance timer and log the duration
   */
  timeEnd(label: string): void {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);

    this.debug(`Timer ended: ${label}`, { duration: `${duration.toFixed(2)}ms` });
  }

  /**
   * Log duration without ending the timer
   */
  timeLog(label: string, message?: string): void {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }

    const duration = performance.now() - startTime;
    const logMessage = message
      ? `${label}: ${message}`
      : `${label} checkpoint`;

    this.debug(logMessage, { duration: `${duration.toFixed(2)}ms` });
  }

  // ============================================================================
  // GROUPING (for complex operations)
  // ============================================================================

  /**
   * Start a collapsible group in console
   */
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  /**
   * Start a collapsed group in console
   */
  groupCollapsed(label: string): void {
    if (this.shouldLog('debug')) {
      console.groupCollapsed(`${this.config.prefix} ${label}`);
    }
  }

  /**
   * End the current group
   */
  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // ============================================================================
  // TABLE LOGGING (for structured data)
  // ============================================================================

  /**
   * Log data in table format
   */
  table(data: any[], columns?: string[]): void {
    if (!this.shouldLog('debug')) return;

    console.log(`${this.config.prefix} Table:`);
    if (columns) {
      console.table(data, columns);
    } else {
      console.table(data);
    }
  }

  // ============================================================================
  // ASSERTION
  // ============================================================================

  /**
   * Assert a condition and log error if false
   */
  assert(condition: boolean, message: string, context?: LogContext): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`, new Error(message), context);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default logger instance
 * Import and use throughout the application
 */
export const logger = new Logger();

// ============================================================================
// LEGACY CONSOLE REPLACEMENT (optional)
// ============================================================================

/**
 * Override native console methods with logger
 * Call this once in your app initialization if you want to capture all console calls
 *
 * WARNING: This is aggressive and may interfere with debugging.
 * Use only if you want to force all console usage through the logger.
 */
export function replaceConsole(): void {
  const originalConsole = { ...console };

  console.log = (...args: any[]) => logger.debug(args.join(' '));
  console.info = (...args: any[]) => logger.info(args.join(' '));
  console.warn = (...args: any[]) => logger.warn(args.join(' '));
  console.error = (...args: any[]) => logger.error(args.join(' '));

  // Store original console for emergencies
  (window as any).__originalConsole = originalConsole;
}

/**
 * Restore original console methods
 */
export function restoreConsole(): void {
  if ((window as any).__originalConsole) {
    Object.assign(console, (window as any).__originalConsole);
    delete (window as any).__originalConsole;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a logger instance with custom configuration
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Enable debug logging (useful for troubleshooting in production)
 */
export function enableDebugLogging(): void {
  logger.configure({
    enabled: true,
    minLevel: 'debug',
  });
  logger.info('Debug logging enabled');
}

/**
 * Disable all logging (useful for tests)
 */
export function disableLogging(): void {
  logger.configure({
    enabled: false,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default logger;
