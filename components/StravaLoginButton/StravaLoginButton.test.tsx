import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';

jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn().mockReturnValue('https://strava.com/oauth/authorize?test=1'),
}));

jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));

// next/image mock
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

import { StravaLoginButton } from './StravaLoginButton';
import { getAuthorizationUrl } from '@/lib/strava/oauth/getAuthUrl';
import { openOAuthPopup } from '@/lib/strava/oauth/popup';

describe('StravaLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthorizationUrl as jest.Mock).mockReturnValue(
      'https://strava.com/oauth/authorize?test=1'
    );
  });

  it('renders a button with aria-label "Connect with Strava"', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    expect(screen.getByRole('button', { name: /connect with strava/i })).toBeInTheDocument();
  });

  it('renders an image with alt "Connect with Strava"', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    expect(screen.getByAltText('Connect with Strava')).toBeInTheDocument();
  });

  it('renders with 1x size by default (48px height)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute('height', '48');
  });

  it('renders with 2x size (96px height)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="2x" />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute('height', '96');
  });

  it('renders with custom height below threshold (uses 1x SVG)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={60} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute('src', '/assets/btn_strava_connect_with_orange.svg');
    expect(img).toHaveAttribute('height', '60');
  });

  it('renders with custom height above threshold (uses 2x SVG)', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={80} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute('src', '/assets/btn_strava_connect_with_orange_x2.svg');
    expect(img).toHaveAttribute('height', '80');
  });

  it('calls getAuthorizationUrl and openOAuthPopup when button is clicked', async () => {
    const onAuthCode = jest.fn();
    render(<StravaLoginButton onAuthCode={onAuthCode} />);
    await userEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(getAuthorizationUrl).toHaveBeenCalled();
    expect(openOAuthPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        authUrl: 'https://strava.com/oauth/authorize?test=1',
        windowName: 'StravaLogin',
        onCode: onAuthCode,
      })
    );
  });

  it('logs an error and does not open popup when authUrl is empty', async () => {
    (getAuthorizationUrl as jest.Mock).mockReturnValue('');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(openOAuthPopup).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    consoleSpy.mockRestore();
  });
});
