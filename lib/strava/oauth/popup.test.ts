import { openOAuthPopup } from './popup';

const buildPopupMock = (overrides: Partial<Window> = {}) => ({
  closed: false,
  location: { href: 'https://provider.example/auth' } as Location,
  close: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('openOAuthPopup', () => {
  it('opens a popup window with the correct URL', () => {
    const popupMock = buildPopupMock();
    jest.spyOn(window, 'open').mockReturnValue(popupMock as unknown as Window);

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      onCode: jest.fn(),
    });

    expect(window.open).toHaveBeenCalledWith(
      'https://provider.example/auth',
      'TestLogin',
      expect.stringContaining('width=')
    );
  });

  it('does nothing when window.open returns null (popup blocked)', () => {
    jest.spyOn(window, 'open').mockReturnValue(null);
    const onCode = jest.fn();

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      onCode,
    });

    jest.runAllTimers();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('extracts code from redirect URL and calls onCode', () => {
    const popupMock = buildPopupMock();
    jest.spyOn(window, 'open').mockReturnValue(popupMock as unknown as Window);
    const onCode = jest.fn();

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      onCode,
    });

    // Simulate redirect back with a code
    popupMock.location = { href: 'http://localhost:3000/callback?code=abc123' } as Location;

    jest.advanceTimersByTime(600);
    expect(onCode).toHaveBeenCalledWith('abc123');
    expect(popupMock.close).toHaveBeenCalled();
  });

  it('calls onClose when popup is closed before receiving a code', () => {
    const popupMock = buildPopupMock();
    jest.spyOn(window, 'open').mockReturnValue(popupMock as unknown as Window);
    const onClose = jest.fn();
    const onCode = jest.fn();

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      onCode,
      onClose,
    });

    // User closes the popup
    popupMock.closed = true;

    jest.advanceTimersByTime(600);
    expect(onClose).toHaveBeenCalled();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('ignores cross-origin errors during polling', () => {
    const popupMock: any = {
      closed: false,
      get location(): Location {
        throw new DOMException('cross-origin');
      },
      close: jest.fn(),
    };
    jest.spyOn(window, 'open').mockReturnValue(popupMock as unknown as Window);
    const onCode = jest.fn();

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      onCode,
    });

    // Should not throw even though location access throws
    expect(() => jest.advanceTimersByTime(600)).not.toThrow();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('uses custom width and height when provided', () => {
    const popupMock = buildPopupMock();
    jest.spyOn(window, 'open').mockReturnValue(popupMock as unknown as Window);

    openOAuthPopup({
      authUrl: 'https://provider.example/auth',
      windowName: 'TestLogin',
      width: 800,
      height: 600,
      onCode: jest.fn(),
    });

    const openCall = (window.open as jest.Mock).mock.calls[0];
    expect(openCall[2]).toContain('width=800');
    expect(openCall[2]).toContain('height=600');
  });
});
