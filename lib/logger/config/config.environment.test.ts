/**
 * Comprehensive tests for logger configuration covering all branches
 * Tests configuration behavior without modifying readonly environment variables
 */

import pino from 'pino';
import { createChildLogger, getLoggerConfig, LOG_DIR } from './config';

describe('Logger Config - Additional Coverage', () => {
  describe('Configuration formatters', () => {
    it('should return config with silent level in test environment', () => {
      const config = getLoggerConfig();

      expect(config).toBeDefined();
      expect(config.level).toBe('silent'); // We're in test environment
    });

    it('should return config with level propertyn', () => {
      const config = getLoggerConfig();

      expect(config).toHaveProperty('level');
    });
  });

  describe('LOG_DIR edge cases', () => {
    it('should return valid LOG_DIR path', () => {
      expect(LOG_DIR).toBeDefined();
      expect(typeof LOG_DIR).toBe('string');
      expect(LOG_DIR.length).toBeGreaterThan(0);

      // Should be either default or custom
      expect(LOG_DIR).toMatch(/^(\.\/logs|\/.*)/);
    });
  });

  describe('createChildLogger edge cases', () => {
    it('should handle special characters in logger name', () => {
      const mockLogger = pino({ level: 'silent' });
      const spy = jest.spyOn(mockLogger, 'child');

      const childLogger = createChildLogger(mockLogger, 'test-logger-123');

      expect(spy).toHaveBeenCalledWith({ name: 'test-logger-123' });
      expect(childLogger).toBeDefined();

      spy.mockRestore();
    });

    it('should handle unicode in logger name', () => {
      const mockLogger = pino({ level: 'silent' });
      const spy = jest.spyOn(mockLogger, 'child');

      const childLogger = createChildLogger(mockLogger, 'logger-日本語');

      expect(spy).toHaveBeenCalledWith({ name: 'logger-日本語' });
      expect(childLogger).toBeDefined();

      spy.mockRestore();
    });

    it('should handle empty string in logger name', () => {
      const mockLogger = pino({ level: 'silent' });
      const spy = jest.spyOn(mockLogger, 'child');

      const childLogger = createChildLogger(mockLogger, '');

      expect(spy).toHaveBeenCalledWith({ name: '' });
      expect(childLogger).toBeDefined();

      spy.mockRestore();
    });
  });

  describe('Configuration structure', () => {
    it('should return object with level property', () => {
      const config = getLoggerConfig();

      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('level');
      expect(typeof config.level).toBe('string');
    });

    it('should have valid log level', () => {
      const config = getLoggerConfig();
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

      expect(validLevels).toContain(config.level);
    });
  });
});
