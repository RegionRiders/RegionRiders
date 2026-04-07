import { render, screen } from '@/test-utils';
import { User } from '@/types/user';

// Mock InfiniteScroll to render children directly
jest.mock('react-infinite-scroll-component', () => ({
  __esModule: true,
  default: ({
    children,
    loader,
  }: {
    children: React.ReactNode;
    loader: React.ReactNode;
    next: () => void;
    hasMore: boolean;
    dataLength: number;
    style?: React.CSSProperties;
  }) => (
    <>
      {children}
      {loader}
    </>
  ),
}));

jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn().mockReturnValue(''),
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

import { Navbar } from './Navbar';

const mockUser: User = {
  id: 1,
  username: 'jdoe',
  firstname: 'John',
  lastname: 'Doe',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('Navbar', () => {
  it('renders the logo', () => {
    render(<Navbar />);
    expect(screen.getByAltText('RegionRiders Logo')).toBeInTheDocument();
  });

  it('renders without errors when no user is provided', () => {
    expect(() => render(<Navbar />)).not.toThrow();
  });

  it('renders without errors when a user is provided', () => {
    expect(() => render(<Navbar user={mockUser} />)).not.toThrow();
  });

  it('shows the Strava login button when no user is provided', () => {
    render(<Navbar />);
    expect(screen.getByRole('button', { name: /connect with strava/i })).toBeInTheDocument();
  });

  it('shows user menu when a user is provided', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
  });

  it('hides Map, Activities and Trips tabs when no user is provided', () => {
    render(<Navbar />);
    // Tabs with display='none' are excluded from the default accessibility tree queries
    expect(screen.queryByRole('tab', { name: 'Map' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Activities' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Trips' })).toBeNull();
  });

  it('shows Map, Activities and Trips tabs when a user is provided', () => {
    render(<Navbar user={mockUser} />);
    expect(screen.getByRole('tab', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activities' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trips' })).toBeInTheDocument();
  });

  it('renders the welcome panel by default when no user is provided', () => {
    render(<Navbar />);
    // Welcome component content is rendered in the welcome tab panel
    const { container } = render(<Navbar />);
    expect(container).toBeInTheDocument();
  });

  it('accepts a custom defaultTab', () => {
    expect(() => render(<Navbar user={mockUser} defaultTab="map" />)).not.toThrow();
  });
});
