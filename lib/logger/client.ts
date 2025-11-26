// Client-side logger exports
export {
  logger,
  apiLogger,
  stravaLogger,
  authLogger,
  dbLogger,
  createBrowserLogger,
  createLogger,
  createRequestLogger,
  logApiRequest,
} from './logger.client';

// Utility functions
export { logError } from './utils';

// Type exports
export type { BrowserLogger } from './logger.client';
