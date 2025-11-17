/**
 * Coverage tests for config.ts environment branches and formatter functions
 * Targets: development/production environment selection, formatter invocation
 */

/* eslint-disable @typescript-eslint/no-require-imports */

describe('Logger Config - Environment Selection Coverage', () => {
  let originalEnv: string | undefined;

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
    jest.resetModules();
  });

  afterEach(() => {
    restoreNodeEnv(originalEnv);
    jest.resetModules();
  });

  describe('Development environment', () => {
    it('should return development config when NODE_ENV is development', () => {
      setNodeEnv('development');

      jest.isolateModules(() => {
        const { getLoggerConfig, isProduction, isTest } = require('./config');

        expect(isProduction).toBe(false);
        expect(isTest).toBe(false);

        const config = getLoggerConfig();
        expect(config).toBeDefined();
        expect(config.level).toBe('debug');
        expect(config.formatters).toBeDefined();
        expect(config.timestamp).toBeDefined();
      });
    });

    it('should invoke development formatter level function', () => {
      setNodeEnv('development');

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();

        expect(config.formatters).toBeDefined();
        expect(config.formatters.level).toBeDefined();

        const formatted = config.formatters.level('info');
        expect(formatted).toEqual({ level: 'INFO' });

        const formatted2 = config.formatters.level('debug');
        expect(formatted2).toEqual({ level: 'DEBUG' });
      });
    });

    it('should use debug level by default in development', () => {
      setNodeEnv('development');
      delete process.env.LOG_LEVEL;

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('debug');
      });
    });

    it('should respect LOG_LEVEL override in development', () => {
      setNodeEnv('development');
      process.env.LOG_LEVEL = 'trace';

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('trace');
      });

      delete process.env.LOG_LEVEL;
    });
  });

  describe('Production environment', () => {
    it('should return production config when NODE_ENV is production', () => {
      setNodeEnv('production');

      jest.isolateModules(() => {
        const { getLoggerConfig, isProduction, isTest } = require('./config');

        expect(isProduction).toBe(true);
        expect(isTest).toBe(false);

        const config = getLoggerConfig();
        expect(config).toBeDefined();
        expect(config.level).toBe('info');
        expect(config.formatters).toBeDefined();
        expect(config.redact).toBeDefined();
      });
    });

    it('should invoke production formatter level function', () => {
      setNodeEnv('production');

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();

        expect(config.formatters).toBeDefined();
        expect(config.formatters.level).toBeDefined();

        const formatted = config.formatters.level('error');
        expect(formatted).toEqual({ level: 'error' });

        const formatted2 = config.formatters.level('warn');
        expect(formatted2).toEqual({ level: 'warn' });
      });
    });

    it('should redact sensitive fields in production', () => {
      setNodeEnv('production');

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();

        expect(config.redact).toBeDefined();
        expect(config.redact.paths).toContain('password');
        expect(config.redact.paths).toContain('token');
        expect(config.redact.paths).toContain('authorization');
        expect(config.redact.remove).toBe(true);
      });
    });

    it('should use info level by default in production', () => {
      setNodeEnv('production');
      delete process.env.LOG_LEVEL;

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('info');
      });
    });

    it('should respect LOG_LEVEL override in production', () => {
      setNodeEnv('production');
      process.env.LOG_LEVEL = 'error';

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('error');
      });

      delete process.env.LOG_LEVEL;
    });
  });

  describe('Test environment', () => {
    it('should return test config when NODE_ENV is test', () => {
      setNodeEnv('test');

      jest.isolateModules(() => {
        const { getLoggerConfig, isProduction, isTest } = require('./config');

        expect(isProduction).toBe(false);
        expect(isTest).toBe(true);

        const config = getLoggerConfig();
        expect(config).toBeDefined();
        expect(config.level).toBe('silent');
      });
    });

    it('should use silent level by default in test', () => {
      setNodeEnv('test');
      delete process.env.LOG_LEVEL;

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('silent');
      });
    });

    it('should respect LOG_LEVEL override in test', () => {
      setNodeEnv('test');
      process.env.LOG_LEVEL = 'debug';

      jest.isolateModules(() => {
        const { getLoggerConfig } = require('./config');
        const config = getLoggerConfig();
        expect(config.level).toBe('debug');
      });

      delete process.env.LOG_LEVEL;
    });
  });

  describe('LOG_DIR environment variable', () => {
    it('should use default LOG_DIR when not set', () => {
      delete process.env.LOG_DIR;

      jest.isolateModules(() => {
        const { LOG_DIR } = require('./config');
        expect(LOG_DIR).toBe('./logs');
      });
    });

    it('should use custom LOG_DIR when set', () => {
      process.env.LOG_DIR = '/custom/log/path';

      jest.isolateModules(() => {
        const { LOG_DIR } = require('./config');
        expect(LOG_DIR).toBe('/custom/log/path');
      });

      delete process.env.LOG_DIR;
    });
  });

  describe('isServer detection', () => {
    it('should detect server environment correctly', () => {
      jest.isolateModules(() => {
        const { isServer } = require('./config');
        // In Jest with jsdom, window is defined, so isServer is false
        expect(typeof isServer).toBe('boolean');
        expect(isServer).toBe(typeof window === 'undefined');
      });
    });
  });
});
