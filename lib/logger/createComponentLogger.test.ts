import { createComponentLogger } from './client';

describe('createComponentLogger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should create a logger with component name prefix', () => {
    const logger = createComponentLogger('TestComponent');

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(consoleDebugSpy).toHaveBeenCalledWith('[TestComponent]', 'Debug message');
    expect(consoleInfoSpy).toHaveBeenCalledWith('[TestComponent]', 'Info message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[TestComponent]', 'Warning message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestComponent]', 'Error message');
  });

  it('should work with useRegionLoading component', () => {
    const logger = createComponentLogger('useRegionLoading');

    logger.debug('Loading regions...');
    expect(consoleDebugSpy).toHaveBeenCalledWith('[useRegionLoading]', 'Loading regions...');

    logger.debug('Loaded 5 regions (123.45ms)');
    expect(consoleDebugSpy).toHaveBeenCalledWith(
      '[useRegionLoading]',
      'Loaded 5 regions (123.45ms)'
    );
  });

  it('should work with GPXLoader component', () => {
    const logger = createComponentLogger('GPXLoader');

    logger.debug('Cache: 10 cached, 2 loading');
    expect(consoleDebugSpy).toHaveBeenCalledWith('[GPXLoader]', 'Cache: 10 cached, 2 loading');
  });

  it('should support additional context', () => {
    const logger = createComponentLogger('TestComponent', { version: '1.0' });

    logger.info('Test message');

    // Should include both component and additional context
    const call = consoleInfoSpy.mock.calls[0];
    expect(call[0]).toContain('[TestComponent]');
    expect(call[0]).toContain('version');
  });

  it('should create child loggers that preserve component context', () => {
    const parentLogger = createComponentLogger('ParentComponent');
    const childLogger = parentLogger.child({ action: 'fetch' });

    childLogger.info('Fetching data');

    const call = consoleInfoSpy.mock.calls[0];
    expect(call[0]).toContain('[ParentComponent]');
    expect(call[0]).toContain('action');
  });
});
