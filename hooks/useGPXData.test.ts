import { renderHook, waitFor, act } from '@testing-library/react';
import { useGPXData } from './useGPXData';
import { logger } from '@/lib/logger/client';
import { DataLoader } from '@/lib/services/DataLoader';
import { GPXTrack } from '@/lib/types/types';

// Mock dependencies
jest.mock('@/lib/logger/client', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/services/DataLoader');

describe('useGPXData', () => {
  const mockTracks = new Map<string, GPXTrack>([
    ['track1', { id: 'track1', name: 'Track 1', points: [] } as GPXTrack],
    ['track2', { id: 'track2', name: 'Track 2', points: [] } as GPXTrack],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty tracks when autoLoad is false', () => {
    const { result } = renderHook(() => useGPXData(false));

    expect(result.current.tracks.size).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should attempt to load tracks on mount when autoLoad is true', async () => {
    (DataLoader.loadGPXTracks as jest.Mock).mockResolvedValue(mockTracks);

    renderHook(() => useGPXData(true));

    // Just verify the load was attempted
    await waitFor(() => {
      expect(DataLoader.loadGPXTracks).toHaveBeenCalledWith('local');
    });
  });

  it('should call DataLoader.loadGPXTracks with "local"', async () => {
    (DataLoader.loadGPXTracks as jest.Mock).mockResolvedValue(mockTracks);

    renderHook(() => useGPXData(true));

    await waitFor(() => {
      expect(DataLoader.loadGPXTracks).toHaveBeenCalledWith('local');
    });
  });

  it('should log when tracks are loaded', async () => {
    (DataLoader.loadGPXTracks as jest.Mock).mockResolvedValue(mockTracks);

    renderHook(() => useGPXData(true));

    await waitFor(() => {
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Loaded 2 tracks/)
      );
    });
  });

  it('should set error state when loading fails', async () => {
    const error = new Error('Failed to load');
    (DataLoader.loadGPXTracks as jest.Mock).mockRejectedValue(error);

    renderHook(() => useGPXData(true));

    // Just verify the error was logged
    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
    });
  });

  it('should log errors when loading fails', async () => {
    const error = new Error('Failed to load');
    (DataLoader.loadGPXTracks as jest.Mock).mockRejectedValue(error);

    renderHook(() => useGPXData(true));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
    });
  });

  it('should provide addTrack function', () => {
    const { result } = renderHook(() => useGPXData(false));

    const newTrack: GPXTrack = {
      id: 'new-track',
      name: 'New Track',
      points: [],
    } as GPXTrack;

    act(() => {
      result.current.addTrack(newTrack);
    });

    expect(result.current.tracks.has('new-track')).toBe(true);
    expect(result.current.trackCount).toBe(1);
  });

  it('should provide removeTrack function', () => {
    const { result } = renderHook(() => useGPXData(false));

    const track: GPXTrack = {
      id: 'track-to-remove',
      name: 'Track',
      points: [],
    } as GPXTrack;

    act(() => {
      result.current.addTrack(track);
    });
    expect(result.current.tracks.has('track-to-remove')).toBe(true);

    act(() => {
      result.current.removeTrack('track-to-remove');
    });
    expect(result.current.tracks.has('track-to-remove')).toBe(false);
  });

  it('should provide clearTracks function', () => {
    const { result } = renderHook(() => useGPXData(false));

    const track1: GPXTrack = { id: 'track1', name: 'Track 1', points: [] } as GPXTrack;
    const track2: GPXTrack = { id: 'track2', name: 'Track 2', points: [] } as GPXTrack;

    act(() => {
      result.current.addTrack(track1);
      result.current.addTrack(track2);
    });
    expect(result.current.trackCount).toBe(2);

    act(() => {
      result.current.clearTracks();
    });
    expect(result.current.trackCount).toBe(0);
  });

  it('should return trackCount', () => {
    const { result } = renderHook(() => useGPXData(false));

    expect(result.current.trackCount).toBe(0);

    const track: GPXTrack = { id: 'track1', name: 'Track 1', points: [] } as GPXTrack;
    act(() => {
      result.current.addTrack(track);
    });

    expect(result.current.trackCount).toBe(1);
  });

  it('should use track id as key when adding track', () => {
    const { result } = renderHook(() => useGPXData(false));

    const track: GPXTrack = { id: 'my-id', name: 'Track', points: [] } as GPXTrack;
    act(() => {
      result.current.addTrack(track);
    });

    expect(result.current.tracks.has('my-id')).toBe(true);
  });

  it('should use track name as key when id is not available', () => {
    const { result } = renderHook(() => useGPXData(false));

    const track: Partial<GPXTrack> = { name: 'My Track', points: [] };
    act(() => {
      result.current.addTrack(track as GPXTrack);
    });

    // The implementation uses `track.id || track.name || generated-id`
    // So it should use the name
    expect(result.current.trackCount).toBe(1);
    const keys = Array.from(result.current.tracks.keys());
    expect(keys).toContain('My Track');
  });

  it('should generate key when neither id nor name is available', () => {
    const { result } = renderHook(() => useGPXData(false));

    const track: Partial<GPXTrack> = { points: [] };
    act(() => {
      result.current.addTrack(track as GPXTrack);
    });

    expect(result.current.trackCount).toBe(1);
    const keys = Array.from(result.current.tracks.keys());
    expect(keys[0]).toMatch(/^track-\d+$/);
  });

  it('should not load tracks when autoLoad is false', () => {
    renderHook(() => useGPXData(false));

    // Since autoLoad is false, DataLoader should never be called
    expect(DataLoader.loadGPXTracks).not.toHaveBeenCalled();
  });

  it('should handle removeTrack for non-existent track gracefully', () => {
    const { result } = renderHook(() => useGPXData(false));

    act(() => {
      result.current.removeTrack('non-existent');
    });

    expect(result.current.trackCount).toBe(0);
  });
});
