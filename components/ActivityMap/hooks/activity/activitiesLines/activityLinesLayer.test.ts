import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  mountActivityLinesLayer,
  simplifyCoordinatesRdp,
  tracksToGeoJson,
  updateActivityLinesPaint,
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
          { lat: 54.355, lon: 18.65501 }, // nearly collinear micro-jitter -> removed by RDP
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
  ]);

  it('simplifies dense nearly-collinear GPX points with RDP while preserving genuine corners', () => {
    const simplified = simplifyCoordinatesRdp([
      [18.65, 54.35],
      [18.655, 54.35501], // tiny jitter -> dropped
      [18.66, 54.36],
      [18.67, 54.35], // sharp turn -> preserved
    ]);

    expect(simplified).toEqual([
      [18.65, 54.35],
      [18.66, 54.36],
      [18.67, 54.35],
    ]);
  });

  it('converts GPX tracks to simplified GeoJSON LineStrings in [lon, lat] order', () => {
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

  it('mounts base + top-most hover layer, brings hovered line to top via setFilter, updates paint in-place, and cleans up', () => {
    const mockMap = createMockMapLibreInstance();

    const cleanup = mountActivityLinesLayer(mockMap as any, sampleTracks, {
      lineThickness: 2,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [255, 100, 100, 0.9],
      layerTransparency: 0.8,
    });

    expect(mockMap.addSource).toHaveBeenCalledWith(
      MAP_SOURCE_IDS.ACTIVITIES_LINES,
      expect.objectContaining({ type: 'geojson', maxzoom: 16 })
    );
    expect(mockMap.addLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: MAP_LAYER_IDS.ACTIVITIES_LINES,
        type: 'line',
      })
    );
    expect(mockMap.addLayer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
        type: 'line',
        source: MAP_SOURCE_IDS.ACTIVITIES_LINES,
        filter: ['==', ['get', 'trackId'], ''],
      })
    );

    // Simulate hover -> top-most hover layer filters to hovered trackId
    mockMap._emitLayer('mousemove', MAP_LAYER_IDS.ACTIVITIES_LINES, {
      features: [{ id: 1, properties: { trackId: 'ride-1', name: 'Morning <Ride>' } }],
    });
    expect(mockMap.setFilter).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER, [
      '==',
      ['get', 'trackId'],
      'ride-1',
    ]);

    // Simulate in-place paint update without re-tiling source
    updateActivityLinesPaint(mockMap as any, {
      lineThickness: 5,
      lineColor: [0, 255, 0, 0.6],
      lineHoverColor: [100, 255, 100, 1],
      layerTransparency: 0.5,
    });
    expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.ACTIVITIES_LINES,
      'line-width',
      9
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
      'line-width',
      18
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

    // Cleanup removes both hover and base layers, source, and popup
    cleanup();
    expect(mockPopupInstance.remove).toHaveBeenCalled();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER);
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_LINES);
    expect(mockMap.removeSource).toHaveBeenCalledWith(MAP_SOURCE_IDS.ACTIVITIES_LINES);
  });
});
