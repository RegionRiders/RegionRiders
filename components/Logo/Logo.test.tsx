import { render, screen } from '@/test-utils';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the logo image with alt text', () => {
    render(<Logo />);
    expect(screen.getByAltText('RegionRiders Logo')).toBeInTheDocument();
  });

  it('renders a link wrapping the logo', () => {
    render(<Logo />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('uses default href "/"', () => {
    render(<Logo />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('uses custom href when provided', () => {
    render(<Logo href="/about" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/about');
  });

  it('uses default src "/favicon.svg" when no src is provided', () => {
    render(<Logo />);
    const img = screen.getByAltText('RegionRiders Logo');
    expect(img).toHaveAttribute('src', expect.stringContaining('favicon.svg'));
  });

  it('uses custom src when provided', () => {
    render(<Logo src="/custom-logo.png" />);
    const img = screen.getByAltText('RegionRiders Logo');
    expect(img).toHaveAttribute('src', expect.stringContaining('custom-logo.png'));
  });

  it('renders without errors when no props are provided', () => {
    expect(() => render(<Logo />)).not.toThrow();
  });

  it('renders without errors when only width is provided', () => {
    expect(() => render(<Logo width={100} />)).not.toThrow();
  });

  it('renders without errors when only height is provided', () => {
    expect(() => render(<Logo height={80} />)).not.toThrow();
  });

  it('renders without errors when both width and height are provided', () => {
    expect(() => render(<Logo width={100} height={40} />)).not.toThrow();
  });
});
