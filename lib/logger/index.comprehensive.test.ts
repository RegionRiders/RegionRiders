/**
 * Comprehensive tests for main logger index.ts re-exports
 * Ensures 100% coverage of all export statements
 */

describe('Logger Index - All Re-exports', () => {
  it('should re-export all configuration functions', async () => {
    const loggerIndex = await import('./index');

    expect(loggerIndex.getLoggerConfig).toBeDefined();
    expect(loggerIndex.createChildLogger).toBeDefined();
    expect(loggerIndex.createProductionLogger).toBeDefined();
    expect(loggerIndex.initProductionLogger).toBeDefined();

    expect(typeof loggerIndex.getLoggerConfig).toBe('function');
    expect(typeof loggerIndex.createChildLogger).toBe('function');
    expect(typeof loggerIndex.createProductionLogger).toBe('function');
    expect(typeof loggerIndex.initProductionLogger).toBe('function');
  });

  it('should re-export all configuration constants', async () => {
    const loggerIndex = await import('./index');

    expect(loggerIndex.isProduction).toBeDefined();
    expect(loggerIndex.isTest).toBeDefined();
    expect(loggerIndex.LOG_DIR).toBeDefined();

    expect(typeof loggerIndex.isProduction).toBe('boolean');
    expect(typeof loggerIndex.isTest).toBe('boolean');
    expect(typeof loggerIndex.LOG_DIR).toBe('string');
  });

  it('should re-export all logger instances', async () => {
    const loggerIndex = await import('./index');

    expect(loggerIndex.logger).toBeDefined();
    expect(loggerIndex.apiLogger).toBeDefined();
    expect(loggerIndex.stravaLogger).toBeDefined();
    expect(loggerIndex.authLogger).toBeDefined();
    expect(loggerIndex.dbLogger).toBeDefined();

    expect(typeof loggerIndex.logger.info).toBe('function');
    expect(typeof loggerIndex.apiLogger.info).toBe('function');
    expect(typeof loggerIndex.stravaLogger.info).toBe('function');
    expect(typeof loggerIndex.authLogger.info).toBe('function');
    expect(typeof loggerIndex.dbLogger.info).toBe('function');
  });

  it('should re-export all instance creation functions', async () => {
    const loggerIndex = await import('./index');

    expect(loggerIndex.createBrowserLogger).toBeDefined();
    expect(loggerIndex.createLogger).toBeDefined();
    expect(loggerIndex.createRequestLogger).toBeDefined();
    expect(loggerIndex.logApiRequest).toBeDefined();

    expect(typeof loggerIndex.createBrowserLogger).toBe('function');
    expect(typeof loggerIndex.createLogger).toBe('function');
    expect(typeof loggerIndex.createRequestLogger).toBe('function');
    expect(typeof loggerIndex.logApiRequest).toBe('function');
  });

  it('should re-export utility functions', async () => {
    const loggerIndex = await import('./index');

    expect(loggerIndex.logError).toBeDefined();
    expect(typeof loggerIndex.logError).toBe('function');
  });

  it('should have functional re-exported logger instances', async () => {
    const { logger, apiLogger, stravaLogger, authLogger, dbLogger } = await import('./index');

    // Should not throw when calling methods
    expect(() => logger.info('test')).not.toThrow();
    expect(() => apiLogger.info('test')).not.toThrow();
    expect(() => stravaLogger.info('test')).not.toThrow();
    expect(() => authLogger.info('test')).not.toThrow();
    expect(() => dbLogger.info('test')).not.toThrow();
  });

  it('should have functional re-exported creation functions', async () => {
    const { createBrowserLogger, createLogger, createRequestLogger } = await import('./index');

    const browserLogger = createBrowserLogger();
    const customLogger = createLogger({ test: 'context' });
    const requestLogger = createRequestLogger('req-123');

    expect(browserLogger).toBeDefined();
    expect(customLogger).toBeDefined();
    expect(requestLogger).toBeDefined();

    expect(typeof browserLogger.info).toBe('function');
    expect(typeof customLogger.info).toBe('function');
    expect(typeof requestLogger.info).toBe('function');
  });

  it('should have functional re-exported configuration', async () => {
    const { getLoggerConfig, createChildLogger } = await import('./index');
    const pino = await import('pino');

    const config = getLoggerConfig();
    expect(config).toBeDefined();
    expect(config.level).toBeDefined();

    const parentLogger = pino.default({ level: 'silent' });
    const childLogger = createChildLogger(parentLogger, 'test');
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
  });

  it('should have functional re-exported production functions', async () => {
    const { createProductionLogger, initProductionLogger } = await import('./index');

    const logger1 = await createProductionLogger();
    const logger2 = await initProductionLogger();

    expect(logger1).toBeDefined();
    expect(logger2).toBeDefined();
    expect(typeof logger1.info).toBe('function');
    expect(typeof logger2.info).toBe('function');
  });

  it('should have functional re-exported utilities', async () => {
    const { logError, logger } = await import('./index');

    const error = new Error('Test error');

    // Should not throw
    expect(() => logError(logger, error, 'test context')).not.toThrow();
  });

  it('should have functional logApiRequest', async () => {
    const { logApiRequest, apiLogger } = await import('./index');

    const spy = jest.spyOn(apiLogger, 'info').mockImplementation();

    logApiRequest('GET', '/test', 200, 100);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should export isProduction with correct value', async () => {
    const { isProduction } = await import('./index');

    // In test environment, should be false
    expect(isProduction).toBe(process.env.NODE_ENV === 'production');
  });

  it('should export isTest with correct value', async () => {
    const { isTest } = await import('./index');

    // In test environment, should be true
    expect(isTest).toBe(true);
    expect(isTest).toBe(process.env.NODE_ENV === 'test');
  });

  it('should export LOG_DIR with valid path', async () => {
    const { LOG_DIR } = await import('./index');

    expect(LOG_DIR).toBeDefined();
    expect(typeof LOG_DIR).toBe('string');
    expect(LOG_DIR.length).toBeGreaterThan(0);
  });

  it('should allow creating child loggers from re-exported instances', async () => {
    const { logger } = await import('./index');

    const child = logger.child({ component: 'test' });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(() => child.info('test message')).not.toThrow();
  });

  it('should expose all necessary exports for external use', async () => {
    const exports = await import('./index');

    const expectedExports = [
      // Config
      'getLoggerConfig',
      'isProduction',
      'isTest',
      'LOG_DIR',
      'createChildLogger',
      'createProductionLogger',
      'initProductionLogger',
      // Instances
      'logger',
      'apiLogger',
      'stravaLogger',
      'authLogger',
      'dbLogger',
      'createBrowserLogger',
      'createLogger',
      'createRequestLogger',
      'logApiRequest',
      // Utils
      'logError',
    ];

    expectedExports.forEach((exportName) => {
      expect(exports).toHaveProperty(exportName);
      expect((exports as any)[exportName]).toBeDefined();
    });
  });

  it('should not have any unexpected exports', async () => {
    const exports = await import('./index');

    const exportKeys = Object.keys(exports);

    const expectedExports = [
      'getLoggerConfig',
      'isProduction',
      'isTest',
      'LOG_DIR',
      'createChildLogger',
      'createProductionLogger',
      'initProductionLogger',
      'logger',
      'apiLogger',
      'stravaLogger',
      'authLogger',
      'dbLogger',
      'createBrowserLogger',
      'createLogger',
      'createRequestLogger',
      'logApiRequest',
      'logError',
    ];

    // All exports should be expected
    exportKeys.forEach((key) => {
      expect(expectedExports).toContain(key);
    });
  });
});
