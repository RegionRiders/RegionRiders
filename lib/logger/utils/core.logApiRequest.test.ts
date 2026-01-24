/**
 * Coverage tests for utils/core.ts logApiRequest branches
 * Targets: status code branches (info/warn/error) and duration optional parameter
 */

/* eslint-disable @typescript-eslint/no-require-imports */

describe('Core Utils - logApiRequest Coverage', () => {
  let mockApiLogger: any;
  let infoSpy: jest.Mock;
  let warnSpy: jest.Mock;
  let errorSpy: jest.Mock;

  beforeEach(() => {
    infoSpy = jest.fn();
    warnSpy = jest.fn();
    errorSpy = jest.fn();

    mockApiLogger = {
      info: infoSpy,
      warn: warnSpy,
      error: errorSpy,
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
    };

    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success status codes (< 400)', () => {
    it('should log info for status 200', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/users', 200);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
        },
        'API request completed'
      );
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log info for status 201', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('POST', '/api/resource', 201);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/resource',
          statusCode: 201,
        },
        'API request completed'
      );
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log info for status 204', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('DELETE', '/api/item/123', 204);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'DELETE',
          path: '/api/item/123',
          statusCode: 204,
        },
        'API request completed'
      );
    });

    it('should log info for status 399 (upper boundary)', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/edge', 399);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/edge',
          statusCode: 399,
        },
        'API request completed'
      );
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Client error status codes (400-499)', () => {
    it('should log warn for status 400', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('POST', '/api/validate', 400);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/validate',
          statusCode: 400,
        },
        'API request error'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log warn for status 404', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/notfound', 404);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/notfound',
          statusCode: 404,
        },
        'API request error'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log warn for status 403', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('PUT', '/api/admin', 403);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'PUT',
          path: '/api/admin',
          statusCode: 403,
        },
        'API request error'
      );
    });

    it('should log warn for status 499 (upper boundary)', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/edge', 499);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/edge',
          statusCode: 499,
        },
        'API request error'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Server error status codes (>= 500)', () => {
    it('should log error for status 500', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/crash', 500);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/crash',
          statusCode: 500,
        },
        'API request failed'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log error for status 502', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('POST', '/api/gateway', 502);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/gateway',
          statusCode: 502,
        },
        'API request failed'
      );
    });

    it('should log error for status 503', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/unavailable', 503);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/unavailable',
          statusCode: 503,
        },
        'API request failed'
      );
    });

    it('should log error for status 599', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('DELETE', '/api/fail', 599);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'DELETE',
          path: '/api/fail',
          statusCode: 599,
        },
        'API request failed'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Duration parameter', () => {
    it('should include duration when provided for success', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/timed', 200, 150);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/timed',
          statusCode: 200,
          duration: '150ms',
        },
        'API request completed'
      );
    });

    it('should omit duration when undefined for success', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/notimed', 200, undefined);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/notimed',
          statusCode: 200,
        },
        'API request completed'
      );

      // Verify duration is NOT in the logged object
      const loggedData = infoSpy.mock.calls[0][0];
      expect(loggedData).not.toHaveProperty('duration');
    });

    it('should include duration when provided for client error', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('POST', '/api/bad', 400, 25);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/bad',
          statusCode: 400,
          duration: '25ms',
        },
        'API request error'
      );
    });

    it('should omit duration when not provided for client error', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/notfound', 404);

      const loggedData = warnSpy.mock.calls[0][0];
      expect(loggedData).not.toHaveProperty('duration');
    });

    it('should include duration when provided for server error', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/error', 500, 1234);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/error',
          statusCode: 500,
          duration: '1234ms',
        },
        'API request failed'
      );
    });

    it('should omit duration when not provided for server error', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('POST', '/api/fail', 503);

      const loggedData = errorSpy.mock.calls[0][0];
      expect(loggedData).not.toHaveProperty('duration');
    });

    it('should handle duration of 0', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      helpers.logApiRequest('GET', '/api/instant', 200, 0);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/instant',
          statusCode: 200,
          duration: '0ms',
        },
        'API request completed'
      );
    });
  });

  describe('All helper functions', () => {
    it('should export createLogger', () => {
      const mockBaseLogger = {
        child: jest.fn().mockReturnValue({ info: jest.fn() }),
      };

      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockBaseLogger as any, mockApiLogger);

      const childLogger = helpers.createLogger({ service: 'test' });

      expect(mockBaseLogger.child).toHaveBeenCalledWith({ service: 'test' });
      expect(childLogger).toBeDefined();
    });

    it('should export createRequestLogger', () => {
      const mockBaseLogger = {
        child: jest.fn().mockReturnValue({ info: jest.fn() }),
      };

      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockBaseLogger as any, mockApiLogger);

      const requestLogger = helpers.createRequestLogger('req-123', { path: '/test' });

      expect(mockBaseLogger.child).toHaveBeenCalledWith({
        requestId: 'req-123',
        path: '/test',
      });
      expect(requestLogger).toBeDefined();
    });

    it('should export logApiRequest', () => {
      const { createLoggerHelpers } = require('./core');
      const helpers = createLoggerHelpers(mockApiLogger, mockApiLogger);

      expect(typeof helpers.logApiRequest).toBe('function');
    });
  });

  describe('createNamedLoggers', () => {
    it('should create all named loggers', () => {
      const mockBaseLogger: any = {
        child: jest.fn((bindings: any) => ({ ...mockBaseLogger, bindings })),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
      };

      const { createNamedLoggers } = require('./core');
      const namedLoggers = createNamedLoggers(mockBaseLogger);

      expect(namedLoggers.apiLogger).toBeDefined();
      expect(namedLoggers.stravaLogger).toBeDefined();
      expect(namedLoggers.authLogger).toBeDefined();
      expect(namedLoggers.dbLogger).toBeDefined();

      expect(mockBaseLogger.child).toHaveBeenCalledWith({ context: 'api' });
      expect(mockBaseLogger.child).toHaveBeenCalledWith({ context: 'strava' });
      expect(mockBaseLogger.child).toHaveBeenCalledWith({ context: 'auth' });
      expect(mockBaseLogger.child).toHaveBeenCalledWith({ context: 'database' });
    });
  });
});
