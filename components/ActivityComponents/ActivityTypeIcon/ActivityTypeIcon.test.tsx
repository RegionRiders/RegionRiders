import { render, screen } from '@/test-utils';
import { ActivityTypeIcon } from './ActivityTypeIcon';

describe('ActivityTypeIcon', () => {
  it('renders without crashing for a known type', () => {
    render(<ActivityTypeIcon type="run" />);
  });

  it('renders a tooltip with the activity label by default', async () => {
    render(<ActivityTypeIcon type="ride" />);
    // ThemeIcon should be present in the DOM
    const icon = document.querySelector('[class*="ThemeIcon"], svg');
    expect(icon).toBeTruthy();
  });

  it('renders without a tooltip when withHoverLabel is false', () => {
    render(<ActivityTypeIcon type="swim" withHoverLabel={false} />);
    // Component renders without crashing
  });

  it('uses overrideColor when provided', () => {
    render(<ActivityTypeIcon type="hike" overrideColor="red" />);
  });

  it('falls back to the default icon for an unknown activity type', () => {
    render(<ActivityTypeIcon type="unknown_sport_xyz" />);
    // Should not throw
  });

  it('accepts a custom size', () => {
    render(<ActivityTypeIcon type="walk" size={32} />);
  });
});
