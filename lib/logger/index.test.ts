import pino, { type LoggerOptions } from 'pino';
import {
  createChildLogger,
  createProductionLogger,
  getLoggerConfig,
  initProductionLogger,
  isProduction,
  isServer,
  isTest,
  LOG_DIR,
} from './config';
import {
  apiLogger,
  authLogger,
  createBrowserLogger,
  createLogger,
  createRequestLogger,
  dbLogger,
  logApiRequest,
  logger,
  stravaLogger,
} from './instances';
import { logError } from './utils';

describe('Logger Module - Main Exports', () => {
  describe('Config Exports', () => {
    it('should export getLoggerConfig function', () => {
      expect(getLoggerConfig).toBeDefined();
      expect(typeof getLoggerConfig).toBe('function');
      const config = getLoggerConfig();
      expect(config).toBeDefined();
      expect(config.level).toBe('silent');
    });

    it('should export isTest constant', () => {
      expect(isTest).toBeDefined();
      expect(typeof isTest).toBe('boolean');
      expect(isTest).toBe(true);
    });

    it('should export isProduction constant', () => {
      expect(isProduction).toBeDefined();
      expect(typeof isProduction).toBe('boolean');
    });

    it('should export isServer constant', () => {
      expect(isServer).toBeDefined();
      expect(typeof isServer).toBe('boolean');
      // In jest with jsdom environment, window is defined, so isServer is false
      expect(isServer).toBe(false);
    });

    it('should export LOG_DIR constant', () => {
      expect(LOG_DIR).toBeDefined();
      expect(typeof LOG_DIR).toBe('string');
    });

    it('should export createChildLogger function', () => {
      expect(createChildLogger).toBeDefined();
      expect(typeof createChildLogger).toBe('function');
    });

    it('should export createProductionLogger function', () => {
      expect(createProductionLogger).toBeDefined();
      expect(typeof createProductionLogger).toBe('function');
    });

    it('should export initProductionLogger function', () => {
      expect(initProductionLogger).toBeDefined();
      expect(typeof initProductionLogger).toBe('function');
    });
  });

  describe('Instance Exports', () => {
    it('should export logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should export apiLogger instance', () => {
      expect(apiLogger).toBeDefined();
      expect(typeof apiLogger.info).toBe('function');
    });

    it('should export stravaLogger instance', () => {
      expect(stravaLogger).toBeDefined();
      expect(typeof stravaLogger.debug).toBe('function');
    });

    it('should export authLogger instance', () => {
      expect(authLogger).toBeDefined();
      expect(typeof authLogger.info).toBe('function');
    });

    it('should export dbLogger instance', () => {
      expect(dbLogger).toBeDefined();
      expect(typeof dbLogger.info).toBe('function');
    });

    it('should export createBrowserLogger function', () => {
      expect(createBrowserLogger).toBeDefined();
      expect(typeof createBrowserLogger).toBe('function');
      const browserLogger = createBrowserLogger();
      expect(browserLogger).toBeDefined();
    });

    it('should export createLogger function', () => {
      expect(createLogger).toBeDefined();
      expect(typeof createLogger).toBe('function');
    });

    it('should export createRequestLogger function', () => {
      expect(createRequestLogger).toBeDefined();
      expect(typeof createRequestLogger).toBe('function');
    });

    it('should export logApiRequest function', () => {
      expect(logApiRequest).toBeDefined();
      expect(typeof logApiRequest).toBe('function');
    });
  });

  describe('Utility Exports', () => {
    it('should export logError function', () => {
      expect(logError).toBeDefined();
      expect(typeof logError).toBe('function');
    });
  });

  describe('logError comprehensive tests', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      errorSpy = jest.spyOn(apiLogger, 'error').mockImplementation();
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('should log Error with stack in non-production', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:1:1';

      logError(apiLogger, error, 'test context');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'test context',
          errorMessage: 'Test error',
          errorName: 'Error',
          stack: error.stack,
        })
      );
    });

    it('should log Error without context', () => {
      const error = new Error('No context error');

      logError(apiLogger, error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'No context error',
          errorName: 'Error',
        })
      );
    });

    it('should log Error with object context', () => {
      const error = new Error('Context error');
      const context = { userId: '123', requestId: 'req-456' };

      logError(apiLogger, error, context);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          requestId: 'req-456',
          errorMessage: 'Context error',
          errorName: 'Error',
        })
      );
    });

    it('should log non-Error values', () => {
      logError(apiLogger, 'string error', { context: 'test' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'test',
          error: 'string error',
        })
      );
    });

    it('should log number as error', () => {
      logError(apiLogger, 404, 'error code');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'error code',
          error: 404,
        })
      );
    });

    it('should log object as error', () => {
      const errorObj = { code: 'ERR001', message: 'Something went wrong' };

      logError(apiLogger, errorObj, 'api error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'api error',
          error: errorObj,
        })
      );
    });

    it('should log null as error', () => {
      logError(apiLogger, null, 'null error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'null error',
          error: null,
        })
      );
    });

    it('should log undefined as error', () => {
      logError(apiLogger, undefined, 'undefined error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'undefined error',
          error: undefined,
        })
      );
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string
        ) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message', 'CUSTOM_001');

      logError(apiLogger, error, 'custom error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'custom error',
          errorMessage: 'Custom error message',
          errorName: 'CustomError',
        })
      );
    });

    it('should handle Error without stack', () => {
      const error = new Error('No stack error');
      delete error.stack;

      logError(apiLogger, error, 'test');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'No stack error',
          errorName: 'Error',
        })
      );
    });
  });

  describe('Type Exports', () => {
    it('should be able to use LoggerOptions type', () => {
      const options: LoggerOptions = {
        level: 'info',
      };

      expect(options).toBeDefined();
      expect(options.level).toBe('info');
    });
  });

  describe('Integration Tests', () => {
    it('should work with createChildLogger and logger instance', () => {
      const mockLogger = pino({ level: 'silent' });
      const childLogger = createChildLogger(mockLogger, 'integration-test');

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should work with createLogger from instances', () => {
      const customLogger = createLogger({ module: 'integration' });

      expect(customLogger).toBeDefined();
      expect(typeof customLogger.info).toBe('function');
    });

    it('should work with createRequestLogger', () => {
      const requestLogger = createRequestLogger('req-integration-123', {
        path: '/test',
      });

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });

    it('should work with logApiRequest', () => {
      const spy = jest.spyOn(apiLogger, 'info').mockImplementation();

      logApiRequest('GET', '/integration', 200, 100);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/integration',
          statusCode: 200,
          duration: '100ms',
        }),
        'API request completed'
      );

      spy.mockRestore();
    });
  });
});
