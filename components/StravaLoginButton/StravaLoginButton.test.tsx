import { fireEvent, render, screen } from '@/test-utils';
import { StravaLoginButton } from './StravaLoginButton';

// Mock the OAuth modules
jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn(),
}));

jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));

import { getAuthorizationUrl } from '@/lib/strava/oauth/getAuthUrl';
import { openOAuthPopup } from '@/lib/strava/oauth/popup';

describe('StravaLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button with accessible label', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    expect(screen.getByRole('button', { name: /connect with strava/i })).toBeInTheDocument();
  });

  it('renders the Strava image inside the button', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toBeInTheDocument();
  });

  it('uses 1x image by default', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('uses 2x image when size="2x"', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} size="2x" />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange_x2.svg')
    );
  });

  it('uses 2x image when size="custom" and height > 72', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={80} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange_x2.svg')
    );
  });

  it('uses 1x image when size="custom" and height <= 72', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={60} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('uses 1x image when size="custom" but no height is provided', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('https://www.strava.com/oauth/authorize');
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('opens an OAuth popup when clicked and authUrl is configured', () => {
    const mockAuthUrl = 'https://www.strava.com/oauth/authorize?client_id=123';
    (getAuthorizationUrl as jest.Mock).mockReturnValue(mockAuthUrl);

    const onAuthCode = jest.fn();
    render(<StravaLoginButton onAuthCode={onAuthCode} />);

    fireEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(openOAuthPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        authUrl: mockAuthUrl,
        windowName: 'StravaLogin',
        onCode: onAuthCode,
      })
    );
  });

  it('does not open popup when authUrl is empty (not configured)', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('');

    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(openOAuthPopup).not.toHaveBeenCalled();
  });

  it('does not crash when getAuthorizationUrl returns null-like value', () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue(null);

    expect(() => {
      render(<StravaLoginButton onAuthCode={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /connect with strava/i }));
    }).not.toThrow();

    expect(openOAuthPopup).not.toHaveBeenCalled();
  });
});
