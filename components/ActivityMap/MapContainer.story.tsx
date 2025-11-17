/**
 * Storybook story for MapContainer component
 * Demonstrates the map container orchestration
 */

import MapContainer from './MapContainer';

export default {
  title: 'Components/MapContainer',
  component: MapContainer,
};

/**
 * Mock data for demonstration
 */
const mockTracks = new Map();

/**
 * Default MapContainer story
 * Note: This component requires a Leaflet map instance
 * In a real scenario, it coordinates rendering but doesn't display UI
 */
export const Default = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h2>MapContainer Component</h2>
      <p>
        This component is a side-effect coordinator and doesn&apos;t render visible UI. It manages
        the rendering of activities and regions on the map.
      </p>
      <MapContainer map={null} tracks={mockTracks} />
    </div>
  ),
};

/**
 * MapContainer with mock tracks
 */
export const WithTracks = {
  render: () => {
    const tracks = new Map([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Sample Track',
          points: [
            { lat: 50.0, lon: 14.0 },
            { lat: 50.1, lon: 14.1 },
          ],
          metadata: { distance: 5.0 },
        },
      ],
    ]);
    return (
      <div style={{ padding: '20px' }}>
        <h2>MapContainer with Sample Tracks</h2>
        <p>Tracks loaded: {tracks.size}</p>
        <MapContainer map={null} tracks={tracks} />
      </div>
    );
  },
};

/**
 * MapContainer configuration options
 */
export const ConfigurationOptions = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h2>MapContainer Configuration</h2>
      <ul>
        <li>
          <strong>showHeatmap:</strong> Controls whether to show activity heatmap (default: true)
        </li>
        <li>
          <strong>showBorders:</strong> Controls whether to show region borders (default: true)
        </li>
        <li>
          <strong>activityMode:</strong> Switch between &apos;heatmap&apos; and &apos;lines&apos;
          modes (default: &apos;heatmap&apos;)
        </li>
      </ul>
      <MapContainer map={null} tracks={mockTracks} showHeatmap showBorders />
    </div>
  ),
};
