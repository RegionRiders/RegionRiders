// Configuration
export {
  getLoggerConfig,
  isProduction,
  isTest,
  LOG_DIR,
  createChildLogger,
  createProductionLogger,
  initProductionLogger,
} from './config';

// Logger instances and creation
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
} from './instances';

// Utility functions
export { logError } from './utils';

// Type exports
export type { LoggerOptions } from 'pino';
