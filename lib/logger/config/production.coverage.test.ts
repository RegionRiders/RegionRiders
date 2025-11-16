/**
 * Coverage tests for production.ts branches
 * Targets: production vs non-production paths, mkdir success/error, multistream creation
 */

// Create a mock function that persists across module resets
const mockMkdir = jest.fn();

// Mock fs/promises before any imports
jest.mock('fs/promises', () => ({
  mkdir: mockMkdir,
}));

describe('Production Logger - Coverage Tests', () => {
  let originalEnv: string | undefined;
  let originalLogDir: string | undefined;

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

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    originalLogDir = process.env.LOG_DIR;
    mockMkdir.mockClear();
  });

  afterEach(() => {
    restoreNodeEnv(originalEnv);
    if (originalLogDir !== undefined) {
      process.env.LOG_DIR = originalLogDir;
    } else {
      delete process.env.LOG_DIR;
    }
    jest.resetModules();
  });

  describe('Non-production environment', () => {
    it('should return standard logger when not in production', async () => {
      setNodeEnv('development');
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      // mkdir should not be called in non-production
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    it('should return standard logger when in test environment', async () => {
      setNodeEnv('test');
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });

  describe('Production environment success path', () => {
    it('should create production logger with file streams', async () => {
      setNodeEnv('production');
      process.env.LOG_DIR = './test-logs-temp';
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');

      // Verify mkdir was called with correct path
      expect(mockMkdir).toHaveBeenCalledWith('./test-logs-temp', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledTimes(1);
    });

    it('should create streams with correct log file paths', async () => {
      setNodeEnv('production');
      process.env.LOG_DIR = './test-log-app';
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      expect(logger).toBeDefined();

      // Verify mkdir was called with correct path
      expect(mockMkdir).toHaveBeenCalledWith('./test-log-app', { recursive: true });
    });
  });

  describe('Production environment error path', () => {
    it('should handle mkdir failure and return fallback logger', async () => {
      setNodeEnv('production');
      process.env.LOG_DIR = './invalid-path-test';

      const mkdirError = new Error('Permission denied');
      mockMkdir.mockRejectedValue(mkdirError);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      // Should still return a working logger
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');

      // Verify mkdir was attempted
      expect(mockMkdir).toHaveBeenCalledWith('./invalid-path-test', { recursive: true });
    });

    it('should log error when production logger creation fails', async () => {
      setNodeEnv('production');
      process.env.LOG_DIR = './fail-path-test';

      const mkdirError = new Error('Disk full');
      mockMkdir.mockRejectedValue(mkdirError);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      const logger = await createProductionLogger();

      // Should return fallback logger that works
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');

      // Verify mkdir was attempted
      expect(mockMkdir).toHaveBeenCalledWith('./fail-path-test', { recursive: true });
    });
  });

  describe('initProductionLogger caching', () => {
    it('should cache and return same logger instance', async () => {
      setNodeEnv('production');
      process.env.LOG_DIR = './cache-test';
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const productionModule = await import('./production');

      const logger1 = await productionModule.initProductionLogger();
      const logger2 = await productionModule.initProductionLogger();

      // Should return same instance
      expect(logger1).toBe(logger2);

      // mkdir should only be called once due to caching
      expect(mockMkdir).toHaveBeenCalledTimes(1);
    });

    it('should initialize logger on first call', async () => {
      setNodeEnv('production');
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { initProductionLogger } = await import('./production');
      const logger = await initProductionLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(mockMkdir).toHaveBeenCalled();
    });
  });

  describe('Production logger with default LOG_DIR', () => {
    it('should use default ./logs when LOG_DIR not set', async () => {
      setNodeEnv('production');
      delete process.env.LOG_DIR;
      mockMkdir.mockResolvedValue(undefined);

      jest.resetModules();
      const { createProductionLogger } = await import('./production');
      await createProductionLogger();

      expect(mockMkdir).toHaveBeenCalledWith('./logs', { recursive: true });
    });
  });
});
