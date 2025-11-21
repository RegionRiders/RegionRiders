import { render, screen } from '@/test-utils';
import Home from './page';

// Mock the dynamic import of ActivityMap
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (
    _loader: () => Promise<unknown>,
    options?: { ssr?: boolean; loading?: () => React.ReactElement }
  ) => {
    const Component = () => {
      if (options?.loading) {
        return options.loading();
      }
      return <div>Mocked ActivityMap</div>;
    };
    Component.displayName = 'DynamicActivityMap';
    return Component;
  },
}));

describe('app/page', () => {
  it('should render Home component', () => {
    render(<Home />);
    // The loading component should be displayed by the mock
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('should have correct loading message', () => {
    render(<Home />);
    const loadingMessage = screen.getByText('Loading map...');
    expect(loadingMessage).toBeInTheDocument();
    expect(loadingMessage.className).toContain('text-gray-400');
  });

  it('should render without errors', () => {
    expect(() => render(<Home />)).not.toThrow();
  });
});
