import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Trip } from '@/types/trip';
import TripDetails from './TripDetails';

const mockTrip: Trip = {
  id: 'trip-1',
  title: 'Summer Adventure',
  distance: '150 km',
  startDate: new Date(2024, 5, 1),
  endDate: new Date(2024, 5, 10),
  activities: [],
};

describe('TripDetails', () => {
  it('renders the selected trip title', () => {
    render(<TripDetails selectedTrip={mockTrip} handleTripChange={jest.fn()} />);
    expect(screen.getAllByText('Summer Adventure').length).toBeGreaterThan(0);
  });

  it('calls handleTripChange(null) when the close button is clicked', async () => {
    const handleTripChange = jest.fn();
    render(<TripDetails selectedTrip={mockTrip} handleTripChange={handleTripChange} />);
    const closeButton = screen.getByRole('button');
    await userEvent.click(closeButton);
    expect(handleTripChange).toHaveBeenCalledWith(null);
  });

  it('renders without errors when selectedTrip is null', () => {
    expect(() =>
      render(<TripDetails selectedTrip={null} handleTripChange={jest.fn()} />)
    ).not.toThrow();
  });

  it('renders without errors when selectedTrip is provided', () => {
    expect(() =>
      render(<TripDetails selectedTrip={mockTrip} handleTripChange={jest.fn()} />)
    ).not.toThrow();
  });

  it('renders a placeholder map image', () => {
    render(<TripDetails selectedTrip={mockTrip} handleTripChange={jest.fn()} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });
});
