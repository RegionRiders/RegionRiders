import { getLoggerConfig, isTest } from './config';
import { apiLogger, createBrowserLogger, logger, stravaLogger } from './instances';
import { logError } from './utils';

describe('Logger', () => {
  describe('getLoggerConfig', () => {
    it('should return test config when NODE_ENV is test', () => {
      const config = getLoggerConfig();
      expect(config).toBeDefined();
      expect(config.level).toBe('silent');
    });
  });

  describe('logger instance', () => {
    it('should create a logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should be silent in test environment', () => {
      expect(isTest).toBe(true);
    });
  });

  describe('child loggers', () => {
    it('should create apiLogger with context', () => {
      expect(apiLogger).toBeDefined();
      // In test mode, logger is silent but still functional
      expect(typeof apiLogger.info).toBe('function');
    });

    it('should create stravaLogger with context', () => {
      expect(stravaLogger).toBeDefined();
      expect(typeof stravaLogger.info).toBe('function');
    });
  });

  describe('logError', () => {
    it('should log Error objects', () => {
      const error = new Error('Test error');
      const spy = jest.spyOn(apiLogger, 'error');

      logError(apiLogger, error, 'test context');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log non-Error values', () => {
      const spy = jest.spyOn(apiLogger, 'error');

      logError(apiLogger, 'string error', { context: 'test' });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle context as string', () => {
      const error = new Error('Test error');
      const spy = jest.spyOn(apiLogger, 'error');

      logError(apiLogger, error, 'string context');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('createBrowserLogger', () => {
    it('should return logger instance in Node environment', () => {
      const browserLogger = createBrowserLogger();
      expect(browserLogger).toBeDefined();
      expect(typeof browserLogger.info).toBe('function');
    });

    it('should have all required methods', () => {
      const browserLogger = createBrowserLogger();
      expect(typeof browserLogger.trace).toBe('function');
      expect(typeof browserLogger.debug).toBe('function');
      expect(typeof browserLogger.info).toBe('function');
      expect(typeof browserLogger.warn).toBe('function');
      expect(typeof browserLogger.error).toBe('function');
      expect(typeof browserLogger.fatal).toBe('function');
    });
  });
});
