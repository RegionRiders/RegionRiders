// Type exports
export type { LoggerOptions } from 'pino';

// Conditional logger implementation
let logger: any;
let apiLogger: any;
let stravaLogger: any;
let authLogger: any;
let dbLogger: any;
let createBrowserLogger: any;
let createLogger: any;
let createRequestLogger: any;
let logApiRequest: any;
let getLoggerConfig: any;
let isProduction: any;
let isTest: any;
let LOG_DIR: any;
let createChildLogger: any;
let createProductionLogger: any;
let initProductionLogger: any;
let logError: any;

if (
  typeof window === 'undefined' ||
  (typeof process !== 'undefined' && process.release && process.release.name === 'node')
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const configModule = require('./config');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const instancesModule = require('./instances');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const utilsModule = require('./utils');

  // Configuration exports
  getLoggerConfig = configModule.getLoggerConfig;
  isProduction = configModule.isProduction;
  isTest = configModule.isTest;
  LOG_DIR = configModule.LOG_DIR;
  createChildLogger = configModule.createChildLogger;
  createProductionLogger = configModule.createProductionLogger;
  initProductionLogger = configModule.initProductionLogger;

  // Logger instances and creation
  logger = instancesModule.logger;
  apiLogger = instancesModule.apiLogger;
  stravaLogger = instancesModule.stravaLogger;
  authLogger = instancesModule.authLogger;
  dbLogger = instancesModule.dbLogger;
  createBrowserLogger = instancesModule.createBrowserLogger;
  createLogger = instancesModule.createLogger;
  createRequestLogger = instancesModule.createRequestLogger;
  logApiRequest = instancesModule.logApiRequest;

  // Utility functions
  logError = utilsModule.logError;
} else {
  // Client-side: Simple console-based fallback
  const consoleLogger = {
    info: (...args: any[]) => console.info(...args),
    error: (...args: any[]) => console.error(...args),
    warn: (...args: any[]) => console.warn(...args),
    debug: (...args: any[]) => console.debug(...args),
    trace: (...args: any[]) => console.trace(...args),
    fatal: (...args: any[]) => console.error(...args),
    child: () => consoleLogger,
  };

  // Assign all logger instances to console logger
  logger = consoleLogger;
  apiLogger = consoleLogger;
  stravaLogger = consoleLogger;
  authLogger = consoleLogger;
  dbLogger = consoleLogger;

  // Mock functions for client-side
  createBrowserLogger = () => consoleLogger;
  createLogger = () => consoleLogger;
  createRequestLogger = () => consoleLogger;
  logApiRequest = (req: any, res: any) => console.info('API Request', req, res);

  // Mock config functions
  getLoggerConfig = () => ({});
  isProduction = false;
  isTest = false;
  LOG_DIR = '';
  createChildLogger = () => consoleLogger;
  createProductionLogger = () => consoleLogger;
  initProductionLogger = () => Promise.resolve();
  logError = (error: any) => console.error('Error:', error);
}

// Export all
export {
  // Configuration
  getLoggerConfig,
  isProduction,
  isTest,
  LOG_DIR,
  createChildLogger,
  createProductionLogger,
  initProductionLogger,
  // Logger instances and creation
  logger,
  apiLogger,
  stravaLogger,
  authLogger,
  dbLogger,
  createBrowserLogger,
  createLogger,
  createRequestLogger,
  logApiRequest,
  // Utility functions
  logError,
};
