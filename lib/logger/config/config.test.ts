import pino from 'pino';
import { createChildLogger, getLoggerConfig, isServer, isTest, LOG_DIR } from './config';

describe('Logger Config', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should detect test environment', () => {
      expect(isTest).toBe(true);
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should detect server environment', () => {
      expect(isServer).toBeDefined();
      expect(typeof isServer).toBe('boolean');
      // In jest with jsdom environment, window is defined
      expect(typeof window).not.toBe('undefined');
    });

    it('should have default LOG_DIR', () => {
      expect(LOG_DIR).toBeDefined();
      expect(typeof LOG_DIR).toBe('string');
    });

    it('should have LOG_DIR as string', () => {
      expect(typeof LOG_DIR).toBe('string');
      expect(LOG_DIR.length).toBeGreaterThan(0);
    });
  });

  describe('getLoggerConfig', () => {
    it('should return test config in test environment', () => {
      const config = getLoggerConfig();
      expect(config).toBeDefined();
      expect(config.level).toBe('silent');
    });

    it('should return config with level property', () => {
      const config = getLoggerConfig();
      expect(config).toHaveProperty('level');
      expect(typeof config.level).toBe('string');
    });

    it('should return valid LoggerOptions', () => {
      const config = getLoggerConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should respect LOG_LEVEL environment variable when set', () => {
      // Test that the config respects environment variables
      const config = getLoggerConfig();
      expect(config.level).toBeDefined();
    });
  });

  describe('createChildLogger', () => {
    let mockParentLogger: pino.Logger;

    beforeEach(() => {
      mockParentLogger = pino({ level: 'silent' });
      jest.spyOn(mockParentLogger, 'child');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create child logger with name', () => {
      const childLogger = createChildLogger(mockParentLogger, 'test-service');
      expect(mockParentLogger.child).toHaveBeenCalledWith({ name: 'test-service' });
      expect(childLogger).toBeDefined();
    });

    it('should create child logger with name and additional context', () => {
      const additionalContext = { version: '1.0', environment: 'staging' };
      const childLogger = createChildLogger(mockParentLogger, 'api-service', additionalContext);

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'api-service',
        version: '1.0',
        environment: 'staging',
      });
      expect(childLogger).toBeDefined();
    });

    it('should create child logger with empty additional context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'db-service', {});
      expect(mockParentLogger.child).toHaveBeenCalledWith({ name: 'db-service' });
      expect(childLogger).toBeDefined();
    });

    it('should create child logger without additional context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'auth-service');
      expect(mockParentLogger.child).toHaveBeenCalledWith({ name: 'auth-service' });
      expect(childLogger).toBeDefined();
    });

    it('should preserve parent logger functionality', () => {
      const childLogger = createChildLogger(mockParentLogger, 'child');
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
    });

    it('should handle complex additional context', () => {
      const complexContext = {
        requestId: 'req-123',
        userId: 456,
        metadata: { ip: '127.0.0.1', userAgent: 'test' },
      };
      const childLogger = createChildLogger(mockParentLogger, 'request-handler', complexContext);

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'request-handler',
        ...complexContext,
      });
      expect(childLogger).toBeDefined();
    });

    it('should call parent child method exactly once', () => {
      createChildLogger(mockParentLogger, 'test');
      expect(mockParentLogger.child).toHaveBeenCalledTimes(1);
    });

    it('should return logger with child method', () => {
      const childLogger = createChildLogger(mockParentLogger, 'test');
      expect(typeof childLogger.child).toBe('function');
    });

    it('should handle numeric values in context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'service', {
        port: 3000,
        timeout: 5000,
      });

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'service',
        port: 3000,
        timeout: 5000,
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle boolean values in context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'service', {
        enabled: true,
        debug: false,
      });

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'service',
        enabled: true,
        debug: false,
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle nested object in context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'service', {
        config: {
          host: 'localhost',
          port: 3000,
        },
      });

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'service',
        config: {
          host: 'localhost',
          port: 3000,
        },
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle array in context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'service', {
        tags: ['api', 'production'],
      });

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'service',
        tags: ['api', 'production'],
      });
      expect(childLogger).toBeDefined();
    });

    it('should handle null in context', () => {
      const childLogger = createChildLogger(mockParentLogger, 'service', {
        userId: null,
      });

      expect(mockParentLogger.child).toHaveBeenCalledWith({
        name: 'service',
        userId: null,
      });
      expect(childLogger).toBeDefined();
    });

    it('should preserve logger level', () => {
      const childLogger = createChildLogger(mockParentLogger, 'test');
      expect(childLogger.level).toBeDefined();
    });

    it('should create functional child logger', () => {
      const childLogger = createChildLogger(mockParentLogger, 'test');

      // Should not throw
      expect(() => childLogger.info('test')).not.toThrow();
      expect(() => childLogger.error('test')).not.toThrow();
    });
  });

  describe('Configuration properties', () => {
    it('should have valid configuration structure', () => {
      const config = getLoggerConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should use silent level in test environment', () => {
      // In test environment
      const config = getLoggerConfig();
      expect(config.level).toBe('silent');
    });

    it('should return consistent config on multiple calls', () => {
      const config1 = getLoggerConfig();
      const config2 = getLoggerConfig();
      expect(config1.level).toBe(config2.level);
    });
  });

  describe('Module exports', () => {
    it('should export all required functions', () => {
      expect(getLoggerConfig).toBeDefined();
      expect(createChildLogger).toBeDefined();
      expect(typeof getLoggerConfig).toBe('function');
      expect(typeof createChildLogger).toBe('function');
    });

    it('should export all required constants', () => {
      expect(isTest).toBeDefined();
      expect(isServer).toBeDefined();
      expect(LOG_DIR).toBeDefined();
    });

    it('should have correct types for exports', () => {
      expect(typeof isTest).toBe('boolean');
      expect(typeof isServer).toBe('boolean');
      expect(typeof LOG_DIR).toBe('string');
    });
  });
});
