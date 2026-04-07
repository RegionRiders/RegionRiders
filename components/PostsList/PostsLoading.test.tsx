import { render, screen } from '@/test-utils';
import { PostsLoading } from './PostsLoading';

describe('PostsLoading', () => {
  it('renders without crashing', () => {
    render(<PostsLoading />);
  });

  it('renders something visible in the DOM', () => {
    const { container } = render(<PostsLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});
