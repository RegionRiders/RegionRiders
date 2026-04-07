import { render, screen } from '@/test-utils';
import { PostsList } from './PostsList';
import { PostsLoading } from './PostsLoading';

describe('PostsList', () => {
  it('renders the provided content', () => {
    render(<PostsList Content={<div>Test content</div>} />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <PostsList
        Content={
          <>
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </>
        }
      />
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders without errors when content is null', () => {
    expect(() => render(<PostsList Content={null} />)).not.toThrow();
  });

  it('renders without errors when content is a string', () => {
    render(<PostsList Content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

describe('PostsLoading', () => {
  it('renders without errors', () => {
    expect(() => render(<PostsLoading />)).not.toThrow();
  });

  it('renders a loading indicator', () => {
    const { container } = render(<PostsLoading />);
    // Mantine Loader renders an svg or div for the spinner
    expect(container.firstChild).toBeInTheDocument();
  });
});
