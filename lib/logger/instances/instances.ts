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
 * @param accumulatedBindings - Bindings accumulated from parent loggers
 */
export function createBrowserLogger(
  accumulatedBindings: Record<string, unknown> = {}
): BrowserLogger {
  // Create context string from accumulated bindings (empty string if no bindings)
  const contextStr =
    Object.keys(accumulatedBindings).length > 0 ? JSON.stringify(accumulatedBindings) : '';

  return {
    trace: (...args: unknown[]) =>
      contextStr ? console.trace(contextStr, ...args) : console.trace(...args),
    debug: (...args: unknown[]) =>
      contextStr ? console.debug(contextStr, ...args) : console.debug(...args),
    info: (...args: unknown[]) =>
      contextStr ? console.info(contextStr, ...args) : console.info(...args),
    warn: (...args: unknown[]) =>
      contextStr ? console.warn(contextStr, ...args) : console.warn(...args),
    error: (...args: unknown[]) =>
      contextStr ? console.error(contextStr, ...args) : console.error(...args),
    fatal: (...args: unknown[]) =>
      contextStr
        ? console.error('[FATAL]', contextStr, ...args)
        : console.error('[FATAL]', ...args),
    child: (bindings: Record<string, unknown>) => {
      // Merge parent bindings with new bindings (shallow merge)
      // New bindings override parent bindings with same keys
      const mergedBindings = { ...accumulatedBindings, ...bindings };

      // Create a new child logger with merged bindings
      // This ensures nested children preserve all accumulated bindings
      return createBrowserLogger(mergedBindings);
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
