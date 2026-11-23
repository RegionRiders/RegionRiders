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

  it('mounts shared-bucket base + top-most hover layers using feature-state replacement (never setFilter), updates paint in-place, and cleans up', () => {
    const mockMap = createMockMapLibreInstance();
    const rafQueue: FrameRequestCallback[] = [];
    const rafSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafQueue.push(cb);
        return rafQueue.length;
      });
    const cancelRafSpy = jest
      .spyOn(globalThis, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    try {
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

      // Base layer hides hovered line via feature-state opacity=0 so it is replaced cleanly
      expect(mockMap.addLayer).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: MAP_LAYER_IDS.ACTIVITIES_LINES,
          type: 'line',
          source: MAP_SOURCE_IDS.ACTIVITIES_LINES,
          paint: expect.objectContaining({
            'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0, 0.8],
          }),
        })
      );

      // Hover layer omits `filter` so MapLibre shares one LineBucket with base layer
      const hoverLayerSpec = mockMap.addLayer.mock.calls[1][0];
      expect(hoverLayerSpec).toEqual(
        expect.objectContaining({
          id: MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
          type: 'line',
          source: MAP_SOURCE_IDS.ACTIVITIES_LINES,
          paint: expect.objectContaining({
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0],
            'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.85, 0],
          }),
        })
      );
      expect(hoverLayerSpec.filter).toBeUndefined();

      // Simulate hover -> uses GPU setFeatureState (never setFilter)
      mockMap.queryRenderedFeatures.mockReturnValueOnce([
        { id: 1, properties: { trackId: 'ride-1', name: 'Morning <Ride>' } },
      ]);
      mockMap._emit('mousemove', { point: { x: 100, y: 120 }, originalEvent: { buttons: 0 } });
      expect(rafQueue).toHaveLength(1);
      rafQueue.shift()!(16);

      expect(mockMap.setFilter).not.toHaveBeenCalled();
      expect(mockMap.setFeatureState).toHaveBeenCalledWith(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: 1 },
        { hover: true }
      );
      expect(mockMap.getCanvas().style.cursor).toBe('pointer');

      // Simulate mouseout -> clears hover state and resets cursor
      mockMap._emit('mouseout');
      expect(mockMap.setFeatureState).toHaveBeenCalledWith(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: 1 },
        { hover: false }
      );
      expect(mockMap.getCanvas().style.cursor).toBe('');

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
        MAP_LAYER_IDS.ACTIVITIES_LINES,
        'line-opacity',
        ['case', ['boolean', ['feature-state', 'hover'], false], 0, 0.5]
      );
      expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
        MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
        'line-width',
        ['case', ['boolean', ['feature-state', 'hover'], false], 18, 0]
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
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
    }
  });

  it('coalesces rapid mouse sweeps across many lines into a single frame query for only the latest hovered line', () => {
    const mockMap = createMockMapLibreInstance();
    const rafQueue: FrameRequestCallback[] = [];
    const rafSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafQueue.push(cb);
        return rafQueue.length;
      });
    const cancelRafSpy = jest
      .spyOn(globalThis, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    try {
      const cleanup = mountActivityLinesLayer(mockMap as any, sampleTracks, {
        lineThickness: 2,
        lineColor: [255, 0, 0, 0.5],
        lineHoverColor: [255, 100, 100, 0.9],
        layerTransparency: 0.8,
      });

      // Sweep rapidly across 50 positions within a single frame
      for (let i = 1; i <= 50; i++) {
        mockMap._emit('mousemove', {
          point: { x: i * 10, y: 50 },
          originalEvent: { buttons: 0 },
        });
      }

      // Only ONE animation frame should have been scheduled
      expect(rafSpy).toHaveBeenCalledTimes(1);
      expect(mockMap.queryRenderedFeatures).not.toHaveBeenCalled();
      expect(mockMap.setFeatureState).not.toHaveBeenCalled();

      // Flush the single animation frame -> only the 50th point is queried and highlighted
      mockMap.queryRenderedFeatures.mockReturnValueOnce([
        { id: 50, properties: { trackId: 'ride-50', name: 'Ride 50' } },
      ]);
      rafQueue.shift()!(16);

      expect(mockMap.queryRenderedFeatures).toHaveBeenCalledTimes(1);
      expect(mockMap.queryRenderedFeatures).toHaveBeenCalledWith(
        { x: 500, y: 50 },
        { layers: [MAP_LAYER_IDS.ACTIVITIES_LINES] }
      );
      expect(mockMap.setFeatureState).toHaveBeenCalledTimes(1);
      expect(mockMap.setFeatureState).toHaveBeenCalledWith(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: 50 },
        { hover: true }
      );
      expect(mockMap.setFilter).not.toHaveBeenCalled();

      // Starting a map drag immediately clears the hovered line and cancels pending frames
      mockMap._emit('mousemove', { point: { x: 520, y: 50 }, originalEvent: { buttons: 0 } });
      mockMap._emit('dragstart');
      expect(cancelRafSpy).toHaveBeenCalled();
      expect(mockMap.setFeatureState).toHaveBeenCalledWith(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: 50 },
        { hover: false }
      );

      cleanup();
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
    }
  });
});
