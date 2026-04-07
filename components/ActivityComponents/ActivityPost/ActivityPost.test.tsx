import { fireEvent, render, screen } from '@/test-utils';
import { Activity } from '@/types/activity';
import { ActivityPost } from './ActivityPost';

const mockActivity: Activity = {
  id: 'act-1',
  activityType: 'ride',
  title: 'Morning Ride',
  desc: 'A lovely morning ride through the park',
  startDate: new Date(2024, 5, 15, 7, 0),
  endDate: '2024-06-15 08:00',
  distance: '20 km',
  time: '01:00:00',
  average: '20 km/h',
};

describe('ActivityPost', () => {
  it('renders the activity title', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
  });

  it('renders distance, time, and average stats', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getAllByText('20 km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('01:00:00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20 km/h').length).toBeGreaterThan(0);
  });

  it('calls onSelect with the activity when the title anchor is clicked', () => {
    const onSelect = jest.fn();
    render(<ActivityPost data={mockActivity} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Morning Ride'));
    expect(onSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('renders the activity description', () => {
    render(<ActivityPost data={mockActivity} onSelect={jest.fn()} />);
    expect(screen.getByText(/lovely morning ride/i)).toBeInTheDocument();
  });
});
