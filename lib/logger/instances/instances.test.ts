import {
  apiLogger,
  authLogger,
  createBrowserLogger,
  createLogger,
  createRequestLogger,
  dbLogger,
  logApiRequest,
  logger,
  stravaLogger,
} from './instances';

// Mock pino-pretty
jest.mock(
  'pino-pretty',
  () => {
    return jest.fn(() => ({
      write: jest.fn(),
    }));
  },
  { virtual: true }
);

describe('Logger Instances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console spies
    jest.spyOn(console, 'trace').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logger', () => {
    it('should create a logger instance using Proxy', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });

    it('should allow calling logger methods', () => {
      // These should not throw
      expect(() => logger.info('test message')).not.toThrow();
      expect(() => logger.error('error message')).not.toThrow();
      expect(() => logger.warn('warning message')).not.toThrow();
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should support creating child loggers', () => {
      const childLogger = logger.child({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('Child Loggers', () => {
    it('should create apiLogger with api context', () => {
      expect(apiLogger).toBeDefined();
      expect(typeof apiLogger.info).toBe('function');
      expect(typeof apiLogger.error).toBe('function');
    });

    it('should create stravaLogger with strava context', () => {
      expect(stravaLogger).toBeDefined();
      expect(typeof stravaLogger.info).toBe('function');
      expect(typeof stravaLogger.debug).toBe('function');
    });

    it('should create authLogger with auth context', () => {
      expect(authLogger).toBeDefined();
      expect(typeof authLogger.info).toBe('function');
      expect(typeof authLogger.error).toBe('function');
    });

    it('should create dbLogger with database context', () => {
      expect(dbLogger).toBeDefined();
      expect(typeof dbLogger.info).toBe('function');
      expect(typeof dbLogger.error).toBe('function');
    });
  });

  describe('createBrowserLogger', () => {
    it('should create a browser logger with all methods', () => {
      const browserLogger = createBrowserLogger();

      expect(browserLogger).toBeDefined();
      expect(typeof browserLogger.trace).toBe('function');
      expect(typeof browserLogger.debug).toBe('function');
      expect(typeof browserLogger.info).toBe('function');
      expect(typeof browserLogger.warn).toBe('function');
      expect(typeof browserLogger.error).toBe('function');
      expect(typeof browserLogger.fatal).toBe('function');
      expect(typeof browserLogger.child).toBe('function');
    });

    it('should call console methods when logging', () => {
      const browserLogger = createBrowserLogger();

      browserLogger.trace('trace message');
      expect(console.trace).toHaveBeenCalledWith('trace message');

      browserLogger.debug('debug message');
      expect(console.debug).toHaveBeenCalledWith('debug message');

      browserLogger.info('info message');
      expect(console.info).toHaveBeenCalledWith('info message');

      browserLogger.warn('warn message');
      expect(console.warn).toHaveBeenCalledWith('warn message');

      browserLogger.error('error message');
      expect(console.error).toHaveBeenCalledWith('error message');

      browserLogger.fatal('fatal message');
      expect(console.error).toHaveBeenCalledWith('[FATAL]', 'fatal message');
    });

    it('should create child logger with bindings', () => {
      const browserLogger = createBrowserLogger();
      const childLogger = browserLogger.child({ context: 'test', userId: 123 });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');

      childLogger.info('child message');
      expect(console.info).toHaveBeenCalledWith(
        JSON.stringify({ context: 'test', userId: 123 }),
        'child message'
      );
    });

    it('should create nested child logger', () => {
      const browserLogger = createBrowserLogger();
      const childLogger = browserLogger.child({ level1: 'parent' });

      childLogger.trace('trace msg');
      expect(console.trace).toHaveBeenCalledWith(JSON.stringify({ level1: 'parent' }), 'trace msg');

      childLogger.debug('debug msg');
      expect(console.debug).toHaveBeenCalledWith(JSON.stringify({ level1: 'parent' }), 'debug msg');

      childLogger.warn('warn msg');
      expect(console.warn).toHaveBeenCalledWith(JSON.stringify({ level1: 'parent' }), 'warn msg');

      childLogger.error('error msg');
      expect(console.error).toHaveBeenCalledWith(JSON.stringify({ level1: 'parent' }), 'error msg');

      childLogger.fatal('fatal msg');
      expect(console.error).toHaveBeenCalledWith(
        '[FATAL]',
        JSON.stringify({ level1: 'parent' }),
        'fatal msg'
      );
    });

    it('should handle multiple arguments in log methods', () => {
      const browserLogger = createBrowserLogger();

      browserLogger.info('message', { data: 'test' }, 123);
      expect(console.info).toHaveBeenCalledWith('message', { data: 'test' }, 123);
    });
  });

  describe('createLogger', () => {
    it('should create a child logger with custom context', () => {
      const customLogger = createLogger({ module: 'payment', version: '1.0' });

      expect(customLogger).toBeDefined();
      expect(typeof customLogger.info).toBe('function');
    });

    it('should create logger with empty context', () => {
      const customLogger = createLogger({});

      expect(customLogger).toBeDefined();
      expect(typeof customLogger.info).toBe('function');
    });
  });

  describe('createRequestLogger', () => {
    it('should create a request logger with requestId', () => {
      const requestLogger = createRequestLogger('req-123');

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });

    it('should create request logger with additional context', () => {
      const requestLogger = createRequestLogger('req-456', {
        userId: 'user-789',
        endpoint: '/api/users',
      });

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });

    it('should create request logger with empty additional context', () => {
      const requestLogger = createRequestLogger('req-000', {});

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });
  });

  describe('logApiRequest', () => {
    let infoSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      infoSpy = jest.spyOn(apiLogger, 'info').mockImplementation();
      warnSpy = jest.spyOn(apiLogger, 'warn').mockImplementation();
      errorSpy = jest.spyOn(apiLogger, 'error').mockImplementation();
    });

    afterEach(() => {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should log successful request (2xx) as info', () => {
      logApiRequest('GET', '/api/users', 200);

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

    it('should log successful request with duration', () => {
      logApiRequest('POST', '/api/posts', 201, 150);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/posts',
          statusCode: 201,
          duration: '150ms',
        },
        'API request completed'
      );
    });

    it('should log client error (4xx) as warning', () => {
      logApiRequest('GET', '/api/users/999', 404);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/users/999',
          statusCode: 404,
        },
        'API request error'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log client error with duration', () => {
      logApiRequest('POST', '/api/login', 401, 50);

      expect(warnSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/login',
          statusCode: 401,
          duration: '50ms',
        },
        'API request error'
      );
    });

    it('should log server error (5xx) as error', () => {
      logApiRequest('POST', '/api/payments', 500);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/api/payments',
          statusCode: 500,
        },
        'API request failed'
      );
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log server error with duration', () => {
      logApiRequest('GET', '/api/data', 503, 1000);

      expect(errorSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/data',
          statusCode: 503,
          duration: '1000ms',
        },
        'API request failed'
      );
    });

    it('should handle duration of 0', () => {
      logApiRequest('GET', '/api/fast', 200, 0);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/api/fast',
          statusCode: 200,
          duration: '0ms',
        },
        'API request completed'
      );
    });

    it('should handle undefined duration', () => {
      logApiRequest('DELETE', '/api/resource', 204, undefined);

      expect(infoSpy).toHaveBeenCalledWith(
        {
          method: 'DELETE',
          path: '/api/resource',
          statusCode: 204,
        },
        'API request completed'
      );
    });

    it('should log different HTTP methods', () => {
      logApiRequest('PUT', '/api/update', 200);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
        'API request completed'
      );

      logApiRequest('PATCH', '/api/patch', 200);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH' }),
        'API request completed'
      );

      logApiRequest('DELETE', '/api/delete', 204);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'DELETE' }),
        'API request completed'
      );
    });
  });
});
