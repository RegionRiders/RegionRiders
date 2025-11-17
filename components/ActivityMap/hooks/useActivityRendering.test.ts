import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import { logger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types/types';
import { drawActivities } from '../drawActivities/drawActivities';
import { useActivityRendering } from './useActivityRendering';

// Mock dependencies
jest.mock('leaflet');
jest.mock('../drawActivities/drawActivities');
jest.mock('@/lib/logger/client', () => ({
  logger: {
    info: jest.fn(),
  },
}));

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

  it('should call drawActivities when all conditions are met', () => {
    const mockCleanup = jest.fn();
    (drawActivities as jest.Mock).mockReturnValue(mockCleanup);

    renderHook(() => useActivityRendering(mockMap, mockTracks, true, 'heatmap'));

    expect(drawActivities).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      expect.objectContaining({ current: null }), // currentImageLayerRef
      expect.objectContaining({ current: false }), // renderAbortRef
      expect.objectContaining({ current: null }), // renderTimeoutRef
      'heatmap'
    );
  });

  it('should not call drawActivities when map is null', () => {
    renderHook(() => useActivityRendering(null, mockTracks, true, 'heatmap'));

    expect(drawActivities).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Skipping render'));
  });

  it('should not call drawActivities when showActivities is false', () => {
    renderHook(() => useActivityRendering(mockMap, mockTracks, false, 'heatmap'));

    expect(drawActivities).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Skipping render'));
  });

  it('should not call drawActivities when tracks is empty', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    renderHook(() => useActivityRendering(mockMap, emptyTracks, true, 'heatmap'));

    expect(drawActivities).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Skipping render'));
  });

  it('should use default values for optional parameters', () => {
    const mockCleanup = jest.fn();
    (drawActivities as jest.Mock).mockReturnValue(mockCleanup);

    renderHook(() => useActivityRendering(mockMap, mockTracks));

    expect(drawActivities).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      'heatmap' // default mode
    );
  });

  it('should re-render when dependencies change', () => {
    const mockCleanup = jest.fn();
    (drawActivities as jest.Mock).mockReturnValue(mockCleanup);

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

    expect(drawActivities).toHaveBeenCalledTimes(1);

    // Change mode
    rerender({
      map: mockMap,
      tracks: mockTracks,
      showActivities: true,
      mode: 'lines' as 'heatmap' | 'lines',
    });

    expect(drawActivities).toHaveBeenCalledTimes(2);
    expect(drawActivities).toHaveBeenLastCalledWith(
      mockMap,
      mockTracks,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      'lines'
    );
  });

  it('should call cleanup function on unmount', () => {
    const mockCleanup = jest.fn();
    (drawActivities as jest.Mock).mockReturnValue(mockCleanup);

    const { unmount } = renderHook(() =>
      useActivityRendering(mockMap, mockTracks, true, 'heatmap')
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should log hook initialization with correct parameters', () => {
    renderHook(() => useActivityRendering(mockMap, mockTracks, true, 'heatmap'));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[useActivityRendering] Hook called with:')
    );
  });

  it('should handle multiple tracks correctly', () => {
    const mockCleanup = jest.fn();
    (drawActivities as jest.Mock).mockReturnValue(mockCleanup);

    const multipleTracks = new Map<string, GPXTrack>();
    multipleTracks.set('track1', { id: 'track1', name: 'Track 1' } as GPXTrack);
    multipleTracks.set('track2', { id: 'track2', name: 'Track 2' } as GPXTrack);
    multipleTracks.set('track3', { id: 'track3', name: 'Track 3' } as GPXTrack);

    renderHook(() => useActivityRendering(mockMap, multipleTracks, true, 'heatmap'));

    expect(drawActivities).toHaveBeenCalledWith(
      mockMap,
      multipleTracks,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      'heatmap'
    );
    // The logger outputs [object Object], not the actual properties
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[useActivityRendering] Hook called with:')
    );
  });
});
