import { openOAuthPopup } from '@/lib/strava/oauth/popup';
import { fireEvent, render, screen } from '@/test-utils';
import { StravaLoginButton } from './StravaLoginButton';

jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));

describe('StravaLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button with accessible label', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    expect(screen.getByRole('button', { name: /connect with strava/i })).toBeInTheDocument();
  });

  it('renders the Strava image inside the button', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toBeInTheDocument();
  });

  it('uses 1x image by default', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('uses 2x image when size="2x"', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="2x" />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange_x2.svg')
    );
  });

  it('uses 2x image when size="custom" and height > 72', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={80} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange_x2.svg')
    );
  });

  it('uses 1x image when size="custom" and height <= 72', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" height={60} />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('uses 1x image when size="custom" but no height is provided', () => {
    render(<StravaLoginButton onAuthCode={jest.fn()} size="custom" />);
    const img = screen.getByAltText('Connect with Strava');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('btn_strava_connect_with_orange.svg')
    );
  });

  it('opens an OAuth popup to the server auth route when clicked', () => {
    const onAuthCode = jest.fn();
    render(<StravaLoginButton onAuthCode={onAuthCode} />);

    fireEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(openOAuthPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        authUrl: '/api/strava/auth',
        windowName: 'StravaLogin',
        onCode: onAuthCode,
      })
    );
  });

  it('always opens the popup regardless of environment configuration', () => {
    const onAuthCode = jest.fn();
    render(<StravaLoginButton onAuthCode={onAuthCode} />);

    fireEvent.click(screen.getByRole('button', { name: /connect with strava/i }));

    expect(openOAuthPopup).toHaveBeenCalledTimes(1);
  });
});
