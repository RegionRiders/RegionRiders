import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import L from 'leaflet';
import { useLeafletMap } from './useLeafletMap';

// Mock Leaflet
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    invalidateSize: jest.fn(),
    getContainer: jest.fn(() => document.querySelector('#test-map')),
    options: {
      maxZoom: 18,
      minZoom: 0,
    },
    removeLayer: jest.fn(),
    getPane: jest.fn(() => document.querySelector('#test-map')),
    whenReady: jest.fn((callback) => {
      callback();
      return { on: jest.fn(), off: jest.fn() };
    }),
  })),
  tileLayer: jest.fn(() => {
    type MockLayer = {
      addTo: jest.Mock<MockLayer, []>;
      getContainer: jest.Mock<HTMLDivElement, []>;
    };
    const layer = {} as MockLayer;
    layer.addTo = jest.fn(() => layer);
    layer.getContainer = jest.fn(() => document.createElement('div'));
    return layer;
  }),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('useLeafletMap', () => {
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-map';
    document.body.appendChild(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (document.body.contains(mockContainer)) {
      document.body.removeChild(mockContainer);
    }
  });

  describe('map initialization', () => {
    it('should initialize with null map when container ref has no element', () => {
      const emptyRef = { current: null } as unknown as React.RefObject<HTMLDivElement>;
      const { result } = renderHook(() => useLeafletMap(emptyRef));
      expect(result.current.map).toBeNull();
      expect(result.current.isReady).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize map when container ref is provided', async () => {
      const containerRef = { current: mockContainer };
      const { result } = renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(L.map).toHaveBeenCalledWith(mockContainer, expect.any(Object));
      expect(result.current.map).toBeTruthy();
      expect(result.current.error).toBeNull();
    });

    it('should use default options when none provided', async () => {
      const containerRef = { current: mockContainer };
      renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(L.map).toHaveBeenCalled();
      });

      expect(L.map).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining({
          center: expect.any(Array),
          zoom: expect.any(Number),
        })
      );
    });

    it('should use custom options when provided', async () => {
      const containerRef = { current: mockContainer };
      const customOptions = {
        center: [50, 10] as [number, number],
        zoom: 15,
      };

      renderHook(() => useLeafletMap(containerRef, customOptions));

      await waitFor(() => {
        expect(L.map).toHaveBeenCalled();
      });

      expect(L.map).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining({
          center: [50, 10],
          zoom: 15,
        })
      );
    });
  });

  describe('map lifecycle', () => {
    it('should clean up map on unmount', async () => {
      const mockRemove = jest.fn();
      const mockMap = {
        setView: jest.fn().mockReturnThis(),
        remove: mockRemove,
        on: jest.fn(),
        off: jest.fn(),
        options: { maxZoom: 18, minZoom: 0 },
        removeLayer: jest.fn(),
        getPane: jest.fn(() => document.querySelector('#test-map')),
        whenReady: jest.fn((callback) => {
          callback();
          return { on: jest.fn(), off: jest.fn() };
        }),
      };

      (L.map as jest.Mock).mockReturnValueOnce(mockMap);

      const containerRef = { current: mockContainer };
      const { result, unmount } = renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });

    it('should not reinitialize map if already exists', async () => {
      const containerRef = { current: mockContainer };
      const { rerender } = renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(L.map).toHaveBeenCalledTimes(1);
      });

      // Rerender should not create a new map
      rerender();
      expect(L.map).toHaveBeenCalledTimes(1);
    });
  });

  describe('config updates', () => {
    it('should update tile layer when config changes', async () => {
      const containerRef = { current: mockContainer };

      const { rerender, result } = renderHook(({ opts }) => useLeafletMap(containerRef, opts), {
        initialProps: {
          opts: {
            tileLayerUrl: 'https://tile1.com/{z}/{x}/{y}.png',
          },
        },
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Verify initial tile layer was created
      const initialCallCount = (L.tileLayer as unknown as jest.Mock).mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Update tile layer URL
      rerender({
        opts: {
          tileLayerUrl: 'https://tile2.com/{z}/{x}/{y}.png',
        },
      });

      // Wait for the effect to trigger
      await waitFor(() => {
        const newCallCount = (L.tileLayer as unknown as jest.Mock).mock.calls.length;
        expect(newCallCount).toBeGreaterThan(initialCallCount);
      });

      // Verify the new tile layer URL was used
      const calls = (L.tileLayer as unknown as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('https://tile2.com/{z}/{x}/{y}.png');
    });

    it('should not update view if map is not ready', async () => {
      const mockSetView = jest.fn().mockReturnThis();
      const mockMap = {
        setView: mockSetView,
        remove: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        options: { maxZoom: 18, minZoom: 0 },
        removeLayer: jest.fn(),
        getPane: jest.fn(() => document.querySelector('#test-map')),
        whenReady: jest.fn(() => {
          // Don't call callback - map never becomes ready
          return { on: jest.fn(), off: jest.fn() };
        }),
      };

      (L.map as jest.Mock).mockReturnValueOnce(mockMap);

      const containerRef = { current: mockContainer };
      const { rerender, result } = renderHook(({ opts }) => useLeafletMap(containerRef, opts), {
        initialProps: { opts: { center: [50, 10] as [number, number], zoom: 10 } },
      });

      // Verify map is not ready
      expect(result.current.isReady).toBe(false);

      mockSetView.mockClear();

      // Update config while map is not ready
      rerender({ opts: { center: [60, 20] as [number, number], zoom: 15 } });

      // Wait a bit to ensure effect has run
      await new Promise((resolve) => setTimeout(resolve, 50));

      // setView should not be called since map is not ready
      expect(mockSetView).not.toHaveBeenCalled();
      expect(result.current.isReady).toBe(false);
    });

    it('should render tint as a transparent color overlay on top of map container', async () => {
      const containerRef = { current: mockContainer };
      renderHook(() =>
        useLeafletMap(containerRef, {
          mapTintColor: [255, 0, 0, 0.5],
        })
      );

      await waitFor(() => {
        const overlay = mockContainer.querySelector(
          '[style*="pointer-events: none"]'
        ) as HTMLDivElement | null;
        expect(overlay).toBeTruthy();
        expect(overlay?.style.backgroundColor).toBe('rgba(255, 0, 0, 0.5)');
        expect(overlay?.style.zIndex).toBe('250');
      });
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      (L.map as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Map initialization failed');
      });

      const containerRef = { current: mockContainer };
      const { result } = renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.map).toBeNull();
    });
  });

  describe('return values', () => {
    it('should return correct structure', async () => {
      const containerRef = { current: mockContainer };
      const { result } = renderHook(() => useLeafletMap(containerRef));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current).toHaveProperty('map');
      expect(result.current).toHaveProperty('isReady');
      expect(result.current).toHaveProperty('error');
    });
  });
});
