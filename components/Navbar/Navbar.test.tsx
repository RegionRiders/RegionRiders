import { render, screen } from '@/test-utils';
import { User } from '@/types/user';
import { Navbar } from './Navbar';

// Mock all heavy child components to keep tests fast and focused
jest.mock('@/components/ActivityComponents/ActivitiesListElement/ActivitiesListElement', () => ({
  ActivitiesListElement: () => <div>ActivitiesListElement</div>,
}));

jest.mock('@/components/TripComponents/TripsListElement/TripsListElement', () => ({
  TripsListElement: () => <div>TripsListElement</div>,
}));

jest.mock('@/components/Welcome/Welcome', () => ({
  Welcome: () => <div>Welcome</div>,
}));

jest.mock('@/components/Logo/Logo', () => ({
  Logo: () => <img src="/favicon.svg" alt="RegionRiders Logo" />,
}));

jest.mock('@/components/StravaLoginButton/StravaLoginButton', () => ({
  StravaLoginButton: ({ onAuthCode }: { onAuthCode: (code: string) => void }) => (
    <button type="button" onClick={() => onAuthCode('code')}>
      Connect with Strava
    </button>
  ),
}));

jest.mock('./UserMenu', () => ({
  UserMenu: ({ user }: { user: User }) => (
    <div>
      UserMenu: {user.firstname} {user.lastname}
    </div>
  ),
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  firstname: 'Alice',
  lastname: 'Smith',
  profileImage: 'https://example.com/alice.jpg',
};

describe('Navbar', () => {
  it('renders without errors when no user is provided', () => {
    expect(() => render(<Navbar />)).not.toThrow();
  });

  it('renders without errors when a user is provided', () => {
    expect(() => render(<Navbar user={mockUser} />)).not.toThrow();
  });

  it('renders the Logo', () => {
    render(<Navbar />);
    expect(screen.getByAltText('RegionRiders Logo')).toBeInTheDocument();
  });

  it('shows the Strava login button when no user is logged in', () => {
    render(<Navbar />);
    expect(screen.getByText('Connect with Strava')).toBeInTheDocument();
  });

  it('does not show the Strava login button when a user is logged in', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.queryByText('Connect with Strava')).not.toBeInTheDocument();
  });

  it('shows the UserMenu when a user is logged in', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.getByText('UserMenu: Alice Smith')).toBeInTheDocument();
  });

  it('does not show UserMenu when no user is logged in', () => {
    render(<Navbar />);
    expect(screen.queryByText(/UserMenu:/)).not.toBeInTheDocument();
  });

  it('hides Map, Activities, and Trips tabs when no user is logged in', () => {
    render(<Navbar />);
    expect(screen.queryByText('Map')).not.toBeInTheDocument();
    expect(screen.queryByText('Activities')).not.toBeInTheDocument();
    expect(screen.queryByText('Trips')).not.toBeInTheDocument();
  });

  it('renders the Welcome panel content by default when no user', () => {
    render(<Navbar />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('accepts a custom defaultTab prop', () => {
    expect(() => render(<Navbar user={mockUser} defaultTab="map" />)).not.toThrow();
  });
});
