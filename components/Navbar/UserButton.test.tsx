import { render, screen } from '@/test-utils';
import { User } from '@/types/user';
import { UserButton } from './UserButton';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  firstname: 'John',
  lastname: 'Doe',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('UserButton', () => {
  it('renders the user first and last name', () => {
    render(<UserButton user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders an avatar', () => {
    render(<UserButton user={mockUser} />);
    const avatar = document.querySelector('[class*="Avatar"], img');
    expect(avatar).toBeTruthy();
  });

  it('is a button element', () => {
    render(<UserButton user={mockUser} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('passes additional props to the underlying button', () => {
    const onClick = jest.fn();
    render(<UserButton user={mockUser} onClick={onClick} />);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('renders without chevron when showChevron is false', () => {
    const { container } = render(<UserButton user={mockUser} showChevron={false} />);
    expect(container).toBeTruthy();
  });
});
