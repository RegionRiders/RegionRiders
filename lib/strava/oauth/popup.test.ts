import { openOAuthPopup } from './popup';

describe('openOAuthPopup', () => {
  let mockPopup: {
    closed: boolean;
    location: { href: string };
    close: jest.Mock;
  };
  let openMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    mockPopup = {
      closed: false,
      location: { href: 'https://www.strava.com/oauth/authorize' },
      close: jest.fn(),
    };

    openMock = jest.fn().mockReturnValue(mockPopup);
    Object.defineProperty(window, 'open', { value: openMock, writable: true });
    Object.defineProperty(window, 'screenLeft', { value: 0, writable: true });
    Object.defineProperty(window, 'screenTop', { value: 0, writable: true });
    Object.defineProperty(screen, 'availWidth', { value: 1920, writable: true });
    Object.defineProperty(screen, 'availHeight', { value: 1080, writable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('opens a popup window with the auth URL', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    expect(openMock).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/authorize',
      'StravaLogin',
      expect.stringContaining('width=600')
    );
  });

  it('uses custom width and height when provided', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://example.com/auth',
      windowName: 'TestWindow',
      width: 800,
      height: 600,
      onCode,
    });

    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/auth',
      'TestWindow',
      expect.stringContaining('width=800')
    );
    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/auth',
      'TestWindow',
      expect.stringContaining('height=600')
    );
  });

  it('calls onCode when a code parameter is detected in the popup URL', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    // Simulate redirect back with code
    mockPopup.location.href = 'http://localhost:3000/callback?code=abc123&state=xyz';

    jest.advanceTimersByTime(500);

    expect(onCode).toHaveBeenCalledWith('abc123');
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('closes the popup after receiving the code', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    mockPopup.location.href = 'http://localhost:3000/callback?code=testcode';

    jest.advanceTimersByTime(500);

    expect(mockPopup.close).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledWith('testcode');
  });

  it('stops polling after code is received (does not call onCode twice)', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    mockPopup.location.href = 'http://localhost:3000/callback?code=mycode';

    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);

    expect(onCode).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when popup is closed without a code', () => {
    const onCode = jest.fn();
    const onClose = jest.fn();

    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
      onClose,
    });

    // Simulate user closing the popup
    mockPopup.closed = true;

    jest.advanceTimersByTime(500);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCode).not.toHaveBeenCalled();
  });

  it('does not call onClose if it is not provided when popup closes', () => {
    const onCode = jest.fn();

    expect(() => {
      openOAuthPopup({
        authUrl: 'https://www.strava.com/oauth/authorize',
        windowName: 'StravaLogin',
        onCode,
      });
      mockPopup.closed = true;
      jest.advanceTimersByTime(500);
    }).not.toThrow();

    expect(onCode).not.toHaveBeenCalled();
  });

  it('does nothing when window.open returns null (popup blocked)', () => {
    openMock.mockReturnValue(null);
    const onCode = jest.fn();
    const onClose = jest.fn();

    expect(() => {
      openOAuthPopup({
        authUrl: 'https://www.strava.com/oauth/authorize',
        windowName: 'StravaLogin',
        onCode,
        onClose,
      });
    }).not.toThrow();

    jest.advanceTimersByTime(2000);

    expect(onCode).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores cross-origin errors during polling', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    // Simulate cross-origin error by making location.href throw
    Object.defineProperty(mockPopup, 'location', {
      get: () => {
        throw new DOMException('Cross-origin blocked');
      },
      configurable: true,
    });

    expect(() => jest.advanceTimersByTime(500)).not.toThrow();
    expect(onCode).not.toHaveBeenCalled();

    // Simulate redirect back with code after cross-origin phase
    Object.defineProperty(mockPopup, 'location', {
      get: () => ({ href: 'http://localhost:3000/callback?code=finalcode' }),
      configurable: true,
    });

    jest.advanceTimersByTime(500);
    expect(onCode).toHaveBeenCalledWith('finalcode');
  });

  it('does not call onCode when there is no code param in the URL', () => {
    const onCode = jest.fn();
    openOAuthPopup({
      authUrl: 'https://www.strava.com/oauth/authorize',
      windowName: 'StravaLogin',
      onCode,
    });

    // URL has no code param
    mockPopup.location.href = 'http://localhost:3000/callback?error=access_denied';

    jest.advanceTimersByTime(1000);

    expect(onCode).not.toHaveBeenCalled();
  });
});
