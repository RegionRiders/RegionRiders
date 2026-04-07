import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Activity } from '@/types/activity';
import { ActivityPost } from './ActivityPost';

const mockActivity: Activity = {
  id: 'act-1',
  activityType: 'ride',
  title: 'Morning Ride',
  desc: 'A nice morning ride',
  startDate: new Date(2024, 4, 15, 8, 30), // 2024-05-15 08:30
  endDate: '2024-05-15 09:30',
  distance: '25.3 km',
  time: '01:02:30',
  average: '24.5 km/h',
};

describe('ActivityPost', () => {
  it('renders the activity title', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getAllByText('Morning Ride').length).toBeGreaterThan(0);
  });

  it('renders distance, time and average stats', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getAllByText('25.3 km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('01:02:30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('24.5 km/h').length).toBeGreaterThan(0);
  });

  it('renders the activity description', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getByText('A nice morning ride')).toBeInTheDocument();
  });

  it('calls onSelect with activity data when the title link is clicked', async () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    const titleLinks = screen.getAllByText('Morning Ride');
    await userEvent.click(titleLinks[0]);
    expect(onSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('calls onSelect when the image anchor is clicked', async () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    const images = screen.getAllByRole('img');
    // Click the first image which is wrapped in an Anchor
    await userEvent.click(images[0]);
    expect(onSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('renders with a custom imageUrl', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} imageUrl="/custom.jpg" />);
    const images = screen.getAllByRole('img');
    const customImage = images.find((img) => img.getAttribute('src') === '/custom.jpg');
    expect(customImage).toBeDefined();
  });

  it('renders placeholder image when no imageUrl is provided', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    const images = screen.getAllByRole('img');
    const placeholder = images.find((img) =>
      img.getAttribute('src')?.includes('map_image_placeholder')
    );
    expect(placeholder).toBeDefined();
  });

  it('renders without errors', () => {
    expect(() => render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />)).not.toThrow();
  });
});
