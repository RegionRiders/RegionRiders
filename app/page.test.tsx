import { render, screen } from '@/test-utils';
import Home from './page';

describe('app/page', () => {
  it('should render the Navbar with logo', () => {
    render(<Home />);

    expect(screen.getByAltText(/RegionRiders Logo/i)).toBeInTheDocument();
  });

  it('should render without errors', () => {
    expect(() => render(<Home />)).not.toThrow();
  });
});
