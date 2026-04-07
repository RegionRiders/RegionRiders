import { render, screen } from '@/test-utils';
import Home from './page';

describe('app/page', () => {
  it('should render the Navbar', () => {
    render(<Home />);

    // Update this to whatever the Navbar actually renders, e.g. "RegionRiders"
    expect(screen.getByText('YOUR_NAV_TEXT')).toBeInTheDocument();
  });

  it('should render without errors', () => {
    expect(() => render(<Home />)).not.toThrow();
  });
});