import { render } from '@/test-utils';
import TripDateFormatter from './TripDateFormatter';

describe('TripDateFormatter', () => {
  it('renders without errors', () => {
    const start = new Date('2024-03-15T10:30:00');
    const end = new Date('2024-03-20T18:45:00');
    expect(() => render(<TripDateFormatter startDate={start} endDate={end} />)).not.toThrow();
  });

  it('renders start and end date indicators', () => {
    const start = new Date('2024-01-01T08:00:00');
    const end = new Date('2024-01-05T20:00:00');
    const { container } = render(<TripDateFormatter startDate={start} endDate={end} />);
    expect(container).toBeInTheDocument();
    // Both date labels should be present
    expect(container.textContent).toContain('Start date:');
    expect(container.textContent).toContain('End date:');
  });

  it('includes the year in the start date display', () => {
    const start = new Date('2023-06-15T09:00:00');
    const end = new Date('2023-06-20T17:00:00');
    const { container } = render(<TripDateFormatter startDate={start} endDate={end} />);
    expect(container.textContent).toContain('2023');
  });

  it('renders both dates with distinct content', () => {
    const start = new Date('2024-01-01T00:00:00');
    const end = new Date('2024-12-31T23:59:00');
    const { container } = render(<TripDateFormatter startDate={start} endDate={end} />);

    // Both years/months should appear
    expect(container.textContent).toContain('2024-01-01');
    expect(container.textContent).toContain('2024-12-31');
  });

  it('handles same start and end date', () => {
    const date = new Date('2024-05-10T12:00:00');
    expect(() => render(<TripDateFormatter startDate={date} endDate={date} />)).not.toThrow();
  });
});
