/**
 * Coverage tests for logger.client.ts context string ternary branches
 * Targets: console method calls with/without context, child logger binding merges
 */

/* eslint-disable @typescript-eslint/no-require-imports */

describe('Logger Client - Context Coverage', () => {
  let consoleSpies: {
    trace: jest.SpyInstance;
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpies = {
      trace: jest.spyOn(console, 'trace').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    Object.values(consoleSpies).forEach((spy) => spy.mockRestore());
  });

  describe('Root logger without context', () => {
    it('should call console.trace without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.trace('trace message', 'additional data');

      expect(consoleSpies.trace).toHaveBeenCalledWith('trace message', 'additional data');
      expect(consoleSpies.trace).toHaveBeenCalledTimes(1);
    });

    it('should call console.debug without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.debug('debug message');

      expect(consoleSpies.debug).toHaveBeenCalledWith('debug message');
      expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
    });

    it('should call console.info without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.info('info message', { key: 'value' });

      expect(consoleSpies.info).toHaveBeenCalledWith('info message', { key: 'value' });
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    });

    it('should call console.warn without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.warn('warning message');

      expect(consoleSpies.warn).toHaveBeenCalledWith('warning message');
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
    });

    it('should call console.error without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.error('error message', new Error('test'));

      expect(consoleSpies.error).toHaveBeenCalledWith('error message', new Error('test'));
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    });

    it('should call console.error for fatal without context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.fatal('fatal message');

      expect(consoleSpies.error).toHaveBeenCalledWith('[FATAL]', 'fatal message');
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Child logger with single context', () => {
    it('should call console.trace with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ service: 'test' });

      child.trace('trace message');

      expect(consoleSpies.trace).toHaveBeenCalledWith(
        JSON.stringify({ service: 'test' }),
        'trace message'
      );
      expect(consoleSpies.trace).toHaveBeenCalledTimes(1);
    });

    it('should call console.debug with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ module: 'api' });

      child.debug('debug message');

      expect(consoleSpies.debug).toHaveBeenCalledWith(
        JSON.stringify({ module: 'api' }),
        'debug message'
      );
    });

    it('should call console.info with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ context: 'strava' });

      child.info('info message', 'extra');

      expect(consoleSpies.info).toHaveBeenCalledWith(
        JSON.stringify({ context: 'strava' }),
        'info message',
        'extra'
      );
    });

    it('should call console.warn with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ requestId: 'req-123' });

      child.warn('warning');

      expect(consoleSpies.warn).toHaveBeenCalledWith(
        JSON.stringify({ requestId: 'req-123' }),
        'warning'
      );
    });

    it('should call console.error with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ component: 'auth' });

      child.error('error');

      expect(consoleSpies.error).toHaveBeenCalledWith(
        JSON.stringify({ component: 'auth' }),
        'error'
      );
    });

    it('should call console.error for fatal with context string', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ fatal: 'context' });

      child.fatal('fatal error');

      expect(consoleSpies.error).toHaveBeenCalledWith(
        '[FATAL]',
        JSON.stringify({ fatal: 'context' }),
        'fatal error'
      );
    });
  });

  describe('Nested child loggers with merged context', () => {
    it('should merge parent and child bindings', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const parent = logger.child({ service: 'api' });
      const child = parent.child({ requestId: 'req-456' });

      child.info('nested message');

      expect(consoleSpies.info).toHaveBeenCalledWith(
        JSON.stringify({ service: 'api', requestId: 'req-456' }),
        'nested message'
      );
    });

    it('should merge multiple levels of bindings', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const level1 = logger.child({ app: 'RegionRiders' });
      const level2 = level1.child({ service: 'strava' });
      const level3 = level2.child({ operation: 'fetchActivities' });

      level3.debug('deep nested');

      expect(consoleSpies.debug).toHaveBeenCalledWith(
        JSON.stringify({
          app: 'RegionRiders',
          service: 'strava',
          operation: 'fetchActivities',
        }),
        'deep nested'
      );
    });

    it('should override parent binding with same key', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const parent = logger.child({ level: 'parent', shared: 'value' });
      const child = parent.child({ level: 'child', extra: 'data' });

      child.warn('override test');

      expect(consoleSpies.warn).toHaveBeenCalledWith(
        JSON.stringify({
          level: 'child', // Overridden
          shared: 'value', // Preserved
          extra: 'data', // Added
        }),
        'override test'
      );
    });

    it('should handle empty child bindings', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const parent = logger.child({ parent: 'context' });
      const child = parent.child({});

      child.info('empty child');

      expect(consoleSpies.info).toHaveBeenCalledWith(
        JSON.stringify({ parent: 'context' }),
        'empty child'
      );
    });

    it('should accumulate bindings through multiple children', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child1 = logger.child({ a: 1 });
      const child2 = child1.child({ b: 2 });
      const child3 = child2.child({ c: 3 });
      const child4 = child3.child({ d: 4 });

      child4.trace('accumulated');

      expect(consoleSpies.trace).toHaveBeenCalledWith(
        JSON.stringify({ a: 1, b: 2, c: 3, d: 4 }),
        'accumulated'
      );
    });
  });

  describe('Exported logger instances', () => {
    it('should export logger with no initial context', () => {
      const { logger } = require('./logger.client');

      logger.info('root logger');

      expect(consoleSpies.info).toHaveBeenCalledWith('root logger');
      // Should NOT have context string as first arg
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    });

    it('should export apiLogger with context', () => {
      const { apiLogger } = require('./logger.client');

      apiLogger.info('api log');

      expect(consoleSpies.info).toHaveBeenCalledWith(JSON.stringify({ context: 'api' }), 'api log');
    });

    it('should export stravaLogger with context', () => {
      const { stravaLogger } = require('./logger.client');

      stravaLogger.debug('strava log');

      expect(consoleSpies.debug).toHaveBeenCalledWith(
        JSON.stringify({ context: 'strava' }),
        'strava log'
      );
    });

    it('should export authLogger with context', () => {
      const { authLogger } = require('./logger.client');

      authLogger.warn('auth log');

      expect(consoleSpies.warn).toHaveBeenCalledWith(
        JSON.stringify({ context: 'auth' }),
        'auth log'
      );
    });

    it('should export dbLogger with context', () => {
      const { dbLogger } = require('./logger.client');

      dbLogger.error('db log');

      expect(consoleSpies.error).toHaveBeenCalledWith(
        JSON.stringify({ context: 'database' }),
        'db log'
      );
    });
  });

  describe('Helper functions', () => {
    it('should export createLogger function', () => {
      const { createLogger } = require('./logger.client');

      expect(typeof createLogger).toBe('function');

      const customLogger = createLogger({ custom: 'context' });
      expect(customLogger).toBeDefined();

      customLogger.info('test');

      expect(consoleSpies.info).toHaveBeenCalledWith(JSON.stringify({ custom: 'context' }), 'test');
    });

    it('should export createRequestLogger function', () => {
      const { createRequestLogger } = require('./logger.client');

      expect(typeof createRequestLogger).toBe('function');

      const requestLogger = createRequestLogger('req-789', { path: '/test' });
      expect(requestLogger).toBeDefined();

      requestLogger.debug('request log');

      expect(consoleSpies.debug).toHaveBeenCalledWith(
        JSON.stringify({ requestId: 'req-789', path: '/test' }),
        'request log'
      );
    });

    it('should export logApiRequest function', () => {
      const { logApiRequest } = require('./logger.client');

      expect(typeof logApiRequest).toBe('function');

      // Should call console without throwing
      expect(() => logApiRequest('GET', '/test', 200)).not.toThrow();
    });
  });

  describe('Context string creation', () => {
    it('should handle complex object bindings', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        bool: true,
      });

      child.info('complex');

      const expectedContext = JSON.stringify({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        bool: true,
      });

      expect(consoleSpies.info).toHaveBeenCalledWith(expectedContext, 'complex');
    });

    it('should handle special characters in context values', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({
        message: 'with "quotes" and \n newlines',
        emoji: '🎉',
      });

      child.warn('special chars');

      const expectedContext = JSON.stringify({
        message: 'with "quotes" and \n newlines',
        emoji: '🎉',
      });

      expect(consoleSpies.warn).toHaveBeenCalledWith(expectedContext, 'special chars');
    });

    it('should handle null and undefined in bindings', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({
        nullValue: null,
        undefinedValue: undefined,
        normalValue: 'test',
      });

      child.error('null/undefined');

      const expectedContext = JSON.stringify({
        nullValue: null,
        undefinedValue: undefined,
        normalValue: 'test',
      });

      expect(consoleSpies.error).toHaveBeenCalledWith(expectedContext, 'null/undefined');
    });
  });

  describe('All log levels coverage', () => {
    it('should cover all log levels with context', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();
      const child = logger.child({ test: 'coverage' });

      child.trace('trace');
      child.debug('debug');
      child.info('info');
      child.warn('warn');
      child.error('error');
      child.fatal('fatal');

      expect(consoleSpies.trace).toHaveBeenCalledTimes(1);
      expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpies.error).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('should cover all log levels without context', () => {
      const { createBrowserLogger } = require('./logger.client');
      const logger = createBrowserLogger();

      logger.trace('trace');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.fatal('fatal');

      expect(consoleSpies.trace).toHaveBeenCalledTimes(1);
      expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpies.error).toHaveBeenCalledTimes(2); // error + fatal
    });
  });
});
