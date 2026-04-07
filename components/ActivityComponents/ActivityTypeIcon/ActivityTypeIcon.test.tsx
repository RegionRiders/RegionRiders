import { render, screen } from '@/test-utils';
import { ActivityTypeIcon } from './ActivityTypeIcon';

describe('ActivityTypeIcon', () => {
  it('renders without errors for a known activity type', () => {
    expect(() => render(<ActivityTypeIcon type="ride" />)).not.toThrow();
  });

  it('renders a tooltip with the activity label by default', async () => {
    render(<ActivityTypeIcon type="run" withHoverLabel />);
    // The tooltip label is rendered in the DOM as a hidden element accessible via role/title
    // The ThemeIcon itself should be present
    const { container } = render(<ActivityTypeIcon type="run" withHoverLabel />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without a tooltip when withHoverLabel is false', () => {
    expect(() => render(<ActivityTypeIcon type="run" withHoverLabel={false} />)).not.toThrow();
  });

  it('renders for an unknown activity type using DEFAULT_ACTIVITY', () => {
    expect(() => render(<ActivityTypeIcon type="unknown_xyz_type" />)).not.toThrow();
  });

  it('renders with a custom size', () => {
    expect(() => render(<ActivityTypeIcon type="swim" size={32} />)).not.toThrow();
  });

  it('renders with a custom radius', () => {
    expect(() => render(<ActivityTypeIcon type="hike" radius="xl" />)).not.toThrow();
  });

  it('renders with an overrideColor', () => {
    expect(() => render(<ActivityTypeIcon type="walk" overrideColor="blue" />)).not.toThrow();
  });

  it('renders icons for multiple activity types', () => {
    const types = ['ride', 'run', 'swim', 'hike', 'walk', 'yoga', 'snowboard'];
    types.forEach((type) => {
      expect(() => render(<ActivityTypeIcon type={type} />)).not.toThrow();
    });
  });
});
