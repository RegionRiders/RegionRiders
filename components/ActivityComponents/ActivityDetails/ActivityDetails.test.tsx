import { fireEvent, render, screen } from '@/test-utils';
import ActivityDetails from './ActivityDetails';
import { Activity } from '@/types/activity';

const mockActivity: Activity = {
  id: 'test-1',
  activityType: 'ride',
  title: 'Morning Ride',
  desc: 'A nice morning ride',
  startDate: new Date('2024-03-15T07:00:00'),
  endDate: '2024-03-15 08:00',
  distance: '25 km',
  time: '01:00:00',
  average: '25 km/h',
};

describe('ActivityDetails', () => {
  it('renders without errors when no activity is selected', () => {
    const handleActivityChange = jest.fn();
    expect(() =>
      render(
        <ActivityDetails selectedActivity={null} handleActivityChange={handleActivityChange} />
      )
    ).not.toThrow();
  });

  it('renders without errors when an activity is selected', () => {
    const handleActivityChange = jest.fn();
    expect(() =>
      render(
        <ActivityDetails
          selectedActivity={mockActivity}
          handleActivityChange={handleActivityChange}
        />
      )
    ).not.toThrow();
  });

  it('displays the activity title when an activity is selected', () => {
    const handleActivityChange = jest.fn();
    render(
      <ActivityDetails
        selectedActivity={mockActivity}
        handleActivityChange={handleActivityChange}
      />
    );
    expect(screen.getAllByText('Morning Ride').length).toBeGreaterThan(0);
  });

  it('does not display a title when no activity is selected', () => {
    const handleActivityChange = jest.fn();
    render(<ActivityDetails selectedActivity={null} handleActivityChange={handleActivityChange} />);
    expect(screen.queryByText('Morning Ride')).not.toBeInTheDocument();
  });

  it('calls handleActivityChange with null when close button is clicked', () => {
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

  it('renders the activity type alongside the title', () => {
    const handleActivityChange = jest.fn();
    render(
      <ActivityDetails
        selectedActivity={mockActivity}
        handleActivityChange={handleActivityChange}
      />
    );
    // Both title and activityType should appear in the rendered output
    expect(screen.getAllByText('Morning Ride').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ride').length).toBeGreaterThan(0);
  });
});
