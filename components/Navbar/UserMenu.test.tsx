import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { User } from '@/types/user';
import { UserMenu } from './UserMenu';

const mockUser: User = {
  id: 99,
  username: 'jdoe',
  firstname: 'Jane',
  lastname: 'Doe',
  profileImage: 'https://example.com/avatar.jpg',
};

describe('UserMenu', () => {
  it('renders the user button', () => {
    render(<UserMenu user={mockUser} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows Settings and Log out options when the button is clicked', async () => {
    render(<UserMenu user={mockUser} />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('calls onSettingsClick when Settings is clicked', async () => {
    const onSettingsClick = jest.fn();
    render(<UserMenu user={mockUser} onSettingsClick={onSettingsClick} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Settings'));
    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('calls onLogoutClick when Log out is clicked', async () => {
    const onLogoutClick = jest.fn();
    render(<UserMenu user={mockUser} onLogoutClick={onLogoutClick} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Log out'));
    expect(onLogoutClick).toHaveBeenCalled();
  });

  it('renders without errors', () => {
    expect(() => render(<UserMenu user={mockUser} />)).not.toThrow();
  });

  it('renders without errors when callbacks are not provided', () => {
    expect(() => render(<UserMenu user={mockUser} />)).not.toThrow();
  });
});
