/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { ColorSchemeToggle } from './ColorSchemeToggle';

// Mock useMantineColorScheme
const mockSetColorScheme = jest.fn();

jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  return {
    ...actual,
    useMantineColorScheme: () => ({
      colorScheme: 'light',
      setColorScheme: mockSetColorScheme,
    }),
  };
});

describe('ColorSchemeToggle', () => {
  beforeEach(() => {
    mockSetColorScheme.mockClear();
  });

  it('should render three buttons for light, dark, and auto', () => {
    render(<ColorSchemeToggle />);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('should call setColorScheme with "light" when Light button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Light'));
    expect(mockSetColorScheme).toHaveBeenCalledWith('light');
  });

  it('should call setColorScheme with "dark" when Dark button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Dark'));
    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });

  it('should call setColorScheme with "auto" when Auto button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Auto'));
    expect(mockSetColorScheme).toHaveBeenCalledWith('auto');
  });
});
