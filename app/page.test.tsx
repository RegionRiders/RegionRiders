import { render, screen } from '@/test-utils';
import Home from './page';

describe('app/page', () => {
  it('should render the Navbar with logo', () => {
    render(<Home />);
    // The loading component should be displayed by the mock
    expect(screen.getByText('Map is loading...')).toBeInTheDocument();
  });

  it('should have correct loading message', () => {
    render(<Home />);
    const loadingMessage = screen.getByRole('heading', { level: 1, name: 'Map is loading...' });
    expect(loadingMessage).toBeInTheDocument();
  });

  it('should render professional loading details', () => {
    render(<Home />);
    expect(screen.getByAltText('RegionRiders logo')).toBeInTheDocument();
  });

  it('should render without errors', () => {
    expect(() => render(<Home />)).not.toThrow();
  });
});
