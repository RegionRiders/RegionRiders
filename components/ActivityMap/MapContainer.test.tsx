/**
 * MapContainer Tests
 * Tests for the map container component
 */

import { createRef } from 'react';
import { render, screen } from '@/test-utils';
import MapContainer from './MapContainer';

describe('MapContainer', () => {
  it('renders a div element', () => {
    render(<MapContainer data-testid="map-container" />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('forwards ref to the div element', () => {
    const ref = createRef<HTMLDivElement>();

    render(<MapContainer ref={ref} data-testid="map-container" />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByTestId('map-container'));
  });

  it('applies mapContainer class', () => {
    render(<MapContainer data-testid="map-container" />);

    const container = screen.getByTestId('map-container');
    // Check that some className is applied (from CSS module)
    expect(container.className).toBeDefined();
    expect(container.className.length).toBeGreaterThan(0);
  });

  it('spreads additional props to the div', () => {
    render(
      <MapContainer data-testid="map-container" aria-label="Map Container" data-custom="test" />
    );

    const container = screen.getByTestId('map-container');
    expect(container).toHaveAttribute('aria-label', 'Map Container');
    expect(container).toHaveAttribute('data-custom', 'test');
  });

  it('has correct display name', () => {
    expect(MapContainer.displayName).toBe('MapContainer');
  });
});
