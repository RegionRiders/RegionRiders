import { render, screen } from '@/test-utils';
import { User } from '@/types/user';
import { UserButton } from './UserButton';

const mockUser: User = {
  id: 12345,
  username: 'jsmith',
  firstname: 'John',
  lastname: 'Smith',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('UserButton', () => {
  it('renders the user full name', () => {
    render(<UserButton user={mockUser} />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders an avatar', () => {
    render(<UserButton user={mockUser} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<UserButton user={mockUser} />)).not.toThrow();
  });

  it('renders without errors when showChevron is false', () => {
    expect(() => render(<UserButton user={mockUser} showChevron={false} />)).not.toThrow();
  });

  it('renders without errors when showChevron is true (default)', () => {
    expect(() => render(<UserButton user={mockUser} showChevron />)).not.toThrow();
  });

  it('renders a button element', () => {
    render(<UserButton user={mockUser} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
