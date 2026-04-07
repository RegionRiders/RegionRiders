import { render, screen } from '@/test-utils';
import TripDateFormatter from './TripDateFormatter';

describe('TripDateFormatter', () => {
  it('renders start and end dates', () => {
    const startDate = new Date(2024, 4, 10, 9, 0); // 2024-05-10 09:00
    const endDate = new Date(2024, 4, 15, 18, 30); // 2024-05-15 18:30

    render(<TripDateFormatter startDate={startDate} endDate={endDate} />);

    expect(screen.getByText(/2024-05-10/)).toBeInTheDocument();
    expect(screen.getByText(/2024-05-15/)).toBeInTheDocument();
  });

  it('renders with the start flag emoji', () => {
    const startDate = new Date(2024, 0, 1, 8, 0);
    const endDate = new Date(2024, 0, 5, 17, 0);

    render(<TripDateFormatter startDate={startDate} endDate={endDate} />);

    expect(screen.getByText(/🚥/)).toBeInTheDocument();
    expect(screen.getByText(/🏁/)).toBeInTheDocument();
  });

  it('renders without errors', () => {
    const startDate = new Date(2023, 5, 1);
    const endDate = new Date(2023, 5, 10);
    expect(() => render(<TripDateFormatter startDate={startDate} endDate={endDate} />)).not.toThrow();
  });

  it('formats start and end times correctly', () => {
    const startDate = new Date(2024, 0, 1, 7, 5); // 07:05
    const endDate = new Date(2024, 0, 3, 23, 59); // 23:59

    render(<TripDateFormatter startDate={startDate} endDate={endDate} />);

    expect(screen.getByText(/07:05/)).toBeInTheDocument();
    expect(screen.getByText(/23:59/)).toBeInTheDocument();
  });
});
