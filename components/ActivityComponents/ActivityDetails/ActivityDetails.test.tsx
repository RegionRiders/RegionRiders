import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Activity } from '@/types/activity';
import ActivityDetails from './ActivityDetails';

const mockActivity: Activity = {
  id: 'act-1',
  activityType: 'run',
  title: 'Afternoon Run',
  desc: 'Easy afternoon run',
  startDate: new Date(2024, 3, 10, 15, 0),
  endDate: '2024-04-10 16:00',
  distance: '10 km',
  time: '00:55:00',
  average: '10.9 km/h',
};

describe('ActivityDetails', () => {
  it('renders the selected activity title', () => {
    render(<ActivityDetails selectedActivity={mockActivity} handleActivityChange={jest.fn()} />);
    expect(screen.getAllByText('Afternoon Run').length).toBeGreaterThan(0);
  });

  it('renders the activity type alongside the title', () => {
    render(<ActivityDetails selectedActivity={mockActivity} handleActivityChange={jest.fn()} />);
    const { container } = render(
      <ActivityDetails selectedActivity={mockActivity} handleActivityChange={jest.fn()} />
    );
    expect(container).toBeInTheDocument();
  });

  it('calls handleActivityChange(null) when the close button is clicked', async () => {
    const handleActivityChange = jest.fn();
    render(
      <ActivityDetails
        selectedActivity={mockActivity}
        handleActivityChange={handleActivityChange}
      />
    );
    const closeButton = screen.getByRole('button');
    await userEvent.click(closeButton);
    expect(handleActivityChange).toHaveBeenCalledWith(null);
  });

  it('renders without errors when selectedActivity is null', () => {
    expect(() =>
      render(<ActivityDetails selectedActivity={null} handleActivityChange={jest.fn()} />)
    ).not.toThrow();
  });

  it('renders without errors when selectedActivity is provided', () => {
    expect(() =>
      render(<ActivityDetails selectedActivity={mockActivity} handleActivityChange={jest.fn()} />)
    ).not.toThrow();
  });
});
