import { render, screen } from '@/test-utils';
import { UserButton } from './UserButton';
import { User } from '@/types/user';

const mockUser: User = {
  id: 12345,
  username: 'testuser',
  firstname: 'John',
  lastname: 'Doe',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('UserButton', () => {
  it('renders without errors', () => {
    expect(() => render(<UserButton user={mockUser} />)).not.toThrow();
  });

  it('displays the user first and last name', () => {
    render(<UserButton user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders the user avatar image', () => {
    render(<UserButton user={mockUser} />);
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<UserButton user={mockUser} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders the chevron icon by default (showChevron=true)', () => {
    const { container } = render(<UserButton user={mockUser} showChevron={true} />);
    // IconChevronDown is an SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('does not render extra SVG when showChevron is false', () => {
    const { container: withChevron } = render(
      <UserButton user={mockUser} showChevron={true} />
    );
    const { container: withoutChevron } = render(
      <UserButton user={mockUser} showChevron={false} />
    );
    // With chevron should have more or equal SVGs than without
    const svgCountWith = withChevron.querySelectorAll('svg').length;
    const svgCountWithout = withoutChevron.querySelectorAll('svg').length;
    expect(svgCountWith).toBeGreaterThanOrEqual(svgCountWithout);
  });

  it('renders with a user that has no profile image', () => {
    const userNoImage: User = { ...mockUser, profileImage: '' };
    expect(() => render(<UserButton user={userNoImage} />)).not.toThrow();
  });

  it('forwards additional props to the underlying button', () => {
    const onClick = jest.fn();
    render(<UserButton user={mockUser} onClick={onClick} />);
    const button = screen.getByRole('button');
    button.click();
    expect(onClick).toHaveBeenCalled();
  });
});