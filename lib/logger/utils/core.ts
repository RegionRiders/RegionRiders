/**
 * Shared logger exports and utilities
 * This module contains the common logger instances and helper functions
 * that are used by both client and server logger implementations
 */

/**
 * Logger interface that defines the minimum required methods
 */
export interface LoggerLike {
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => any;
}

/**
 * Create named logger instances with specific contexts
 * @param baseLogger - The base logger instance to create children from
 */
export function createNamedLoggers<T extends LoggerLike>(baseLogger: T) {
  return {
    /**
     * Logger specifically for API routes
     */
    apiLogger: baseLogger.child({ context: 'api' }) as T,

    /**
     * Logger specifically for Strava integration
     */
    stravaLogger: baseLogger.child({ context: 'strava' }) as T,

    /**
     * Logger specifically for authentication flows
     */
    authLogger: baseLogger.child({ context: 'auth' }) as T,

    /**
     * Logger specifically for database operations
     */
    dbLogger: baseLogger.child({ context: 'database' }) as T,
  };
}

/**
 * Create helper functions for logger
 * @param baseLogger - The base logger instance
 * @param apiLogger - The API logger instance for logging API requests
 */
export function createLoggerHelpers<T extends LoggerLike>(baseLogger: T, apiLogger: T) {
  return {
    /**
     * Helper to create a child logger with custom context
     * @param context - Context object to add to all logs
     * @returns A child logger with the given context
     */
    createLogger(context: Record<string, unknown>): T {
      return baseLogger.child(context) as T;
    },

    /**
     * Helper function to create a logger with request context
     * @param requestId - Unique identifier for the request
     * @param additionalContext - Additional context to include
     * @returns A child logger with request context
     */
    createRequestLogger(requestId: string, additionalContext?: Record<string, unknown>): T {
      return baseLogger.child({ requestId, ...additionalContext }) as T;
    },

    /**
     * Helper function to log API requests
     * @param method - HTTP method
     * @param path - Request path
     * @param statusCode - Response status code
     * @param duration - Request duration in milliseconds
     */
    logApiRequest(method: string, path: string, statusCode: number, duration?: number): void {
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
    },
  };
}
