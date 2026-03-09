/**
 * ColorSchemeToggle Tests
 * Tests for the color scheme toggle component
 */

import { render, screen, userEvent } from '@/test-utils';
import { useMantineColorScheme } from '@mantine/core';
import { ColorSchemeToggle } from './ColorSchemeToggle';

// Mock the Mantine color scheme hook
jest.mock('@mantine/core', () => {
  const actualMantine = jest.requireActual('@mantine/core');
  return {
    ...actualMantine,
    useMantineColorScheme: jest.fn(),
  };
});

const mockUseMantineColorScheme = useMantineColorScheme as jest.MockedFunction<
  typeof useMantineColorScheme
>;

describe('ColorSchemeToggle', () => {
  const mockSetColorScheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMantineColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: mockSetColorScheme,
      clearColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });
  });

  it('renders all three buttons', () => {
    render(<ColorSchemeToggle />);

    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
  });

  it('calls setColorScheme with "light" when Light button is clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSchemeToggle />);

    const lightButton = screen.getByRole('button', { name: /light/i });
    await user.click(lightButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('light');
  });

  it('calls setColorScheme with "dark" when Dark button is clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSchemeToggle />);

    const darkButton = screen.getByRole('button', { name: /dark/i });
    await user.click(darkButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });

  it('calls setColorScheme with "auto" when Auto button is clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSchemeToggle />);

    const autoButton = screen.getByRole('button', { name: /auto/i });
    await user.click(autoButton);

    expect(mockSetColorScheme).toHaveBeenCalledWith('auto');
  });
});
