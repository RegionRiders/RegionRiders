import {
  apiLogger,
  authLogger,
  BrowserLogger,
  createBrowserLogger,
  createLogger,
  createRequestLogger,
  dbLogger,
  logApiRequest,
  logger,
  stravaLogger,
} from './client';

describe('lib/logger/client', () => {
  beforeEach(() => {
    jest.spyOn(console, 'trace').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBrowserLogger', () => {
    it('should create a logger with all required methods', () => {
      const testLogger = createBrowserLogger();
      expect(testLogger.trace).toBeDefined();
      expect(testLogger.debug).toBeDefined();
      expect(testLogger.info).toBeDefined();
      expect(testLogger.warn).toBeDefined();
      expect(testLogger.error).toBeDefined();
      expect(testLogger.fatal).toBeDefined();
      expect(testLogger.child).toBeDefined();
    });

    it('should log trace messages', () => {
      const testLogger = createBrowserLogger();
      testLogger.trace('test trace');
      expect(console.trace).toHaveBeenCalledWith('test trace');
    });

    it('should log debug messages', () => {
      const testLogger = createBrowserLogger();
      testLogger.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith('test debug');
    });

    it('should log info messages', () => {
      const testLogger = createBrowserLogger();
      testLogger.info('test info');
      expect(console.info).toHaveBeenCalledWith('test info');
    });

    it('should log warn messages', () => {
      const testLogger = createBrowserLogger();
      testLogger.warn('test warn');
      expect(console.warn).toHaveBeenCalledWith('test warn');
    });

    it('should log error messages', () => {
      const testLogger = createBrowserLogger();
      testLogger.error('test error');
      expect(console.error).toHaveBeenCalledWith('test error');
    });

    it('should log fatal messages with [FATAL] prefix', () => {
      const testLogger = createBrowserLogger();
      testLogger.fatal('test fatal');
      expect(console.error).toHaveBeenCalledWith('[FATAL]', 'test fatal');
    });

    it('should include context in logs when bindings are provided', () => {
      const testLogger = createBrowserLogger({ component: 'test' });
      testLogger.info('test message');
      expect(console.info).toHaveBeenCalledWith('{"component":"test"}', 'test message');
    });

    it('should create child loggers with merged bindings', () => {
      const parentLogger = createBrowserLogger({ parent: 'value' });
      const childLogger = parentLogger.child({ child: 'value' });
      childLogger.info('test');
      expect(console.info).toHaveBeenCalledWith('{"parent":"value","child":"value"}', 'test');
    });

    it('should override parent bindings in child loggers', () => {
      const parentLogger = createBrowserLogger({ key: 'parent' });
      const childLogger = parentLogger.child({ key: 'child' });
      childLogger.info('test');
      expect(console.info).toHaveBeenCalledWith('{"key":"child"}', 'test');
    });
  });

  describe('exported loggers', () => {
    it('should export logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
    });

    it('should export apiLogger instance', () => {
      expect(apiLogger).toBeDefined();
      expect(apiLogger.info).toBeDefined();
    });

    it('should export stravaLogger instance', () => {
      expect(stravaLogger).toBeDefined();
      expect(stravaLogger.info).toBeDefined();
    });

    it('should export authLogger instance', () => {
      expect(authLogger).toBeDefined();
      expect(authLogger.info).toBeDefined();
    });

    it('should export dbLogger instance', () => {
      expect(dbLogger).toBeDefined();
      expect(dbLogger.info).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('should export createLogger', () => {
      expect(createLogger).toBeDefined();
      expect(typeof createLogger).toBe('function');
    });

    it('should export createRequestLogger', () => {
      expect(createRequestLogger).toBeDefined();
      expect(typeof createRequestLogger).toBe('function');
    });

    it('should export logApiRequest', () => {
      expect(logApiRequest).toBeDefined();
      expect(typeof logApiRequest).toBe('function');
    });
  });

  describe('BrowserLogger type', () => {
    it('should satisfy BrowserLogger interface', () => {
      const testLogger: BrowserLogger = createBrowserLogger();
      expect(testLogger.trace).toBeDefined();
      expect(testLogger.debug).toBeDefined();
      expect(testLogger.info).toBeDefined();
      expect(testLogger.warn).toBeDefined();
      expect(testLogger.error).toBeDefined();
      expect(testLogger.fatal).toBeDefined();
      expect(testLogger.child).toBeDefined();
    });
  });
});
