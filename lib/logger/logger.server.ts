import pino from 'pino';
import { getLoggerConfig, isProduction, isTest } from './config';
import { createLoggerHelpers, createNamedLoggers } from './utils/core';

/**
 * Cached logger instance
 */
let cachedLogger: pino.Logger | null = null;

/**
 * Create the appropriate logger based on environment
 * In development, uses pino-pretty stream (not transport) to avoid worker threads
 * In production, uses structured JSON logging
 */
function createServerLogger(): pino.Logger {
  const config = getLoggerConfig();

  // In development, use pino-pretty as a stream (not transport) to avoid worker threads
  if (!isProduction && !isTest) {
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
function getLogger(): pino.Logger {
  if (!cachedLogger) {
    cachedLogger = createServerLogger();
  }
  return cachedLogger;
}

/**
 * Main application logger instance
 * This is the primary logger used throughout the application
 */
export const logger = new Proxy({} as pino.Logger, {
  get(_target, prop) {
    const loggerInstance = getLogger();
    return (loggerInstance as any)[prop];
  },
});

// Create named logger instances using shared utility
const namedLoggers = createNamedLoggers(logger);
export const apiLogger = namedLoggers.apiLogger;
export const stravaLogger = namedLoggers.stravaLogger;
export const authLogger = namedLoggers.authLogger;
export const dbLogger = namedLoggers.dbLogger;

// Create helper functions using shared utility
const helpers = createLoggerHelpers(logger, apiLogger);
export const createLogger = helpers.createLogger;
export const createRequestLogger = helpers.createRequestLogger;
export const logApiRequest = helpers.logApiRequest;
