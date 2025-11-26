import pino from 'pino';
import { logError } from './logError';

// Mock the config module
jest.mock('../config', () => ({
  isProduction: false,
}));

describe('logError Utility', () => {
  let mockLogger: pino.Logger;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = pino({ level: 'silent' });
    errorSpy = jest.spyOn(mockLogger, 'error').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Error objects', () => {
    it('should log Error with all properties', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n  at test.ts:1:1';

      logError(mockLogger, error, 'test context');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith({
        context: 'test context',
        errorMessage: 'Test error message',
        errorName: 'Error',
        stack: error.stack,
      });
    });

    it('should log Error without context', () => {
      const error = new Error('No context');

      logError(mockLogger, error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'No context',
          errorName: 'Error',
        })
      );
    });

    it('should log Error with object context', () => {
      const error = new Error('Object context error');
      const context = { userId: '123', requestId: 'req-456', path: '/api/test' };

      logError(mockLogger, error, context);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123',
          requestId: 'req-456',
          path: '/api/test',
          errorMessage: 'Object context error',
          errorName: 'Error',
        })
      );
    });

    it('should log Error without stack', () => {
      const error = new Error('No stack');
      delete error.stack;

      logError(mockLogger, error, 'test');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'test',
        errorMessage: 'No stack',
        errorName: 'Error',
      });
    });

    it('should handle custom Error subclasses', () => {
      class ValidationError extends Error {
        constructor(
          message: string,
          public field: string
        ) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      const error = new ValidationError('Invalid input', 'email');

      logError(mockLogger, error, { endpoint: '/register' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/register',
          errorMessage: 'Invalid input',
          errorName: 'ValidationError',
        })
      );
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Type mismatch');

      logError(mockLogger, error, 'type error context');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'type error context',
          errorMessage: 'Type mismatch',
          errorName: 'TypeError',
        })
      );
    });

    it('should handle RangeError', () => {
      const error = new RangeError('Out of range');

      logError(mockLogger, error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Out of range',
          errorName: 'RangeError',
        })
      );
    });

    it('should handle ReferenceError', () => {
      const error = new ReferenceError('Variable not defined');

      logError(mockLogger, error, { component: 'parser' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'parser',
          errorMessage: 'Variable not defined',
          errorName: 'ReferenceError',
        })
      );
    });
  });

  describe('Production environment', () => {
    it('should include stack trace in non-production (test) environment', () => {
      // In test environment, isProduction is false, so stack should be included
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:1:1';

      logError(mockLogger, error, 'test context');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'test context',
          errorMessage: 'Test error',
          errorName: 'Error',
          stack: error.stack,
        })
      );
    });

    it('should not include undefined stack', () => {
      const error = new Error('No stack');
      delete error.stack;

      logError(mockLogger, error, 'test context');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({ stack: expect.anything() })
      );
    });
  });

  describe('Non-Error values', () => {
    it('should log string as error', () => {
      logError(mockLogger, 'string error', 'context');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'context',
        error: 'string error',
      });
    });

    it('should log number as error', () => {
      logError(mockLogger, 404);

      expect(errorSpy).toHaveBeenCalledWith({
        error: 404,
      });
    });

    it('should log boolean as error', () => {
      logError(mockLogger, false, 'boolean error');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'boolean error',
        error: false,
      });
    });

    it('should log null as error', () => {
      logError(mockLogger, null, 'null error');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'null error',
        error: null,
      });
    });

    it('should log undefined as error', () => {
      logError(mockLogger, undefined, 'undefined error');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'undefined error',
        error: undefined,
      });
    });

    it('should log object as error', () => {
      const errorObj = { code: 'ERR001', message: 'Custom error' };

      logError(mockLogger, errorObj, { source: 'api' });

      expect(errorSpy).toHaveBeenCalledWith({
        source: 'api',
        error: errorObj,
      });
    });

    it('should log array as error', () => {
      const errorArray = ['error1', 'error2'];

      logError(mockLogger, errorArray, 'array error');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'array error',
        error: errorArray,
      });
    });

    it('should log function as error', () => {
      const errorFunc = () => {};

      logError(mockLogger, errorFunc);

      expect(errorSpy).toHaveBeenCalledWith({
        error: errorFunc,
      });
    });

    it('should log symbol as error', () => {
      const errorSymbol = Symbol('error');

      logError(mockLogger, errorSymbol, 'symbol error');

      expect(errorSpy).toHaveBeenCalledWith({
        context: 'symbol error',
        error: errorSymbol,
      });
    });
  });

  describe('Context variations', () => {
    it('should handle empty string context', () => {
      const error = new Error('Test');

      logError(mockLogger, error, '');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: '',
          errorMessage: 'Test',
          errorName: 'Error',
        })
      );
    });

    it('should handle empty object context', () => {
      const error = new Error('Test');

      logError(mockLogger, error, {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Test',
          errorName: 'Error',
        })
      );
    });

    it('should handle complex object context', () => {
      const error = new Error('Complex context');
      const context = {
        user: { id: '123', name: 'John' },
        request: { method: 'POST', path: '/api/test' },
        timestamp: 1234567890,
      };

      logError(mockLogger, error, context);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: '123', name: 'John' },
          request: { method: 'POST', path: '/api/test' },
          timestamp: 1234567890,
          errorMessage: 'Complex context',
          errorName: 'Error',
        })
      );
    });

    it('should handle nested object context', () => {
      const error = new Error('Nested');
      const context = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };

      logError(mockLogger, error, context);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level1: {
            level2: {
              level3: 'deep value',
            },
          },
          errorMessage: 'Nested',
          errorName: 'Error',
        })
      );
    });

    it('should handle context with special characters', () => {
      const error = new Error('Special chars');

      logError(mockLogger, error, 'context with "quotes" and \'apostrophes\'');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'context with "quotes" and \'apostrophes\'',
          errorMessage: 'Special chars',
          errorName: 'Error',
        })
      );
    });

    it('should handle context with unicode characters', () => {
      const error = new Error('Unicode');

      logError(mockLogger, error, 'context with émojis 🎉 and 中文');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'context with émojis 🎉 and 中文',
          errorMessage: 'Unicode',
          errorName: 'Error',
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle Error with empty message', () => {
      const error = new Error('');

      logError(mockLogger, error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: '',
          errorName: 'Error',
        })
      );
    });

    it('should handle Error with very long message', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      logError(mockLogger, error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: longMessage,
        })
      );
    });

    it('should handle Error with multiline message', () => {
      const error = new Error('Line 1\nLine 2\nLine 3');

      logError(mockLogger, error, 'multiline');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'multiline',
          errorMessage: 'Line 1\nLine 2\nLine 3',
          errorName: 'Error',
        })
      );
    });

    it('should handle circular reference in context object', () => {
      const error = new Error('Circular');
      const context: any = { self: null };
      context.self = context;

      // Should not throw
      expect(() => logError(mockLogger, error, context)).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should call error method on logger instance', () => {
      const error = new Error('Instance test');

      logError(mockLogger, error);

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.instances[0]).toBe(mockLogger);
    });

    it('should handle multiple calls with same logger', () => {
      logError(mockLogger, new Error('Error 1'));
      logError(mockLogger, new Error('Error 2'));
      logError(mockLogger, new Error('Error 3'));

      expect(errorSpy).toHaveBeenCalledTimes(3);
    });
  });
});
