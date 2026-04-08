import { render, screen } from '@/test-utils';
import { User } from '@/types/user';
import { Navbar } from './Navbar';

// Mock heavy child components to isolate Navbar logic
jest.mock('@/components/ActivityComponents/ActivitiesListElement/ActivitiesListElement', () => ({
  ActivitiesListElement: () => (
    <div data-testid="activities-list-element">ActivitiesListElement</div>
  ),
}));

jest.mock('@/components/TripComponents/TripsListElement/TripsListElement', () => ({
  TripsListElement: () => <div data-testid="trips-list-element">TripsListElement</div>,
}));

jest.mock('@/components/Welcome/Welcome', () => ({
  Welcome: () => <div data-testid="welcome">Welcome</div>,
}));

jest.mock('@/components/StravaLoginButton/StravaLoginButton', () => ({
  StravaLoginButton: ({ onAuthCode }: { onAuthCode: (code: string) => void }) => (
    <button data-testid="strava-login-btn" onClick={() => onAuthCode('code')}>
      Connect with Strava
    </button>
  ),
}));

jest.mock('@/components/Navbar/UserMenu', () => ({
  UserMenu: ({ user }: { user: User }) => <div data-testid="user-menu">{user.firstname}</div>,
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  firstname: 'Alice',
  lastname: 'Wonderland',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('Navbar – unauthenticated (no user)', () => {
  it('renders the StravaLoginButton when no user is provided', () => {
    render(<Navbar />);
    expect(screen.getByTestId('strava-login-btn')).toBeInTheDocument();
  });

  it('renders the Welcome tab content by default', () => {
    render(<Navbar />);
    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('does not render Map, Activities or Trips tabs in the header', () => {
    render(<Navbar />);
    // These tabs are hidden via display: none when no user is present
    expect(screen.queryByRole('tab', { name: /map/i })).not.toBeInTheDocument();
  });
});

describe('Navbar – authenticated (with user)', () => {
  it('renders the UserMenu when a user is provided', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders Map, Activities and Trips tabs', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /activities/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /trips/i })).toBeInTheDocument();
  });

  it('defaults to the map tab when user is present', () => {
    render(<Navbar user={mockUser} />);
    // The map tab should be selected
    const mapTab = screen.getByRole('tab', { name: /map/i });
    expect(mapTab).toBeInTheDocument();
    expect(mapTab).toHaveAttribute('aria-selected', 'true');
  });

  it('uses the provided defaultTab', () => {
    render(<Navbar user={mockUser} defaultTab="activities" />);
    const activitiesTab = screen.getByRole('tab', { name: /activities/i });
    expect(activitiesTab).toHaveAttribute('aria-selected', 'true');
  });
});
