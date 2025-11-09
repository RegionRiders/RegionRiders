import pino from 'pino';
import { getLoggerConfig } from '../config';

/**
 * Main application logger instance
 * This is the primary logger used throughout the application
 */
export const logger = pino(getLoggerConfig());

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
 * Browser-safe logger that prevents errors when running client-side
 * Uses console methods as fallback in browser environment
 */
export function createBrowserLogger() {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return {
      trace: (...args: unknown[]) => console.trace(...args),
      debug: (...args: unknown[]) => console.debug(...args),
      info: (...args: unknown[]) => console.info(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      error: (...args: unknown[]) => console.error(...args),
      fatal: (...args: unknown[]) => console.error('[FATAL]', ...args),
    };
  }
  return logger;
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
