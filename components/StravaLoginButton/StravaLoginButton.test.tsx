import { getAuthorizationUrl } from '@/lib/strava/oauth/getAuthUrl';
import { openOAuthPopup } from '@/lib/strava/oauth/popup';
import { fireEvent, render, screen } from '@/test-utils';
import { StravaLoginButton } from './StravaLoginButton';

jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn(),
}));

jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));

const mockGetAuthorizationUrl = getAuthorizationUrl as jest.Mock;
const mockOpenOAuthPopup = openOAuthPopup as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('StravaLoginButton', () => {
  it('renders with default size (1x)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Connect with Strava/i })).toBeInTheDocument();
  });

  it('renders with 2x size', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="2x" />);
    expect(screen.getByRole('button', { name: /Connect with Strava/i })).toBeInTheDocument();
  });

  it('renders with custom size below 72px (uses 1x SVG)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={60} />);
    expect(screen.getByRole('button', { name: /Connect with Strava/i })).toBeInTheDocument();
  });

  it('renders with custom size above 72px (uses 2x SVG)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={90} />);
    expect(screen.getByRole('button', { name: /Connect with Strava/i })).toBeInTheDocument();
  });

  it('opens an OAuth popup when clicked and auth URL is available', () => {
    mockGetAuthorizationUrl.mockReturnValue('https://strava.com/oauth/authorize?client_id=1');

    const onAuthCode = jest.fn();
    render(<StravaLoginButton onAuthCode={onAuthCode} />);
    fireEvent.click(screen.getByRole('button', { name: /Connect with Strava/i }));

    expect(mockGetAuthorizationUrl).toHaveBeenCalled();
    expect(mockOpenOAuthPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        authUrl: 'https://strava.com/oauth/authorize?client_id=1',
        windowName: 'StravaLogin',
        onCode: onAuthCode,
      })
    );
  });

  it('logs an error and does not open a popup when auth URL is empty', () => {
    mockGetAuthorizationUrl.mockReturnValue('');

    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Connect with Strava/i }));

    expect(mockOpenOAuthPopup).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
