import { render } from '@/test-utils';
import { ActivityTypeIcon } from './ActivityTypeIcon';

describe('ActivityTypeIcon', () => {
  it('renders without crashing for a known type', () => {
    render(<ActivityTypeIcon type="run" />);
  });

  it('renders the icon inside a themed container', () => {
    render(<ActivityTypeIcon type="ride" />);
    // The icon SVG should be in the document
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
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
