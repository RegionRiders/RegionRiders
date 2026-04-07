import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';
import { TripPost } from './TripPost';

const mockActivities: Activity[] = [
  {
    id: 'a1',
    activityType: 'ride',
    title: 'Morning Ride',
    desc: '',
    startDate: new Date(2024, 4, 10, 8, 0),
    endDate: '2024-05-10 09:00',
    distance: '20 km',
    time: '00:45:00',
    average: '26 km/h',
  },
  {
    id: 'a2',
    activityType: 'run',
    title: 'Evening Run',
    desc: '',
    startDate: new Date(2024, 4, 11, 18, 0),
    endDate: '2024-05-11 19:00',
    distance: '5 km',
    time: '00:30:00',
    average: '10 km/h',
  },
  {
    id: 'a3',
    activityType: 'walk',
    title: 'Walk',
    desc: '',
    startDate: new Date(2024, 4, 12, 10, 0),
    endDate: '2024-05-12 11:00',
    distance: '3 km',
    time: '00:40:00',
    average: '4.5 km/h',
  },
];

const mockTrip: Trip = {
  id: 'trip-1',
  title: 'Weekend Trip',
  distance: '28 km',
  startDate: new Date(2024, 4, 10),
  endDate: new Date(2024, 4, 12),
  activities: mockActivities,
};

const mockTripManyActivities: Trip = {
  id: 'trip-2',
  title: 'Long Trip',
  distance: '100 km',
  startDate: new Date(2024, 4, 1),
  endDate: new Date(2024, 4, 10),
  activities: [
    ...mockActivities,
    {
      id: 'a4',
      activityType: 'hike',
      title: 'Hike 1',
      desc: '',
      startDate: new Date(2024, 4, 13, 9, 0),
      endDate: '2024-05-13 12:00',
      distance: '8 km',
      time: '02:00:00',
      average: '4 km/h',
    },
    {
      id: 'a5',
      activityType: 'swim',
      title: 'Swim',
      desc: '',
      startDate: new Date(2024, 4, 14, 7, 0),
      endDate: '2024-05-14 08:00',
      distance: '1 km',
      time: '00:30:00',
      average: '2 km/h',
    },
    {
      id: 'a6',
      activityType: 'yoga',
      title: 'Yoga Session',
      desc: '',
      startDate: new Date(2024, 4, 15, 6, 0),
      endDate: '2024-05-15 07:00',
      distance: '0 km',
      time: '01:00:00',
      average: '0 km/h',
    },
  ],
};

describe('TripPost', () => {
  it('renders the trip title', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getAllByText('Weekend Trip').length).toBeGreaterThan(0);
  });

  it('renders the trip distance', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getByText('28 km')).toBeInTheDocument();
  });

  it('calls onSelect when the title link is clicked', async () => {
    const onSelect = jest.fn();
    render(<TripPost data={mockTrip} onSelect={onSelect} />);
    const titleLinks = screen.getAllByText('Weekend Trip');
    await userEvent.click(titleLinks[0]);
    expect(onSelect).toHaveBeenCalledWith(mockTrip);
  });

  it('calls onSelect when the trip title is clicked', async () => {
    const onSelect = jest.fn();
    render(<TripPost data={mockTrip} onSelect={onSelect} />);
    // Trip title links call onSelect - get the first title text
    const titleAnchors = screen.getAllByText('Weekend Trip');
    await userEvent.click(titleAnchors[0]);
    expect(onSelect).toHaveBeenCalledWith(mockTrip);
  });

  it('renders activity titles', () => {
    render(<TripPost data={mockTrip} onSelect={jest.fn()} />);
    expect(screen.getByText('Morning Ride')).toBeInTheDocument();
  });

  it('shows "and N more activities" link when there are more than 5 activities', () => {
    render(<TripPost data={mockTripManyActivities} onSelect={jest.fn()} />);
    expect(screen.getByText(/more activities/)).toBeInTheDocument();
  });

  it('expands additional activities when "more activities" link is clicked', async () => {
    render(<TripPost data={mockTripManyActivities} onSelect={jest.fn()} />);
    const moreLink = screen.getByText(/more activities/);
    await userEvent.click(moreLink);
    expect(screen.getByText('Hide activities')).toBeInTheDocument();
  });

  it('renders without errors', () => {
    expect(() => render(<TripPost data={mockTrip} onSelect={jest.fn()} />)).not.toThrow();
  });
});
