/**
 * @jest-environment node
 */

// We need to test both server-side and client-side behavior
describe('logger', () => {
  let originalWindow: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('server-side (Node.js)', () => {
    beforeAll(() => {
      originalWindow = global.window;
      delete (global as any).window;
    });

    afterAll(() => {
      if (originalWindow) {
        (global as any).window = originalWindow;
      }
    });

    it('should create a Winston logger on the server', () => {
      const logger = require('./logger').default;

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should have proper log methods', () => {
      const logger = require('./logger').default;

      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('client-side (Browser)', () => {
    beforeEach(() => {
      // Mock window object for client-side
      (global as any).window = {};
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'debug').mockImplementation();
    });

    afterEach(() => {
      delete (global as any).window;
      jest.restoreAllMocks();
    });

    it('should use console methods on the client', () => {
      const logger = require('./logger').default;

      logger.info('Test info');
      logger.error('Test error');
      logger.warn('Test warning');
      logger.debug('Test debug');

      expect(console.log).toHaveBeenCalledWith('[INFO] Test info', '');
      expect(console.error).toHaveBeenCalledWith('[ERROR] Test error', '');
      expect(console.warn).toHaveBeenCalledWith('[WARN] Test warning', '');
      expect(console.debug).toHaveBeenCalledWith('[DEBUG] Test debug', '');
    });

    it('should handle metadata in client-side logging', () => {
      const logger = require('./logger').default;
      const meta = { userId: 123, action: 'test' };

      logger.info('Test with meta', meta);

      expect(console.log).toHaveBeenCalledWith('[INFO] Test with meta', meta);
    });
  });
});