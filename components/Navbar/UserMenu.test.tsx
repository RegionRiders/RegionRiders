import { fireEvent, render, screen } from '@/test-utils';
import { UserMenu } from './UserMenu';
import { User } from '@/types/user';

const mockUser: User = {
  id: 99999,
  username: 'janedoe',
  firstname: 'Jane',
  lastname: 'Doe',
  profileImage: 'https://example.com/jane.jpg',
};

describe('UserMenu', () => {
  it('renders without errors', () => {
    expect(() => render(<UserMenu user={mockUser} />)).not.toThrow();
  });

  it('displays the user button with name', () => {
    render(<UserMenu user={mockUser} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows Settings and Log out items when menu is opened', async () => {
    render(<UserMenu user={mockUser} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(await screen.findByText('Log out')).toBeInTheDocument();
  });

  it('calls onSettingsClick when Settings is clicked', async () => {
    const onSettingsClick = jest.fn();
    render(<UserMenu user={mockUser} onSettingsClick={onSettingsClick} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    const settingsItem = await screen.findByText('Settings');
    fireEvent.click(settingsItem);
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('calls onLogoutClick when Log out is clicked', async () => {
    const onLogoutClick = jest.fn();
    render(<UserMenu user={mockUser} onLogoutClick={onLogoutClick} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    const logoutItem = await screen.findByText('Log out');
    fireEvent.click(logoutItem);
    expect(onLogoutClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw when optional callbacks are not provided', async () => {
    render(<UserMenu user={mockUser} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    const settingsItem = await screen.findByText('Settings');
    expect(() => fireEvent.click(settingsItem)).not.toThrow();
  });

  it('renders without crashing when user has no profile image', () => {
    const userNoImage: User = { ...mockUser, profileImage: '' };
    expect(() => render(<UserMenu user={userNoImage} />)).not.toThrow();
  });
});