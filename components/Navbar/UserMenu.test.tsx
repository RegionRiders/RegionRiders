import { fireEvent, render, screen } from '@/test-utils';
import { User } from '@/types/user';
import { UserMenu } from './UserMenu';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  firstname: 'Alice',
  lastname: 'Wonderland',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('UserMenu', () => {
  it('renders the user button trigger', () => {
    render(<UserMenu user={mockUser} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows Settings and Log out items after opening the menu', async () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(await screen.findByText('Log out')).toBeInTheDocument();
  });

  it('calls onSettingsClick when Settings is clicked', async () => {
    const onSettingsClick = jest.fn();
    render(<UserMenu user={mockUser} onSettingsClick={onSettingsClick} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(await screen.findByText('Settings'));
    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('calls onLogoutClick when Log out is clicked', async () => {
    const onLogoutClick = jest.fn();
    render(<UserMenu user={mockUser} onLogoutClick={onLogoutClick} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(await screen.findByText('Log out'));
    expect(onLogoutClick).toHaveBeenCalled();
  });

  it('renders without optional callbacks (no crash)', () => {
    render(<UserMenu user={mockUser} />);
  });
});
