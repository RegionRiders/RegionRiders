/**
 * Coverage tests for logger.server.ts pino-pretty branch
 * Targets: pretty-stream success and failure paths, console.warn fallback
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Helper utilities to safely mutate NODE_ENV without TS readonly errors
const setNodeEnv = (value: string) => {
  (process.env as Record<string, string>).NODE_ENV = value;
};
const restoreNodeEnv = (value: string | undefined) => {
  if (value === undefined) {
    delete (process.env as Record<string, string>).NODE_ENV;
  } else {
    (process.env as Record<string, string>).NODE_ENV = value;
  }
};

describe('Logger Server - Pretty Stream Coverage', () => {
  let originalEnv: string | undefined;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    jest.resetModules();
  });

  afterEach(() => {
    restoreNodeEnv(originalEnv);
    consoleWarnSpy.mockRestore();
    jest.resetModules();
  });

  describe('Development environment with pino-pretty success', () => {
    it('should use pino-pretty stream when available in development', () => {
      setNodeEnv('development');

      // Mock pino-pretty to return a stream
      const mockPrettyStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };

      const mockPretty = jest.fn().mockReturnValue(mockPrettyStream);

      jest.doMock('pino-pretty', () => mockPretty);

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        // Logger should be created successfully
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');

        // Verify pino-pretty was called with correct options
        expect(mockPretty).toHaveBeenCalledWith({
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        });

        // console.warn should NOT be called on success
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    it('should create logger with pretty stream in non-test development', () => {
      setNodeEnv('development');

      const mockPrettyStream = {
        write: jest.fn(),
        end: jest.fn(),
      };

      jest.doMock('pino-pretty', () => jest.fn(() => mockPrettyStream));

      jest.isolateModules(() => {
        const { logger, apiLogger, stravaLogger } = require('./logger.server');

        expect(logger).toBeDefined();
        expect(apiLogger).toBeDefined();
        expect(stravaLogger).toBeDefined();

        // All should have standard logger methods
        expect(typeof logger.info).toBe('function');
        expect(typeof apiLogger.warn).toBe('function');
        expect(typeof stravaLogger.debug).toBe('function');

        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Development environment with pino-pretty failure', () => {
    it('should fallback to standard pino when pino-pretty throws', () => {
      setNodeEnv('development');

      // Mock pino-pretty to throw an error
      jest.doMock('pino-pretty', () => {
        throw new Error('pino-pretty not found');
      });

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        // Logger should still be created (fallback)
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');

        // console.warn should be called with fallback message
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'pino-pretty not available, using standard pino logging'
        );
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle require error gracefully', () => {
      setNodeEnv('development');

      // Mock require to throw
      jest.doMock('pino-pretty', () => {
        throw new Error('MODULE_NOT_FOUND');
      });

      jest.isolateModules(() => {
        const { logger, createLogger, createRequestLogger } = require('./logger.server');

        // All exports should work despite pino-pretty failure
        expect(logger).toBeDefined();
        expect(typeof createLogger).toBe('function');
        expect(typeof createRequestLogger).toBe('function');

        const customLogger = createLogger({ test: 'context' });
        expect(customLogger).toBeDefined();

        // Verify console.warn was called
        expect(consoleWarnSpy).toHaveBeenCalled();
      });
    });

    it('should create functional logger after pretty failure', () => {
      setNodeEnv('development');

      jest.doMock('pino-pretty', () => {
        throw new Error('Not installed');
      });

      jest.isolateModules(() => {
        const { logger, apiLogger } = require('./logger.server');

        // Should not throw when using logger
        expect(() => logger.info('test message')).not.toThrow();
        expect(() => apiLogger.error('test error')).not.toThrow();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'pino-pretty not available, using standard pino logging'
        );
      });
    });
  });

  describe('Production environment bypasses pretty', () => {
    it('should not attempt to load pino-pretty in production', () => {
      setNodeEnv('production');

      // Mock should not be called in production
      const mockPretty = jest.fn();
      jest.doMock('pino-pretty', () => mockPretty);

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');

        // pino-pretty should NOT be called in production
        expect(mockPretty).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    it('should use standard pino in production', () => {
      setNodeEnv('production');

      jest.isolateModules(() => {
        const { logger, apiLogger } = require('./logger.server');

        expect(logger).toBeDefined();
        expect(apiLogger).toBeDefined();

        // Should work without pretty stream
        expect(() => logger.info('prod log')).not.toThrow();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Test environment bypasses pretty', () => {
    it('should not attempt to load pino-pretty in test', () => {
      setNodeEnv('test');

      const mockPretty = jest.fn();
      jest.doMock('pino-pretty', () => mockPretty);

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        expect(logger).toBeDefined();

        // pino-pretty should NOT be called in test
        expect(mockPretty).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    it('should use standard pino with silent level in test', () => {
      setNodeEnv('test');

      jest.isolateModules(() => {
        const { logger, stravaLogger, authLogger } = require('./logger.server');

        expect(logger).toBeDefined();
        expect(stravaLogger).toBeDefined();
        expect(authLogger).toBeDefined();

        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Logger proxy behavior', () => {
    it('should lazy-initialize logger through proxy', () => {
      setNodeEnv('test');

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        // Access logger property should work
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.child).toBe('function');
      });
    });

    it('should cache logger instance across accesses', () => {
      setNodeEnv('test');

      jest.isolateModules(() => {
        const { logger } = require('./logger.server');

        // Multiple accesses should return same underlying logger
        const info1 = logger.info;
        const info2 = logger.info;

        expect(info1).toBe(info2);
      });
    });
  });

  describe('Named loggers in different environments', () => {
    it('should create named loggers successfully in development', () => {
      setNodeEnv('development');

      const mockPrettyStream = { write: jest.fn() };
      jest.doMock('pino-pretty', () => jest.fn(() => mockPrettyStream));

      jest.isolateModules(() => {
        const { apiLogger, stravaLogger, authLogger, dbLogger } = require('./logger.server');

        expect(apiLogger).toBeDefined();
        expect(stravaLogger).toBeDefined();
        expect(authLogger).toBeDefined();
        expect(dbLogger).toBeDefined();

        // All should be functional
        expect(() => apiLogger.info('test')).not.toThrow();
        expect(() => stravaLogger.debug('test')).not.toThrow();
      });
    });
  });

  describe('Helper functions in different environments', () => {
    it('should create helper functions in development with pretty', () => {
      setNodeEnv('development');

      const mockPrettyStream = { write: jest.fn() };
      jest.doMock('pino-pretty', () => jest.fn(() => mockPrettyStream));

      jest.isolateModules(() => {
        const { createLogger, createRequestLogger, logApiRequest } = require('./logger.server');

        expect(typeof createLogger).toBe('function');
        expect(typeof createRequestLogger).toBe('function');
        expect(typeof logApiRequest).toBe('function');

        const customLogger = createLogger({ service: 'test' });
        expect(customLogger).toBeDefined();
      });
    });
  });
});
