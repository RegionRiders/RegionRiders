import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import MapContainer from './MapContainer';

describe('MapContainer', () => {
  it('should render a div element', () => {
    render(<MapContainer data-testid="map-container" />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should forward ref to the div element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<MapContainer ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should apply mapContainer className', () => {
    const { container } = render(<MapContainer />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('mapContainer');
  });

  it('should spread additional props to the div', () => {
    render(<MapContainer data-testid="test" id="map-id" aria-label="Map" />);
    const element = screen.getByTestId('test');
    expect(element.id).toBe('map-id');
    expect(element.getAttribute('aria-label')).toBe('Map');
  });

  it('should have displayName set to MapContainer', () => {
    expect(MapContainer.displayName).toBe('MapContainer');
  });
});
