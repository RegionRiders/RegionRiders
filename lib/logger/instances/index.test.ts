import * as instancesModule from './instances';

describe('Logger Instances Index Exports', () => {
  it('should export logger', () => {
    expect(instancesModule.logger).toBeDefined();
    expect(typeof instancesModule.logger).toBe('object');
  });

  it('should export apiLogger', () => {
    expect(instancesModule.apiLogger).toBeDefined();
    expect(typeof instancesModule.apiLogger).toBe('object');
  });

  it('should export stravaLogger', () => {
    expect(instancesModule.stravaLogger).toBeDefined();
    expect(typeof instancesModule.stravaLogger).toBe('object');
  });

  it('should export authLogger', () => {
    expect(instancesModule.authLogger).toBeDefined();
    expect(typeof instancesModule.authLogger).toBe('object');
  });

  it('should export dbLogger', () => {
    expect(instancesModule.dbLogger).toBeDefined();
    expect(typeof instancesModule.dbLogger).toBe('object');
  });

  it('should export createBrowserLogger function', () => {
    expect(instancesModule.createBrowserLogger).toBeDefined();
    expect(typeof instancesModule.createBrowserLogger).toBe('function');
  });

  it('should export createLogger function', () => {
    expect(instancesModule.createLogger).toBeDefined();
    expect(typeof instancesModule.createLogger).toBe('function');
  });

  it('should export createRequestLogger function', () => {
    expect(instancesModule.createRequestLogger).toBeDefined();
    expect(typeof instancesModule.createRequestLogger).toBe('function');
  });

  it('should export logApiRequest function', () => {
    expect(instancesModule.logApiRequest).toBeDefined();
    expect(typeof instancesModule.logApiRequest).toBe('function');
  });

  it('should have all expected exports', () => {
    const expectedExports = [
      'logger',
      'apiLogger',
      'stravaLogger',
      'authLogger',
      'dbLogger',
      'createBrowserLogger',
      'createLogger',
      'createRequestLogger',
      'logApiRequest',
    ];

    expectedExports.forEach((exportName) => {
      expect(instancesModule).toHaveProperty(exportName);
    });
  });

  it('should only export expected items', () => {
    const exports = Object.keys(instancesModule);
    const expectedExports = [
      'logger',
      'apiLogger',
      'stravaLogger',
      'authLogger',
      'dbLogger',
      'createBrowserLogger',
      'createLogger',
      'createRequestLogger',
      'logApiRequest',
    ];

    expect(exports.sort()).toEqual(expectedExports.sort());
  });
});
