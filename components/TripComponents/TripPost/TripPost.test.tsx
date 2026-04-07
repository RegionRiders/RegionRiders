import { fireEvent, render, screen } from '@/test-utils';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';
import { TripPost } from './TripPost';

const makeActivity = (id: string, startDate: Date): Activity => ({
  id,
  activityType: 'ride',
  title: `Activity ${id}`,
  desc: 'Test description',
  startDate,
  endDate: startDate.toISOString(),
  distance: '10 km',
  time: '00:30:00',
  average: '20 km/h',
});

const activities: Activity[] = [
  makeActivity('a1', new Date('2024-06-01T08:00:00')),
  makeActivity('a2', new Date('2024-06-01T10:00:00')),
  makeActivity('a3', new Date('2024-06-02T08:00:00')),
];

const mockTrip: Trip = {
  id: 'trip-1',
  title: 'Summer Adventure',
  distance: '30 km',
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-02'),
  activities,
};

describe('TripPost', () => {
  it('renders the trip title', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getAllByText('Summer Adventure').length).toBeGreaterThan(0);
  });

  it('renders trip distance', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getByText('30 km')).toBeInTheDocument();
  });

  it('calls onSelect with the trip when the title is clicked', () => {
    const onSelect = jest.fn();
    render(<TripPost data={mockTrip} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByText('Summer Adventure')[0]);
    expect(onSelect).toHaveBeenCalledWith(mockTrip);
  });

  it('renders activity titles inside the card', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getByText('Activity a1')).toBeInTheDocument();
    expect(screen.getByText('Activity a2')).toBeInTheDocument();
  });

  it('renders a trip with many activities (>5) and shows collapse link', () => {
    const manyActivities: Activity[] = Array.from({ length: 8 }, (_, i) =>
      makeActivity(`m${i}`, new Date(`2024-06-0${(i % 3) + 1}T0${i}:00:00`))
    );
    const bigTrip: Trip = { ...mockTrip, activities: manyActivities };

    render(<TripPost data={bigTrip} onSelect={jest.fn()} />);
    expect(screen.getByText(/more activities/i)).toBeInTheDocument();
  });

  it('expands collapsed activities when the show-more link is clicked', async () => {
    const manyActivities: Activity[] = Array.from({ length: 8 }, (_, i) =>
      makeActivity(`m${i}`, new Date(`2024-06-0${(i % 3) + 1}T0${i}:00:00`))
    );
    const bigTrip: Trip = { ...mockTrip, activities: manyActivities };

    render(<TripPost data={bigTrip} onSelect={jest.fn()} />);
    const toggleLink = screen.getByText(/more activities/i);
    fireEvent.click(toggleLink);
    expect(await screen.findByText(/hide activities/i)).toBeInTheDocument();
  });
});
