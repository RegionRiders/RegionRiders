import pino, { type LoggerOptions } from 'pino';

/**
 * Determines if the application is running in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determines if the application is running in test mode
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Base directory for log files in production
 */
export const LOG_DIR = process.env.LOG_DIR || './logs';

/**
 * Check if we're running in a server environment (Node.js)
 */
export const isServer = typeof window === 'undefined';

/**
 * Logger configuration for development environment
 * Uses simple configuration without transports to avoid worker thread issues in Next.js
 */
const developmentConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'debug',
  // Don't use transport in development to avoid worker thread issues
  // Instead, use formatters for better readability
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

/**
 * Logger configuration for production environment
 * Uses structured JSON logging for better log analysis
 */
const productionConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Remove undefined values from logs
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', 'apiKey', 'secret'],
    remove: true,
  },
};

/**
 * Logger configuration for test environment
 * Minimal logging to avoid cluttering test output
 */
const testConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'silent',
};

/**
 * Get the appropriate logger configuration based on environment
 */
export function getLoggerConfig(): LoggerOptions {
  if (isTest) {
    return testConfig;
  }

  if (isProduction) {
    return productionConfig;
  }

  return developmentConfig;
}

/**
 * Create a child logger with additional context
 * @param parentLogger - The parent logger instance
 * @param name - The name/context for the child logger
 * @param additionalContext - Additional context to include in all logs
 */
export function createChildLogger(
  parentLogger: pino.Logger,
  name: string,
  additionalContext?: Record<string, unknown>
) {
  return parentLogger.child({ name, ...additionalContext });
}
