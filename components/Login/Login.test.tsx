import { fireEvent, render, screen } from '@/test-utils';
import Login from './Login';

jest.mock('@/components/StravaLoginButton/StravaLoginButton', () => ({
  StravaLoginButton: ({ onAuthCode }: { onAuthCode: (code: string) => void }) => (
    <button type="button" data-testid="strava-login-btn" onClick={() => onAuthCode('test-code')}>
      Connect with Strava
    </button>
  ),
}));

describe('Login', () => {
  it('renders the welcome title', () => {
    render(<Login />);
    expect(screen.getByText(/Welcome Athlete/i)).toBeInTheDocument();
  });

  it('renders the Strava login button', () => {
    render(<Login />);
    expect(screen.getByTestId('strava-login-btn')).toBeInTheDocument();
  });

  it('renders the instructional text', () => {
    render(<Login />);
    expect(screen.getByText(/Log in to connect your Strava account/i)).toBeInTheDocument();
  });

  it('hides the modal when the close button is clicked', () => {
    render(<Login />);
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    expect(screen.queryByText(/Welcome Athlete/i)).not.toBeInTheDocument();
  });

  it('does not render the modal content once closed', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(screen.queryByText(/Log in to connect your Strava account/i)).not.toBeInTheDocument();
  });
});
