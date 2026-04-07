import { render, screen } from '@/test-utils';
import { PostsLoading } from './PostsLoading';

describe('PostsLoading', () => {
  it('renders without errors', () => {
    expect(() => render(<PostsLoading />)).not.toThrow();
  });

  it('renders a loader element', () => {
    const { container } = render(<PostsLoading />);
    // Mantine Loader renders an SVG or a span with a role
    expect(container.firstChild).toBeInTheDocument();
  });
});
