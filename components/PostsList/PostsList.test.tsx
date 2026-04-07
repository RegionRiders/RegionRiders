import { render, screen } from '@/test-utils';
import { PostsList } from './PostsList';

describe('PostsList', () => {
  it('renders provided content', () => {
    render(<PostsList Content={<div>Post item</div>} />);
    expect(screen.getByText('Post item')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <PostsList
        Content={
          <>
            <div>First</div>
            <div>Second</div>
            <div>Third</div>
          </>
        }
      />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('renders without errors when Content is empty', () => {
    expect(() => render(<PostsList Content={null} />)).not.toThrow();
  });

  it('renders without errors when Content is a string', () => {
    render(<PostsList Content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
