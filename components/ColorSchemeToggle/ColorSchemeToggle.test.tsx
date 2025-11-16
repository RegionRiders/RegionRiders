import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { useMantineColorScheme } from '@mantine/core';
import { ColorSchemeToggle } from './ColorSchemeToggle';

// Mock the Mantine hook
jest.mock('@mantine/core', () => ({
  ...jest.requireActual('@mantine/core'),
  useMantineColorScheme: jest.fn(),
}));

describe('ColorSchemeToggle', () => {
  const mockSetColorScheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useMantineColorScheme as jest.Mock).mockReturnValue({
      setColorScheme: mockSetColorScheme,
    });
  });

  it('should render all three color scheme buttons', () => {
    render(<ColorSchemeToggle />);

    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
  });

  it('should call setColorScheme with "light" when Light button is clicked', async () => {
    render(<ColorSchemeToggle />);
    const user = userEvent.setup();
    const lightButton = screen.getByRole('button', { name: /light/i });

    await user.click(lightButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('light');
    expect(mockSetColorScheme).toHaveBeenCalledTimes(1);
  });

  it('should call setColorScheme with "dark" when Dark button is clicked', async () => {
    render(<ColorSchemeToggle />);
    const user = userEvent.setup();
    const darkButton = screen.getByRole('button', { name: /dark/i });

    await user.click(darkButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
    expect(mockSetColorScheme).toHaveBeenCalledTimes(1);
  });

  it('should call setColorScheme with "auto" when Auto button is clicked', async () => {
    render(<ColorSchemeToggle />);
    const user = userEvent.setup();
    const autoButton = screen.getByRole('button', { name: /auto/i });

    await user.click(autoButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('auto');
    expect(mockSetColorScheme).toHaveBeenCalledTimes(1);
  });

  it('should render buttons in a group', () => {
    render(<ColorSchemeToggle />);

    const group = screen.getByRole('button', { name: /light/i }).parentElement;
    expect(group).toBeTruthy();
  });
});
