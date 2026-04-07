import { render, screen } from '@/test-utils';
import { ActivityTypeIcon } from './ActivityTypeIcon';

describe('ActivityTypeIcon', () => {
  it('renders without errors for a known activity type', () => {
    expect(() => render(<ActivityTypeIcon type="run" />)).not.toThrow();
  });

  it('renders without errors for an unknown activity type (falls back to default)', () => {
    expect(() => render(<ActivityTypeIcon type="unknown_type_xyz" />)).not.toThrow();
  });

  it('renders a tooltip with the activity label when withHoverLabel is true (default)', () => {
    render(<ActivityTypeIcon type="run" />);
    // Mantine Tooltip renders label as an accessible element
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toBeInTheDocument();
  });

  it('does not render a tooltip when withHoverLabel is false', () => {
    const { container } = render(<ActivityTypeIcon type="run" withHoverLabel={false} />);
    // When no tooltip, the ThemeIcon is rendered directly
    expect(container.firstChild).toBeInTheDocument();
    const tooltips = container.querySelectorAll('[role="tooltip"]');
    expect(tooltips).toHaveLength(0);
  });

  it('renders correct label for ride activity', () => {
    render(<ActivityTypeIcon type="ride" />);
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('Ride');
  });

  it('renders correct label for swim activity', () => {
    render(<ActivityTypeIcon type="swim" />);
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('Swim');
  });

  it('renders correct label for unknown activity type', () => {
    render(<ActivityTypeIcon type="some_unknown_type" />);
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('Unknown Activity Type');
  });

  it('applies custom size prop without errors', () => {
    expect(() => render(<ActivityTypeIcon type="walk" size={32} />)).not.toThrow();
  });

  it('applies overrideColor prop without errors', () => {
    expect(() => render(<ActivityTypeIcon type="hike" overrideColor="blue" />)).not.toThrow();
  });

  it('applies different radius values without errors', () => {
    const radii: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
    radii.forEach((radius) => {
      expect(() => render(<ActivityTypeIcon type="run" radius={radius} />)).not.toThrow();
    });
  });

  it('renders without tooltip when withHoverLabel is explicitly false', () => {
    const { container } = render(
      <ActivityTypeIcon type="ride" withHoverLabel={false} size={24} />
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});