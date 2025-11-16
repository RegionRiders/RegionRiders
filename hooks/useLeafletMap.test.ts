// hooks/useLeafletMap.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useLeafletMap } from './useLeafletMap';
import L from 'leaflet';

// Mock Leaflet
jest.mock('leaflet', () => ({
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        remove: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        invalidateSize: jest.fn(),
        whenReady: jest.fn((callback) => {
            // Call the callback immediately in tests
            callback();
            return { on: jest.fn(), off: jest.fn() };
        }),
    })),
    tileLayer: jest.fn(() => ({
        addTo: jest.fn(),
    })),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
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
            const emptyRef = { current: null };
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
                whenReady: jest.fn((callback) => {
                    callback();
                    return { on: jest.fn(), off: jest.fn() };
                }),
            };

            (L.map as jest.Mock).mockReturnValue(mockMap);

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
