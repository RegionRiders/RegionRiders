import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';

jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn().mockReturnValue('https://strava.com/oauth/authorize?test=1'),
}));

jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

import Login from './Login';

describe('Login', () => {
  it('renders the welcome title', () => {
    render(<Login />);
    expect(screen.getByText('Welcome Athlete!')).toBeInTheDocument();
  });

  it('renders the login subtitle text', () => {
    render(<Login />);
    expect(screen.getByText(/log in to connect your strava account/i)).toBeInTheDocument();
  });

  it('renders the Strava login button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /connect with strava/i })).toBeInTheDocument();
  });

  it('renders a close button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });

  it('hides the modal when the close button is clicked', async () => {
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(screen.queryByText('Welcome Athlete!')).not.toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<Login />)).not.toThrow();
  });
});
