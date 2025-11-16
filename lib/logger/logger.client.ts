import { createLoggerHelpers, createNamedLoggers } from './utils/core';

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
 * Main application logger instance for client-side
 */
export const logger = createBrowserLogger();

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
