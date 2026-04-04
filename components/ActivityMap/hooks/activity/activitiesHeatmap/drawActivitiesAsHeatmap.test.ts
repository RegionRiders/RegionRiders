/**
 * @jest-environment jsdom
 */

import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation';
import type { GPXTrack } from '@/lib/types';
import type { HeatmapRefs } from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';
import { drawActivitiesAsHeatmap } from './drawActivitiesAsHeatmap';

// Mock leaflet
jest.mock('leaflet', () => ({
  imageOverlay: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock utilities
jest.mock('../utils/ensureMapPane', () => ({
  ensureMapPane: jest.fn(),
}));

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation',
  () => ({
    validateCanvasDimensions: jest.fn(() => true),
  })
);

jest.mock('@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasProjection');
jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount'
);
jest.mock('@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator');

describe('drawActivitiesAsHeatmap', () => {
  let mockMap: any;
  let mockTracks: Map<string, GPXTrack>;
  let currentImageLayerRef: { current: any };
  let currentImageUrlRef: { current: string | null };
  let renderAbortRef: { current: boolean };
  let renderTimeoutRef: { current: NodeJS.Timeout | null };
  let activeRenderIdRef: { current: number };
  let refs: HeatmapRefs;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMap = {
      getBounds: jest.fn(() => ({
        getNorthWest: jest.fn(() => ({ lat: 50, lng: 14 })),
        getSouthEast: jest.fn(() => ({ lat: 49, lng: 15 })),
        getSouthWest: jest.fn(() => ({ lat: 49, lng: 14 })),
        getNorthEast: jest.fn(() => ({ lat: 50, lng: 15 })),
      })),
      getZoom: jest.fn(() => 12),
      project: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
    };

    mockTracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Test Track',
          points: [
            { lat: 49.5, lon: 14.5 },
            { lat: 49.6, lon: 14.6 },
          ],
          metadata: { distance: 10.0 },
        },
      ],
    ]);

    currentImageLayerRef = { current: null };
    currentImageUrlRef = { current: null };
    renderAbortRef = { current: false };
    renderTimeoutRef = { current: null };
    activeRenderIdRef = { current: 0 };

    refs = {
      currentImageLayerRef,
      currentImageUrlRef,
      renderAbortRef,
      renderTimeoutRef,
      activeRenderIdRef,
      heatmapDensity: 2,
      lineThickness: 3,
      layerTransparency: 1,
      edgeSmoothingEnabled: true,
    } as HeatmapRefs;
  });

  describe('Setup and event listeners', () => {
    it('should attach event listeners to map', () => {
      drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));
      expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
    });

    it('should return cleanup function', () => {
      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');
    });

    it('should create heatmap pane', () => {
      drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      expect(ensureMapPane).toHaveBeenCalledWith(mockMap, 'heatmapPane', '450');
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on cleanup', () => {
      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      cleanup();

      expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
      expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
    });

    it('should set renderAbortRef to true on cleanup', () => {
      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      cleanup();

      expect(renderAbortRef.current).toBe(true);
    });

    it('should handle cleanup with existing layer', () => {
      const existingLayer = { mock: 'existing' };
      currentImageLayerRef.current = existingLayer;
      mockMap.hasLayer.mockReturnValue(true);

      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      cleanup();

      expect(mockMap.removeLayer).toHaveBeenCalledWith(existingLayer);
    });

    it('should handle cleanup when removeLayer throws', () => {
      currentImageLayerRef.current = { mock: 'layer' };
      mockMap.hasLayer.mockReturnValue(true);
      mockMap.removeLayer.mockImplementation(() => {
        throw new Error('Remove layer failed');
      });

      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Input validation', () => {
    it('should handle null map gracefully', () => {
      const cleanup = drawActivitiesAsHeatmap(null, mockTracks, refs);

      expect(cleanup).toBeDefined();
      expect(ensureMapPane).not.toHaveBeenCalled();
    });

    it('should handle map without getBounds method', () => {
      const invalidMap: any = {
        on: jest.fn(),
        off: jest.fn(),
      };

      drawActivitiesAsHeatmap(invalidMap, mockTracks, refs);

      expect(invalidMap.on).toHaveBeenCalled();
    });

    it('should handle invalid canvas dimensions', () => {
      (validateCanvasDimensions as jest.Mock).mockReturnValue(false);

      const cleanup = drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      expect(cleanup).toBeDefined();
    });
  });

  describe('Map events', () => {
    it('should debounce rapid zoom events', () => {
      jest.useFakeTimers();

      drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      const zoomHandler = mockMap.on.mock.calls.find((call: any[]) => call[0] === 'zoomend')[1];

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      zoomHandler();
      zoomHandler();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should trigger re-render on moveend', () => {
      jest.useFakeTimers();

      drawActivitiesAsHeatmap(mockMap, mockTracks, refs);

      const moveHandler = mockMap.on.mock.calls.find((call: any[]) => call[0] === 'moveend')[1];

      jest.clearAllMocks();
      moveHandler();

      expect(jest.getTimerCount()).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('Error handling', () => {
    it('should not throw on setup errors', () => {
      (ensureMapPane as jest.Mock).mockImplementation(() => {
        throw new Error('Map pane error');
      });

      expect(() => drawActivitiesAsHeatmap(mockMap, mockTracks, refs)).not.toThrow();
    });
  });
});
