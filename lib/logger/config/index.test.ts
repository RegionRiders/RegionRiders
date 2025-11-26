import * as configModule from './index';

describe('Logger Config Index Exports', () => {
  it('should export getLoggerConfig function', () => {
    expect(configModule.getLoggerConfig).toBeDefined();
    expect(typeof configModule.getLoggerConfig).toBe('function');
  });

  it('should export isProduction constant', () => {
    expect(configModule).toHaveProperty('isProduction');
    expect(typeof configModule.isProduction).toBe('boolean');
  });

  it('should export isServer constant', () => {
    expect(configModule).toHaveProperty('isServer');
    expect(typeof configModule.isServer).toBe('boolean');
  });

  it('should export isTest constant', () => {
    expect(configModule).toHaveProperty('isTest');
    expect(typeof configModule.isTest).toBe('boolean');
  });

  it('should export LOG_DIR constant', () => {
    expect(configModule.LOG_DIR).toBeDefined();
    expect(typeof configModule.LOG_DIR).toBe('string');
  });

  it('should export createChildLogger function', () => {
    expect(configModule.createChildLogger).toBeDefined();
    expect(typeof configModule.createChildLogger).toBe('function');
  });

  it('should export createProductionLogger function', () => {
    expect(configModule.createProductionLogger).toBeDefined();
    expect(typeof configModule.createProductionLogger).toBe('function');
  });

  it('should export initProductionLogger function', () => {
    expect(configModule.initProductionLogger).toBeDefined();
    expect(typeof configModule.initProductionLogger).toBe('function');
  });

  it('should have all expected exports', () => {
    const expectedExports = [
      'getLoggerConfig',
      'isProduction',
      'isServer',
      'isTest',
      'LOG_DIR',
      'createChildLogger',
      'createProductionLogger',
      'initProductionLogger',
    ];

    expectedExports.forEach((exportName) => {
      expect(configModule).toHaveProperty(exportName);
    });
  });

  it('should only export expected items', () => {
    const exports = Object.keys(configModule);
    const expectedExports = [
      'getLoggerConfig',
      'isProduction',
      'isServer',
      'isTest',
      'LOG_DIR',
      'createChildLogger',
      'createProductionLogger',
      'initProductionLogger',
    ];

    expect(exports.sort()).toEqual(expectedExports.sort());
  });

  it('should export functions from config.ts', () => {
    expect(typeof configModule.getLoggerConfig).toBe('function');
    expect(typeof configModule.createChildLogger).toBe('function');
  });

  it('should export functions from production.ts', () => {
    expect(typeof configModule.createProductionLogger).toBe('function');
    expect(typeof configModule.initProductionLogger).toBe('function');
  });

  it('should export constants with correct values', () => {
    expect(configModule.isTest).toBe(true); // In test environment
    expect(typeof configModule.isServer).toBe('boolean'); // isServer is boolean (false in jsdom)
  });
});
