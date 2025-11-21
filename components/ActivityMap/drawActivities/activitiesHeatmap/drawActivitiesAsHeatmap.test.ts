/**
 * @jest-environment jsdom
 */
import { imageOverlay } from 'leaflet';
import { logger } from '@/lib/logger/client';
import type { GPXTrack } from '@/lib/types';
import { ensureMapPane } from '../utils/ensureMapPane';
import { drawActivitiesAsHeatmap } from './drawActivitiesAsHeatmap';

// Mock leaflet
jest.mock('leaflet', () => ({
  imageOverlay: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
}));

// Mock document.createElement for canvas
const mockCanvas: any = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    createImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(100),
    })),
    putImageData: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
};

const mockCreateElement = jest.spyOn(document, 'createElement');
mockCreateElement.mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return document.createElement(tagName);
});

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock utilities
jest.mock('./utils/canvasProjection', () => ({
  createLatLngToPixelConverter: jest.fn(() => (lat: number, lon: number) => ({
    x: lon * 100,
    y: lat * 100,
  })),
}));

jest.mock('../utils/ensureMapPane', () => ({
  ensureMapPane: jest.fn(),
}));

jest.mock('./utils/getHeatmapColorForCount', () => ({
  getHeatmapColorForCount: jest.fn(() => [255, 0, 0]),
}));

describe('drawActivitiesAsHeatmap', () => {
  let mockMap: any;
  let mockTracks: Map<string, GPXTrack>;
  let currentImageLayerRef: any;
  let renderAbortRef: any;
  let renderTimeoutRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock requestAnimationFrame to execute callbacks immediately
    let rafId = 0;
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      rafId++;
      // Execute callback immediately to allow test to proceed synchronously
      cb(performance.now());
      return rafId;
    }) as any;

    // Reset canvas mock
    mockCanvas.width = 256;
    mockCanvas.height = 256;
    (mockCanvas.getContext as jest.Mock).mockImplementation(() => ({
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100),
      })),
      putImageData: jest.fn(),
    }));

    // Reset module mocks to their default implementations
    (ensureMapPane as jest.Mock).mockImplementation(() => {});
    (imageOverlay as jest.Mock).mockImplementation(() => ({
      addTo: jest.fn().mockReturnThis(),
    }));

    mockMap = {
      getBounds: jest.fn(() => ({
        getNorthWest: jest.fn(() => ({ lat: 50, lng: 14 })),
        getSouthEast: jest.fn(() => ({ lat: 49, lng: 15 })),
        getSouthWest: jest.fn(() => ({ lat: 49, lng: 14 })),
        getNorthEast: jest.fn(() => ({ lat: 50, lng: 15 })),
      })),
      getZoom: jest.fn(() => 12),
      project: jest.fn((latLng: any, _zoom: any) => ({
        x: latLng.lng * 100,
        y: latLng.lat * 100,
      })),
      on: jest.fn(),
      off: jest.fn(),
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
    };

    mockTracks = new Map([
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
    renderAbortRef = { current: false };
    renderTimeoutRef = { current: null };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should attach event listeners to map', () => {
    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should return cleanup function', () => {
    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
  });

  it('should remove event listeners on cleanup', () => {
    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    cleanup();

    expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should set renderAbortRef to true on cleanup', () => {
    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    cleanup();

    expect(renderAbortRef.current).toBe(true);
  });

  it('should handle map without getBounds method', () => {
    const invalidMap = {
      on: jest.fn(),
      off: jest.fn(),
    };

    drawActivitiesAsHeatmap(
      invalidMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    // Should not throw error - it should log a warning instead
    expect(invalidMap.on).toHaveBeenCalled();
  });

  it('should schedule rendering after initialization', () => {
    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    // Render should be scheduled via setTimeout
    expect(renderTimeoutRef.current).not.toBeNull();
  });

  it('should handle empty tracks map', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      emptyTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    expect(cleanup).toBeDefined();
  });

  it('should handle invalid canvas dimensions', () => {
    mockMap.project.mockReturnValueOnce({ x: NaN, y: 100 });

    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    // Should not add layer for invalid dimensions
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it('should handle render abort during processing', () => {
    // Set up a track that would take time to process
    const largeTrack = {
      id: 'large-track',
      name: 'Large Track',
      points: Array.from({ length: 100 }, (_, i) => ({
        lat: 49.5 + i * 0.01,
        lon: 14.5 + i * 0.01,
      })),
      metadata: { distance: 100.0 },
    };

    const largeTracks = new Map([['large-track', largeTrack]]);

    drawActivitiesAsHeatmap(
      mockMap,
      largeTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    // Set abort flag before advancing timers
    renderAbortRef.current = true;

    jest.runAllTimers();

    // Should not add layer if aborted
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it('should trigger re-render on map events', () => {
    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    // Get the event handlers
    const zoomHandler = mockMap.on.mock.calls.find((call: any[]) => call[0] === 'zoomend')[1];
    const moveHandler = mockMap.on.mock.calls.find((call: any[]) => call[0] === 'moveend')[1];

    // Trigger zoom event
    zoomHandler();

    // Should schedule another render
    expect(renderTimeoutRef.current).not.toBeNull();

    // Trigger move event
    moveHandler();

    // Should still work
    expect(typeof zoomHandler).toBe('function');
    expect(typeof moveHandler).toBe('function');
  });

  it('should clear zoom timeout on rapid events', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    const zoomHandler = mockMap.on.mock.calls.find((call: any[]) => call[0] === 'zoomend')[1];

    // Trigger zoom event twice rapidly
    zoomHandler();
    zoomHandler();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should handle cleanup with existing layer', () => {
    currentImageLayerRef.current = { mock: 'layer' };
    mockMap.hasLayer.mockReturnValue(true);

    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    cleanup();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(currentImageLayerRef.current);
  });

  it('should handle cleanup when removeLayer throws', () => {
    currentImageLayerRef.current = { mock: 'layer' };
    mockMap.hasLayer.mockReturnValue(true);
    mockMap.removeLayer.mockImplementation(() => {
      throw new Error('Remove layer failed');
    });

    const cleanup = drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    // Should not throw
    expect(() => cleanup()).not.toThrow();
  });

  it('should handle errors during rendering', () => {
    // Mock ensureMapPane to throw
    (ensureMapPane as jest.Mock).mockImplementation(() => {
      throw new Error('Map pane error');
    });

    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[drawActivities] Error rendering heatmap')
    );
  });

  it('should handle finishRender with invalid context', () => {
    // Mock context to be invalid in finishRender
    let callCount = 0;
    (mockCanvas.getContext as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount > 1) {
        return null as any; // Invalid context for finishRender
      }
      return {
        createImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(100),
        })),
        putImageData: jest.fn(),
      } as any;
    });

    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    // Should not add layer due to invalid context in finishRender
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it('should handle finishRender with invalid dimensions', () => {
    // Mock canvas with invalid dimensions for finishRender
    mockCanvas.width = 0;
    mockCanvas.height = 0;

    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    jest.runAllTimers();

    // Should not add layer due to invalid dimensions in finishRender
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it('should handle abort during finishRender', () => {
    drawActivitiesAsHeatmap(
      mockMap,
      mockTracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );

    // Set abort after rendering starts but before finish
    jest.runAllTimers();
    renderAbortRef.current = true;
    jest.runAllTimers();

    // Should not add layer if aborted during finishRender
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });
});
