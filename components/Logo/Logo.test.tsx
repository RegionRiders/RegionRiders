import { render, screen } from '@/test-utils';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders an image with the RegionRiders alt text', () => {
    render(<Logo />);
    expect(screen.getByAltText('RegionRiders Logo')).toBeInTheDocument();
  });

  it('renders a link to / by default', () => {
    render(<Logo />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });

  it('renders a link to a custom href', () => {
    render(<Logo href="/about" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/about');
  });

  it('uses a custom src', () => {
    render(<Logo src="/custom-logo.svg" />);
    const img = screen.getByAltText('RegionRiders Logo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/custom-logo.svg');
  });
});
