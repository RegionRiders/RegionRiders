import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from './layout';

// Mock Mantine Provider components
jest.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mantine-provider">{children}</div>
  ),
  ColorSchemeScript: () => <script data-testid="color-scheme-script" />,
  mantineHtmlProps: { 'data-mantine-html': true },
  createTheme: jest.fn(() => ({})),
}));

// Mock theme
jest.mock('@/theme', () => ({
  theme: {},
}));

describe('RootLayout', () => {
  it('should render children', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should wrap children with MantineProvider', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('mantine-provider')).toBeInTheDocument();
  });
});

describe('metadata', () => {
  it('should have correct title', () => {
    expect(metadata.title).toBe('RegionRiders');
  });

  it('should have description', () => {
    expect(metadata.description).toBe('Track and share your cycling adventures with RegionRiders.');
  });

  it('should have favicon configured', () => {
    expect(metadata.icons).toEqual({
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
    });
  });
});
