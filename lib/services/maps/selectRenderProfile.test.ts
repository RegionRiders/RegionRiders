import { selectRegionRenderProfile } from './selectRenderProfile';

describe('selectRegionRenderProfile', () => {
  const originalInnerWidth = window.innerWidth;
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('returns desktop for large screens with no constrained device hints', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        deviceMemory: 8,
        connection: { effectiveType: '4g', saveData: false },
      },
    });

    expect(selectRegionRenderProfile()).toBe('desktop');
  });

  it('returns mobile for small screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 768,
      writable: true,
    });

    expect(selectRegionRenderProfile()).toBe('mobile');
  });

  it('returns mobile when save-data is enabled', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        deviceMemory: 8,
        connection: { effectiveType: '4g', saveData: true },
      },
    });

    expect(selectRegionRenderProfile()).toBe('mobile');
  });

  it('returns mobile on slow networks or low-memory devices', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        deviceMemory: 4,
        connection: { effectiveType: '3g', saveData: false },
      },
    });

    expect(selectRegionRenderProfile()).toBe('mobile');
  });
});
