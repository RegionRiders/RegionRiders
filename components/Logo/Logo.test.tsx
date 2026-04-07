import { render, screen } from '@/test-utils';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders an image with the RegionRiders alt text', () => {
    render(<Logo />);
    expect(screen.getByAltText('RegionRiders Logo')).toBeInTheDocument();
  });

  it('renders a link with default href "/"', () => {
    render(<Logo />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('uses a custom href when provided', () => {
    render(<Logo href="/home" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/home');
  });

  it('uses a custom src when provided', () => {
    render(<Logo src="/my-logo.png" />);
    const img = screen.getByAltText('RegionRiders Logo');
    expect(img).toHaveAttribute('src', '/my-logo.png');
  });

  it('renders without errors with default props', () => {
    expect(() => render(<Logo />)).not.toThrow();
  });

  it('renders without errors when custom width is provided', () => {
    expect(() => render(<Logo width={80} />)).not.toThrow();
  });

  it('renders without errors when custom height is provided', () => {
    expect(() => render(<Logo height={40} />)).not.toThrow();
  });

  it('renders without errors when both width and height are provided', () => {
    expect(() => render(<Logo width={100} height={100} />)).not.toThrow();
  });
});
