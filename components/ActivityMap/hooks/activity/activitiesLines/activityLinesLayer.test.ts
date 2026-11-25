import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  mountActivityLinesLayer,
  simplifyCoordinatesRdp,
  updateActivityLinesPaint,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/activityLinesLayer';
import { WebGL2LinesLayer } from '@/components/ActivityMap/hooks/activity/activitiesLines/WebGL2LinesLayer';
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

  it('mounts WebGL2LinesLayer, updates options in-place, handles hover & click, and cleans up', () => {
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

      expect(mockMap.addLayer).toHaveBeenCalledTimes(1);
      const addedLayer = mockMap.addLayer.mock.calls[0][0] as WebGL2LinesLayer;
      expect(addedLayer).toBeInstanceOf(WebGL2LinesLayer);
      expect(addedLayer.id).toBe(MAP_LAYER_IDS.ACTIVITIES_LINES);

      // Simulate onAdd so hitTest has access to map.project/unproject
      const hitTestSpy = jest.spyOn(addedLayer, 'hitTest').mockReturnValue({
        trackIndex: 0,
        trackId: 'ride-1',
        name: 'Morning <Ride>',
      });
      const setHoveredSpy = jest.spyOn(addedLayer, 'setHoveredTrackIndex');
      const updateOptionsSpy = jest.spyOn(addedLayer, 'updateOptions');

      // Simulate hover -> coalesced via rAF and updates layer hoveredTrackIndex
      mockMap._emit('mousemove', { point: { x: 1865, y: 5435 }, originalEvent: { buttons: 0 } });
      expect(rafQueue).toHaveLength(1);
      rafQueue.shift()!(16);

      expect(hitTestSpy).toHaveBeenCalledWith({ x: 1865, y: 5435 });
      expect(setHoveredSpy).toHaveBeenCalledWith(0);
      expect(mockMap.getCanvas().style.cursor).toBe('pointer');

      // Simulate mouseout -> clears hover state and resets cursor
      mockMap._emit('mouseout');
      expect(setHoveredSpy).toHaveBeenCalledWith(-1);
      expect(mockMap.getCanvas().style.cursor).toBe('');

      // Simulate in-place paint/transparency update without re-mounting layer
      updateActivityLinesPaint(mockMap as any, {
        lineThickness: 5,
        lineColor: [0, 255, 0, 0.6],
        lineHoverColor: [100, 255, 100, 1],
        layerTransparency: 0.35,
      });
      expect(mockMap.addLayer).toHaveBeenCalledTimes(1);
      expect(updateOptionsSpy).toHaveBeenCalledWith({
        lineThickness: 5,
        lineColor: [0, 255, 0, 0.6],
        lineHoverColor: [100, 255, 100, 1],
        layerTransparency: 0.35,
      });

      // Simulate click -> opens sanitized popup for hit track
      mockMap._emit('click', {
        lngLat: { lng: 18.65, lat: 54.35 },
        point: { x: 1865, y: 5435 },
      });
      expect(mockPopupInstance.setHTML).toHaveBeenCalledWith(
        expect.stringContaining('Morning &lt;Ride&gt;')
      );
      expect(mockPopupInstance.addTo).toHaveBeenCalledWith(mockMap);

      // Cleanup removes layer, listeners, and popup
      cleanup();
      expect(mockPopupInstance.remove).toHaveBeenCalled();
      expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_LINES);
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
    }
  });

  it('coalesces rapid mouse sweeps into a single frame query for only the latest cursor position', () => {
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

      const addedLayer = mockMap.addLayer.mock.calls[0][0] as WebGL2LinesLayer;
      const hitTestSpy = jest
        .spyOn(addedLayer, 'hitTest')
        .mockReturnValue({ trackIndex: 0, trackId: 'ride-1', name: 'Morning <Ride>' });
      const setHoveredSpy = jest.spyOn(addedLayer, 'setHoveredTrackIndex');

      for (let i = 1; i <= 50; i++) {
        mockMap._emit('mousemove', {
          point: { x: i * 10, y: 50 },
          originalEvent: { buttons: 0 },
        });
      }

      expect(rafSpy).toHaveBeenCalledTimes(1);
      expect(hitTestSpy).not.toHaveBeenCalled();

      rafQueue.shift()!(16);

      expect(hitTestSpy).toHaveBeenCalledTimes(1);
      expect(hitTestSpy).toHaveBeenCalledWith({ x: 500, y: 50 });
      expect(setHoveredSpy).toHaveBeenCalledWith(0);

      // Starting a map drag immediately clears the hovered line and cancels pending frames
      mockMap._emit('mousemove', { point: { x: 520, y: 50 }, originalEvent: { buttons: 0 } });
      mockMap._emit('dragstart');
      expect(cancelRafSpy).toHaveBeenCalled();
      expect(setHoveredSpy).toHaveBeenCalledWith(-1);

      cleanup();
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
    }
  });
});
