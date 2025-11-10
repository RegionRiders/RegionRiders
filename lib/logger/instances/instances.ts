import pino from 'pino';
import { getLoggerConfig, isProduction, isServer, isTest } from '../config';

/**
 * Check if we're in a server environment
 */
// const isServer = typeof window === 'undefined';

/**
 * Cached logger instance
 */
let cachedLogger: pino.Logger | BrowserLogger | null = null;

/**
 * Create the appropriate logger based on environment
 * In development, uses pino-pretty stream (not transport) to avoid worker threads
 * In production, uses structured JSON logging
 * In browser, uses console fallback
 */
function createServerLogger(): pino.Logger {
  const config = getLoggerConfig();

  // In development, use pino-pretty as a stream (not transport) to avoid worker threads
  if (!isProduction && !isTest && isServer) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pretty = require('pino-pretty');
      const prettyStream = pretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      });

      return pino(config, prettyStream);
    } catch (error) {
      // Fallback to regular pino if pino-pretty is not available
      console.warn('pino-pretty not available, using standard pino logging');
      return pino(config);
    }
  }

  // For production or test, use standard pino
  return pino(config);
}

/**
 * Get or create the logger instance
 */
function getLogger(): pino.Logger | BrowserLogger {
  if (!cachedLogger) {
    cachedLogger = isServer ? createServerLogger() : createBrowserLogger();
  }
  return cachedLogger!; // Non-null assertion - cachedLogger is always initialized above
}

/**
 * Main application logger instance
 * This is the primary logger used throughout the application
 * In browser environment, uses console as fallback
 */
export const logger = new Proxy({} as pino.Logger, {
  get(_target, prop) {
    const loggerInstance = getLogger();
    return (loggerInstance as any)[prop];
  },
});

/**
 * Logger specifically for API routes
 */
export const apiLogger = logger.child({ context: 'api' });

/**
 * Logger specifically for Strava integration
 */
export const stravaLogger = logger.child({ context: 'strava' });

/**
 * Logger specifically for authentication flows
 */
export const authLogger = logger.child({ context: 'auth' });

/**
 * Logger specifically for database operations
 */
export const dbLogger = logger.child({ context: 'database' });

/**
 * Type definition for browser-safe logger
 * Implements a subset of pino.Logger interface using console methods
 */
export interface BrowserLogger {
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => BrowserLogger;
}

/**
 * Browser-safe logger that prevents errors when running client-side
 * Uses console methods as fallback in browser environment
 */
export function createBrowserLogger(): BrowserLogger {
  return {
    trace: (...args: unknown[]) => console.trace(...args),
    debug: (...args: unknown[]) => console.debug(...args),
    info: (...args: unknown[]) => console.info(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    fatal: (...args: unknown[]) => console.error('[FATAL]', ...args),
    child: (bindings: Record<string, unknown>) => {
      const childLogger = createBrowserLogger();
      // Prefix all logs with the child context
      const contextStr = JSON.stringify(bindings);
      return {
        ...childLogger,
        trace: (...args: unknown[]) => console.trace(contextStr, ...args),
        debug: (...args: unknown[]) => console.debug(contextStr, ...args),
        info: (...args: unknown[]) => console.info(contextStr, ...args),
        warn: (...args: unknown[]) => console.warn(contextStr, ...args),
        error: (...args: unknown[]) => console.error(contextStr, ...args),
        fatal: (...args: unknown[]) => console.error('[FATAL]', contextStr, ...args),
      };
    },
  };
}

/**
 * Helper to create a child logger with custom context
 * @param context - Context object to add to all logs
 * @returns A child logger with the given context
 */
export function createLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Helper function to create a logger with request context
 * @param requestId - Unique identifier for the request
 * @param additionalContext - Additional context to include
 * @returns A child logger with request context
 */
export function createRequestLogger(
  requestId: string,
  additionalContext?: Record<string, unknown>
): pino.Logger {
  return logger.child({ requestId, ...additionalContext });
}

/**
 * Helper function to log API requests
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in milliseconds
 */
export function logApiRequest(method: string, path: string, statusCode: number, duration?: number) {
  const logData = {
    method,
    path,
    statusCode,
    ...(duration !== undefined && { duration: `${duration}ms` }),
  };

  if (statusCode >= 500) {
    apiLogger.error(logData, 'API request failed');
  } else if (statusCode >= 400) {
    apiLogger.warn(logData, 'API request error');
  } else {
    apiLogger.info(logData, 'API request completed');
  }
}
