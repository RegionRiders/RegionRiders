import { renderHook, act } from '@testing-library/react';
import { useMapViewState } from './useMapViewState';
import { latLngToTile } from '@/components/ActivityMap/utils/resolveTileUrl';

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('useMapViewState', () => {
  it('returns null when map is null', () => {
    const { result } = renderHook(() => useMapViewState(null));
    expect(result.current).toBeNull();
  });

  it('returns initial center and zoom from map', () => {
    const mockMap = {
      getCenter: jest.fn(() => ({ lat: 54.352, lng: 18.656 })),
      getZoom: jest.fn(() => 11),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    const { result } = renderHook(() => useMapViewState(mockMap));

    expect(result.current).toEqual({
      center: [54.352, 18.656],
      zoom: 11,
    });
  });

  it('updates on moveend event', () => {
    let moveendHandler: (() => void) | null = null;
    const mockMap = {
      getCenter: jest.fn(() => ({ lat: 54.352, lng: 18.656 })),
      getZoom: jest.fn(() => 11),
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'moveend') moveendHandler = handler;
      }),
      off: jest.fn(),
    } as any;

    const { result } = renderHook(() => useMapViewState(mockMap));

    // Simulate map pan to a different tile
    mockMap.getCenter.mockReturnValue({ lat: 55.0, lng: 19.0 });
    mockMap.getZoom.mockReturnValue(12);

    act(() => {
      moveendHandler!();
    });

    expect(result.current).toEqual({
      center: [55.0, 19.0],
      zoom: 12,
    });
  });

  it('skips update when tile coordinates have not changed', () => {
    let moveendHandler: (() => void) | null = null;
    const initialCenter = { lat: 54.352, lng: 18.656 };
    const mockMap = {
      getCenter: jest.fn(() => initialCenter),
      getZoom: jest.fn(() => 11),
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'moveend') moveendHandler = handler;
      }),
      off: jest.fn(),
    } as any;

    const { result } = renderHook(() => useMapViewState(mockMap));
    const firstState = result.current;

    // Pan slightly within the same tile
    const { x: origX, y: origY } = latLngToTile(54.352, 18.656, 11);
    // Nudge by a tiny amount — still same tile
    mockMap.getCenter.mockReturnValue({ lat: 54.3521, lng: 18.6561 });
    const { x: newX, y: newY } = latLngToTile(54.3521, 18.6561, 11);
    // Verify both map to the same tile (precondition)
    expect(newX).toBe(origX);
    expect(newY).toBe(origY);

    act(() => {
      moveendHandler!();
    });

    // State reference should be unchanged (update was skipped)
    expect(result.current).toBe(firstState);
  });

  it('cleans up moveend listener on unmount', () => {
    const mockMap = {
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
      getZoom: jest.fn(() => 1),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    const { unmount } = renderHook(() => useMapViewState(mockMap));
    unmount();

    expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('rounds fractional zoom values', () => {
    const mockMap = {
      getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
      getZoom: jest.fn(() => 10.7),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    const { result } = renderHook(() => useMapViewState(mockMap));
    expect(result.current?.zoom).toBe(11);
  });
});
