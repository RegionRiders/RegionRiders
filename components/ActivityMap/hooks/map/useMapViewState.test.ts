import { renderHook, act } from '@testing-library/react';
import { useMapViewState } from './useMapViewState';

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

    // Simulate map pan
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
