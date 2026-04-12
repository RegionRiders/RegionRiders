import { fireEvent, render, screen } from '@/test-utils';
import { Trip } from '@/types/trip';
import TripDetails from './TripDetails';

const mockTrip: Trip = {
  id: 'trip-1',
  title: 'My Awesome Trip',
  distance: '100 km',
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-07'),
  activities: [],
};

describe('TripDetails', () => {
  it('renders the trip title when a trip is selected', () => {
    render(<TripDetails selectedTrip={mockTrip} handleTripChange={jest.fn()} />);
    expect(screen.getAllByText('My Awesome Trip').length).toBeGreaterThan(0);
  });

  it('does not render the trip title when selectedTrip is null', () => {
    render(<TripDetails selectedTrip={null} handleTripChange={jest.fn()} />);
    expect(screen.queryByText('My Awesome Trip')).not.toBeInTheDocument();
  });

  it('calls handleTripChange(null) when close button is clicked', () => {
    const handleTripChange = jest.fn();
    render(<TripDetails selectedTrip={mockTrip} handleTripChange={handleTripChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleTripChange).toHaveBeenCalledWith(null);
  });
});
