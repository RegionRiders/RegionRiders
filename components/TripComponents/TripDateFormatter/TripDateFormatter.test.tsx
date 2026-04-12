import { render, screen } from '@/test-utils';
import TripDateFormatter from './TripDateFormatter';

describe('TripDateFormatter', () => {
  it('renders both start and end dates', () => {
    const startDate = new Date(2024, 5, 1, 8, 30);
    const endDate = new Date(2024, 5, 5, 18, 0);

    render(<TripDateFormatter startDate={startDate} endDate={endDate} />);

    // Both dates should be visible in the component
    expect(screen.getByText(/2024-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/2024-06-05/)).toBeInTheDocument();
  });

  it('includes race flag and flag emojis', () => {
    const { container } = render(
      <TripDateFormatter startDate={new Date(2024, 0, 1)} endDate={new Date(2024, 0, 2)} />
    );
    expect(container.textContent).toContain('🚥');
    expect(container.textContent).toContain('🏁');
  });
});
