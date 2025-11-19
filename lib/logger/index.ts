// Server-side logger
// For client components, explicitly import from '@/lib/logger/client'
export {
  logger,
  apiLogger,
  stravaLogger,
  authLogger,
  dbLogger,
  createLogger,
  createRequestLogger,
  logApiRequest,
} from './logger.server';

// Utility functions
export { logError } from './utils';

// Configuration exports
export {
  getLoggerConfig,
  createChildLogger,
  isProduction,
  isTest,
  isServer,
  LOG_DIR,
} from './config';

// Production logger functions
export { createProductionLogger, initProductionLogger } from './config/production';

// Type exports
export type { LoggerOptions } from 'pino';
