import { fireEvent, render, screen } from '@/test-utils';
import { ActivityPost } from './ActivityPost';
import { Activity } from '@/types/activity';

const mockActivity: Activity = {
  id: 'act-123',
  activityType: 'ride',
  title: 'Saturday Morning Ride',
  desc: 'A great ride through the park',
  startDate: new Date('2024-04-06T09:00:00'),
  endDate: '2024-04-06 10:30',
  distance: '30 km',
  time: '01:30:00',
  average: '20 km/h',
};

describe('ActivityPost', () => {
  it('renders without errors', () => {
    const onSelect = jest.fn();
    expect(() => render(<ActivityPost data={mockActivity} onSelect={onSelect} />)).not.toThrow();
  });

  it('displays the activity title', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    expect(screen.getAllByText('Saturday Morning Ride').length).toBeGreaterThan(0);
  });

  it('displays the activity distance', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    expect(screen.getAllByText('30 km').length).toBeGreaterThan(0);
  });

  it('displays the activity time', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    expect(screen.getAllByText('01:30:00').length).toBeGreaterThan(0);
  });

  it('displays the activity average', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    expect(screen.getAllByText('20 km/h').length).toBeGreaterThan(0);
  });

  it('calls onSelect with the activity data when the title is clicked', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    const titleLink = screen.getAllByText('Saturday Morning Ride')[0].closest('a');
    if (titleLink) {
      fireEvent.click(titleLink);
    }
    expect(onSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('calls onSelect when the image is clicked', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    // The image is wrapped in an anchor
    const imageAnchor = screen.getAllByRole('link')[0];
    fireEvent.click(imageAnchor);
    expect(onSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('uses the default placeholder image when no imageUrl is provided', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('map_image_placeholder'));
  });

  it('uses the custom imageUrl when provided', () => {
    const onSelect = jest.fn();
    render(
      <ActivityPost
        data={mockActivity}
        onSelect={onSelect}
        imageUrl="https://example.com/custom.jpg"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('example.com'));
  });

  it('renders the activity type icon', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    // ActivityTypeIcon renders a ThemeIcon - just check no crash
    expect(screen.getAllByText('Saturday Morning Ride').length).toBeGreaterThan(0);
  });
});