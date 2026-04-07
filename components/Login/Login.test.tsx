import { fireEvent, render, screen } from '@/test-utils';
import Login from './Login';

// Mock StravaLoginButton to avoid deep dependency on OAuth and next/image
jest.mock('@/components/StravaLoginButton/StravaLoginButton', () => ({
  StravaLoginButton: ({ onAuthCode }: { onAuthCode: (code: string) => void }) => (
    <button type="button" onClick={() => onAuthCode('test-code')}>
      Connect with Strava
    </button>
  ),
}));

describe('Login', () => {
  it('renders the login modal by default', () => {
    render(<Login />);
    expect(screen.getByText('Welcome Athlete!')).toBeInTheDocument();
  });

  it('renders the descriptive text', () => {
    render(<Login />);
    expect(screen.getByText(/Log in to connect your Strava account/i)).toBeInTheDocument();
  });

  it('renders the Connect with Strava button', () => {
    render(<Login />);
    expect(screen.getByText('Connect with Strava')).toBeInTheDocument();
  });

  it('renders the close button', () => {
    render(<Login />);
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('hides the modal when the close button is clicked', () => {
    render(<Login />);
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    expect(screen.queryByText('Welcome Athlete!')).not.toBeInTheDocument();
  });

  it('does not render the modal content after closing', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(screen.queryByText(/Log in to connect your Strava account/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Connect with Strava')).not.toBeInTheDocument();
  });

  it('renders nothing after modal is closed', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    // After closing, no modal dialog should be present in the document
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome Athlete!')).not.toBeInTheDocument();
  });
});
