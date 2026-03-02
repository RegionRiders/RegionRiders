import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import { GPXTrack } from '@/lib/types';
import { useActivityRendering } from './useActivityRendering';

// Mock dependencies
jest.mock('leaflet');
jest.mock('./activitiesHeatmap/drawActivitiesAsHeatmap', () => ({
  drawActivitiesAsHeatmap: jest.fn(),
}));
jest.mock('./activitiesLines/drawActivitiesAsLines', () => ({
  drawActivitiesAsLines: jest.fn(),
}));
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Import mocked functions for assertions
import { drawActivitiesAsHeatmap } from './activitiesHeatmap/drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from './activitiesLines/drawActivitiesAsLines';

describe('useActivityRendering', () => {
  let mockMap: L.Map;
  let mockTracks: Map<string, GPXTrack>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock map
    mockMap = {} as L.Map;

    // Create mock tracks
    mockTracks = new Map<string, GPXTrack>();
    mockTracks.set('track1', {
      id: 'track1',
      name: 'Test Track',
      points: [],
    } as GPXTrack);
  });

  it('should call drawActivitiesAsHeatmap when mode is heatmap', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);

    renderHook(() => useActivityRendering(mockMap, mockTracks, true, 'heatmap'));

    expect(drawActivitiesAsHeatmap).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      expect.objectContaining({
        currentImageLayerRef: expect.any(Object),
        renderAbortRef: expect.any(Object),
        renderTimeoutRef: expect.any(Object),
      })
    );
  });

  it('should call drawActivitiesAsLines when mode is lines', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsLines as jest.Mock).mockReturnValue(mockCleanup);

    renderHook(() => useActivityRendering(mockMap, mockTracks, true, 'lines'));

    expect(drawActivitiesAsLines).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      expect.objectContaining({
        renderAbortRef: expect.any(Object),
        renderTimeoutRef: expect.any(Object),
      })
    );
  });

  it('should not call drawing functions when map is null', () => {
    renderHook(() => useActivityRendering(null, mockTracks, true, 'heatmap'));

    expect(drawActivitiesAsHeatmap).not.toHaveBeenCalled();
    expect(drawActivitiesAsLines).not.toHaveBeenCalled();
  });

  it('should not call drawing functions when showActivities is false', () => {
    renderHook(() => useActivityRendering(mockMap, mockTracks, false, 'heatmap'));

    expect(drawActivitiesAsHeatmap).not.toHaveBeenCalled();
    expect(drawActivitiesAsLines).not.toHaveBeenCalled();
  });

  it('should not call drawing functions when tracks is empty', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    renderHook(() => useActivityRendering(mockMap, emptyTracks, true, 'heatmap'));

    expect(drawActivitiesAsHeatmap).not.toHaveBeenCalled();
    expect(drawActivitiesAsLines).not.toHaveBeenCalled();
  });

  it('should use default values for optional parameters', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);

    renderHook(() => useActivityRendering(mockMap, mockTracks));

    // Default mode is 'heatmap'
    expect(drawActivitiesAsHeatmap).toHaveBeenCalled();
  });

  it('should re-render when mode changes', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);
    (drawActivitiesAsLines as jest.Mock).mockReturnValue(mockCleanup);

    const { rerender } = renderHook(
      ({ map, tracks, showActivities, mode }) =>
        useActivityRendering(map, tracks, showActivities, mode),
      {
        initialProps: {
          map: mockMap,
          tracks: mockTracks,
          showActivities: true,
          mode: 'heatmap' as 'heatmap' | 'lines',
        },
      }
    );

    expect(drawActivitiesAsHeatmap).toHaveBeenCalledTimes(1);

    // Change mode
    rerender({
      map: mockMap,
      tracks: mockTracks,
      showActivities: true,
      mode: 'lines' as 'heatmap' | 'lines',
    });

    expect(drawActivitiesAsLines).toHaveBeenCalledTimes(1);
  });

  it('should call cleanup function on unmount', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);

    const { unmount } = renderHook(() =>
      useActivityRendering(mockMap, mockTracks, true, 'heatmap')
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should handle multiple tracks correctly', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);

    const multipleTracks = new Map<string, GPXTrack>();
    multipleTracks.set('track1', { id: 'track1', name: 'Track 1' } as GPXTrack);
    multipleTracks.set('track2', { id: 'track2', name: 'Track 2' } as GPXTrack);
    multipleTracks.set('track3', { id: 'track3', name: 'Track 3' } as GPXTrack);

    renderHook(() => useActivityRendering(mockMap, multipleTracks, true, 'heatmap'));

    expect(drawActivitiesAsHeatmap).toHaveBeenCalledWith(
      mockMap,
      multipleTracks,
      expect.any(Object)
    );
  });
});
