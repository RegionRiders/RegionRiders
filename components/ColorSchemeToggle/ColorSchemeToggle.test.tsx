import { fireEvent, render, screen } from '@/test-utils';
import { ColorSchemeToggle } from './ColorSchemeToggle';

const mockSetColorScheme = jest.fn();

jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  return {
    ...actual,
    useMantineColorScheme: () => ({
      setColorScheme: mockSetColorScheme,
      colorScheme: 'light',
    }),
  };
});

describe('ColorSchemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Light, Dark, and Auto buttons', () => {
    render(<ColorSchemeToggle />);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('calls setColorScheme with "light" when Light button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Light'));

    expect(mockSetColorScheme).toHaveBeenCalledWith('light');
  });

  it('calls setColorScheme with "dark" when Dark button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Dark'));

    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });

  it('calls setColorScheme with "auto" when Auto button is clicked', () => {
    render(<ColorSchemeToggle />);

    fireEvent.click(screen.getByText('Auto'));

    expect(mockSetColorScheme).toHaveBeenCalledWith('auto');
  });
});
