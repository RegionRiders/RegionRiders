import { openOAuthPopup } from './popup';

describe('openOAuthPopup', () => {
  let originalWindowOpen: typeof window.open;
  let mockPopup: {
    closed: boolean;
    close: jest.Mock;
    location: { href: string };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    originalWindowOpen = window.open;

    mockPopup = {
      closed: false,
      close: jest.fn(),
      location: { href: 'https://www.strava.com/oauth/authorize?...' },
    };

    window.open = jest.fn().mockReturnValue(mockPopup);

    Object.defineProperty(window, 'screenLeft', { value: 0, writable: true });
    Object.defineProperty(window, 'screenTop', { value: 0, writable: true });
    Object.defineProperty(screen, 'availWidth', { value: 1920, writable: true, configurable: true });
    Object.defineProperty(screen, 'availHeight', { value: 1080, writable: true, configurable: true });
  });

  afterEach(() => {
    window.open = originalWindowOpen;
    jest.useRealTimers();
  });

  it('opens a popup with the provided authUrl', () => {
    const onCode = jest.fn();
    openOAuthPopup({ authUrl: 'https://strava.com/auth', windowName: 'StravaLogin', onCode });

    expect(window.open).toHaveBeenCalledWith(
      'https://strava.com/auth',
      'StravaLogin',
      expect.stringContaining('width=600')
    );
  });

  it('calls onCode when a code query parameter is detected in the popup URL', () => {
    const onCode = jest.fn();
    openOAuthPopup({ authUrl: 'https://strava.com/auth', windowName: 'StravaLogin', onCode });

    // Simulate the popup redirecting back with a code
    mockPopup.location.href = 'http://localhost:3000/callback?code=abc123';
    jest.advanceTimersByTime(600);

    expect(onCode).toHaveBeenCalledWith('abc123');
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('calls onClose when the popup is closed before receiving a code', () => {
    const onCode = jest.fn();
    const onClose = jest.fn();
    openOAuthPopup({
      authUrl: 'https://strava.com/auth',
      windowName: 'StravaLogin',
      onCode,
      onClose,
    });

    mockPopup.closed = true;
    jest.advanceTimersByTime(600);

    expect(onClose).toHaveBeenCalled();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('does nothing when window.open returns null (popup blocked)', () => {
    window.open = jest.fn().mockReturnValue(null);
    const onCode = jest.fn();

    expect(() =>
      openOAuthPopup({ authUrl: 'https://strava.com/auth', windowName: 'Test', onCode })
    ).not.toThrow();

    jest.advanceTimersByTime(600);
    expect(onCode).not.toHaveBeenCalled();
  });

  it('ignores cross-origin errors during polling', () => {
    const onCode = jest.fn();
    openOAuthPopup({ authUrl: 'https://strava.com/auth', windowName: 'StravaLogin', onCode });

    // Simulate a cross-origin access error
    Object.defineProperty(mockPopup, 'location', {
      get() {
        throw new DOMException('Blocked a frame', 'SecurityError');
      },
      configurable: true,
    });

    expect(() => jest.advanceTimersByTime(600)).not.toThrow();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('uses custom width and height when provided', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://strava.com/auth',
      windowName: 'Test',
      width: 400,
      height: 600,
      onCode,
    });

    expect(window.open).toHaveBeenCalledWith(
      expect.any(String),
      'Test',
      expect.stringMatching(/width=400.*height=600|height=600.*width=400/)
    );
  });

  it('does not call onClose when popup closes after receiving a code', () => {
    const onCode = jest.fn();
    const onClose = jest.fn();
    openOAuthPopup({
      authUrl: 'https://strava.com/auth',
      windowName: 'StravaLogin',
      onCode,
      onClose,
    });

    mockPopup.location.href = 'http://localhost:3000/callback?code=xyz789';
    jest.advanceTimersByTime(600);

    expect(onCode).toHaveBeenCalledWith('xyz789');
    expect(onClose).not.toHaveBeenCalled();
  });
});
