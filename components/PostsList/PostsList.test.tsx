import { render, screen } from '@/test-utils';
import { PostsList } from './PostsList';

describe('PostsList', () => {
  it('renders provided content', () => {
    render(<PostsList Content={<div data-testid="child">Hello</div>} />);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <PostsList
        Content={
          <>
            <span data-testid="item-1">Item 1</span>
            <span data-testid="item-2">Item 2</span>
          </>
        }
      />
    );
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
  });

  it('renders with null content without crashing', () => {
    render(<PostsList Content={null} />);
  });
});
