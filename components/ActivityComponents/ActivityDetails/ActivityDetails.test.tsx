import { fireEvent, render, screen } from '@/test-utils';
import { Activity } from '@/types/activity';
import ActivityDetails from './ActivityDetails';

const mockActivity: Activity = {
  id: 'act-1',
  activityType: 'ride',
  title: 'Morning Ride',
  desc: 'A great ride',
  startDate: new Date('2024-06-15T07:00:00'),
  endDate: '2024-06-15 08:00',
  distance: '20 km',
  time: '01:00:00',
  average: '20 km/h',
};

describe('ActivityDetails', () => {
  it('renders the activity title when an activity is selected', () => {
    const handleActivityChange = jest.fn();
    render(
      <ActivityDetails
        selectedActivity={mockActivity}
        handleActivityChange={handleActivityChange}
      />
    );
    expect(screen.getAllByText('Morning Ride').length).toBeGreaterThan(0);
  });

  it('does not render the activity title when selectedActivity is null', () => {
    const handleActivityChange = jest.fn();
    const { container } = render(
      <ActivityDetails selectedActivity={null} handleActivityChange={handleActivityChange} />
    );
    // Title text should not appear
    expect(screen.queryByText('Morning Ride')).not.toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it('calls handleActivityChange(null) when close button is clicked', () => {
    const handleActivityChange = jest.fn();
    render(
      <ActivityDetails
        selectedActivity={mockActivity}
        handleActivityChange={handleActivityChange}
      />
    );
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(handleActivityChange).toHaveBeenCalledWith(null);
  });
});
