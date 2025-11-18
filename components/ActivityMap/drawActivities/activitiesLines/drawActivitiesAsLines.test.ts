/**
 * @jest-environment jsdom
 */
import L from 'leaflet';
import type { GPXTrack } from '@/lib/types';
import { drawActivitiesAsLines } from './drawActivitiesAsLines';

// Mock leaflet
jest.mock('leaflet', () => ({
  featureGroup: jest.fn(() => ({
    addLayer: jest.fn(),
    addTo: jest.fn(),
  })),
  canvas: jest.fn(() => ({})),
  polyline: jest.fn(() => ({
    on: jest.fn(),
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
jest.mock('../utils/ensureMapPane', () => ({
  ensureMapPane: jest.fn(),
}));

jest.mock('./utils/filterVisibleTracks', () => ({
  filterVisibleTracks: jest.fn((tracks: Map<string, GPXTrack>) => Array.from(tracks.entries())),
}));

jest.mock('./utils/activityLineEvents', () => ({
  attachActivityHoverEvents: jest.fn(),
  attachActivityClickHandler: jest.fn(),
}));

describe('drawActivitiesAsLines', () => {
  let mockMap: any;
  let mockTracks: Map<string, GPXTrack>;
  let renderAbortRef: any;
  let renderTimeoutRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockMap = {
      getBounds: jest.fn(() => ({
        contains: jest.fn(() => true),
      })),
      on: jest.fn(),
      off: jest.fn(),
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
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

    renderAbortRef = { current: false };
    renderTimeoutRef = { current: null };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should attach event listeners to map', () => {
    drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should return cleanup function', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
  });

  it('should remove event listeners on cleanup', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    cleanup();

    expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should set renderAbortRef to true on cleanup', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    cleanup();

    expect(renderAbortRef.current).toBe(true);
  });

  it('should create canvas renderer', () => {
    drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    expect(L.canvas).toHaveBeenCalledWith({ pane: 'linesPane' });
  });

  it('should create feature group for tracks', () => {
    drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    jest.advanceTimersByTime(200);

    expect(L.featureGroup).toHaveBeenCalled();
  });

  it('should handle empty tracks map', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    const cleanup = drawActivitiesAsLines(mockMap, emptyTracks, renderAbortRef, renderTimeoutRef);

    jest.advanceTimersByTime(200);

    expect(cleanup).toBeDefined();
  });

  it('should debounce render calls', () => {
    drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    // Initial timeout should be set
    expect(renderTimeoutRef.current).not.toBeNull();
  });

  it('should clean up activity group on cleanup', () => {
    const mockActivityGroup = {
      addLayer: jest.fn(),
      addTo: jest.fn(),
    };
    (L.featureGroup as jest.Mock).mockReturnValue(mockActivityGroup);
    mockMap.hasLayer.mockReturnValue(true);

    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    jest.advanceTimersByTime(200);
    cleanup();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockActivityGroup);
  });

  it('should abort rendering when renderAbortRef is set', () => {
    drawActivitiesAsLines(mockMap, mockTracks, renderAbortRef, renderTimeoutRef);

    // Set abort before timeout executes
    renderAbortRef.current = true;

    jest.advanceTimersByTime(200);

    // Should not create feature group when aborted
    expect(L.featureGroup).not.toHaveBeenCalled();
  });
});
