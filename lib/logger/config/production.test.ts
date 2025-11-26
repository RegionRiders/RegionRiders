describe('Production Logger', () => {
  // Note: These are integration-style tests that verify the production logger
  // can be imported and has the expected exports. Full testing would require
  // complex mocking of file system operations and pino internals.

  it('should export createProductionLogger function', async () => {
    const { createProductionLogger } = await import('./production');
    expect(createProductionLogger).toBeDefined();
    expect(typeof createProductionLogger).toBe('function');
  });

  it('should export initProductionLogger function', async () => {
    const { initProductionLogger } = await import('./production');
    expect(initProductionLogger).toBeDefined();
    expect(typeof initProductionLogger).toBe('function');
  });

  it('should create production logger in non-production environment', async () => {
    const { createProductionLogger } = await import('./production');
    const logger = await createProductionLogger();

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should initialize production logger', async () => {
    const { initProductionLogger } = await import('./production');
    const logger = await initProductionLogger();

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should return same logger instance on multiple init calls', async () => {
    const { initProductionLogger } = await import('./production');

    const logger1 = await initProductionLogger();
    const logger2 = await initProductionLogger();

    // Should return the same cached instance
    expect(logger1).toBe(logger2);
  });

  it('should handle logger creation without errors', async () => {
    const { createProductionLogger } = await import('./production');

    await expect(createProductionLogger()).resolves.toBeDefined();
  });

  it('should create logger with proper methods', async () => {
    const { createProductionLogger } = await import('./production');
    const logger = await createProductionLogger();

    const methods = ['info', 'error', 'warn', 'debug', 'trace', 'fatal', 'child'];
    methods.forEach((method) => {
      expect(typeof (logger as any)[method]).toBe('function');
    });
  });
});
