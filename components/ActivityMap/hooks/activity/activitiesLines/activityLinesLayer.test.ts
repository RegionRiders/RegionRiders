import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  mountActivityLinesLayer,
  tracksToGeoJson,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/activityLinesLayer';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

const mockPopupInstance = {
  setLngLat: jest.fn().mockReturnThis(),
  setHTML: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
  remove: jest.fn(),
};

jest.mock('maplibre-gl', () => ({
  __esModule: true,
  Popup: jest.fn(() => mockPopupInstance),
}));

describe('activityLinesLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleTracks = new Map<string, GPXTrack>([
    [
      'ride-1',
      {
        id: 'ride-1',
        name: 'Morning <Ride>',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
  ]);

  it('converts GPX tracks to GeoJSON LineStrings in [lon, lat] order', () => {
    const geojson = tracksToGeoJson(sampleTracks);
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [
        [18.65, 54.35],
        [18.66, 54.36],
      ],
    });
  });

  it('mounts GeoJSON line layer, handles GPU hover feature-state, sanitized click popup, and cleanup', () => {
    const mockMap = createMockMapLibreInstance();

    const cleanup = mountActivityLinesLayer(mockMap as any, sampleTracks, {
      lineThickness: 2,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [255, 100, 100, 0.9],
      layerTransparency: 0.8,
    });

    expect(mockMap.addSource).toHaveBeenCalledWith(
      MAP_SOURCE_IDS.ACTIVITIES_LINES,
      expect.objectContaining({ type: 'geojson' })
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MAP_LAYER_IDS.ACTIVITIES_LINES,
        type: 'line',
      })
    );

    // Simulate hover
    mockMap._emitLayer('mousemove', MAP_LAYER_IDS.ACTIVITIES_LINES, {
      features: [{ id: 1, properties: { trackId: 'ride-1', name: 'Morning <Ride>' } }],
    });
    expect(mockMap.setFeatureState).toHaveBeenCalledWith(
      { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: 1 },
      { hover: true }
    );

    // Simulate click
    mockMap._emitLayer('click', MAP_LAYER_IDS.ACTIVITIES_LINES, {
      lngLat: { lng: 18.65, lat: 54.35 },
      features: [{ id: 1, properties: { trackId: 'ride-1', name: 'Morning <Ride>' } }],
    });
    expect(mockPopupInstance.setHTML).toHaveBeenCalledWith(
      expect.stringContaining('Morning &lt;Ride&gt;')
    );
    expect(mockPopupInstance.addTo).toHaveBeenCalledWith(mockMap);

    // Cleanup removes layer, source, popup, and listeners
    cleanup();
    expect(mockPopupInstance.remove).toHaveBeenCalled();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_LINES);
    expect(mockMap.removeSource).toHaveBeenCalledWith(MAP_SOURCE_IDS.ACTIVITIES_LINES);
  });
});
