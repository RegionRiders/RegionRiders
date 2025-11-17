/**
 * @jest-environment jsdom
 */
import type { GPXTrack } from '@/lib/types/types';
import { drawActivitiesAsHeatmap } from './drawActivitiesAsHeatmap';

// Mock leaflet
jest.mock('leaflet', () => ({
  imageOverlay: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
}));

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

jest.mock('./utils/drawLineToAccumulator', () => ({
  drawLineToAccumulator: jest.fn(),
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

    mockMap = {
      getBounds: jest.fn(() => ({
        getNorthWest: jest.fn(() => ({ lat: 50, lng: 14 })),
        getSouthEast: jest.fn(() => ({ lat: 49, lng: 15 })),
        getSouthWest: jest.fn(() => ({ lat: 49, lng: 14 })),
        getNorthEast: jest.fn(() => ({ lat: 50, lng: 15 })),
      })),
      getZoom: jest.fn(() => 12),
      project: jest.fn((_latlng, _zoom) => ({
        x: _latlng.lng * 100,
        y: _latlng.lat * 100,
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

    jest.advanceTimersByTime(100);

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

    jest.advanceTimersByTime(100);

    expect(cleanup).toBeDefined();
  });
});
