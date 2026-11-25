import { act, renderHook } from '@testing-library/react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { useMapLibreMap } from '@/components/ActivityMap/hooks/map/useMapLibreMap';
import { createMockMapLibreInstance, MockMapLibreInstance } from '@/test-utils/maplibreMock';

let latestMapInstance: MockMapLibreInstance | null = null;
let lastConstructorOptions: any = null;

jest.mock('maplibre-gl', () => ({
  __esModule: true,
  setWorkerUrl: jest.fn(),
  Map: jest.fn((options: any) => {
    lastConstructorOptions = options;
    const instance = createMockMapLibreInstance({ loaded: false });
    // Register initial style sources and layers in mock state
    const style = options?.style;
    if (style?.sources) {
      Object.entries(style.sources).forEach(([id, spec]) => {
        instance._sources.set(id, spec);
      });
    }
    if (Array.isArray(style?.layers)) {
      style.layers.forEach((layer: any) => {
        instance._layers.set(layer.id, layer);
        if (layer.paint) {
          instance._paint.set(layer.id, { ...layer.paint });
        }
      });
    }
    latestMapInstance = instance;
    return instance;
  }),
}));

describe('useMapLibreMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestMapInstance = null;
    lastConstructorOptions = null;
  });

  it('initializes MapLibre with [lng, lat] center, raster basemap, monochrome saturation, and tint layer', () => {
    const container = document.createElement('div');
    const ref = { current: container };

    const { result, unmount } = renderHook(() =>
      useMapLibreMap(ref, {
        center: [54.35, 18.65],
        zoom: 10,
        tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OSM',
        mapSourceMonochrome: true,
        mapTintColor: [70, 70, 70, 0.2],
      })
    );

    expect(MapLibreMap).toHaveBeenCalledTimes(1);
    expect(lastConstructorOptions.center).toEqual([18.65, 54.35]);
    expect(lastConstructorOptions.zoom).toBe(10);
    expect(lastConstructorOptions.style.sources[MAP_SOURCE_IDS.BASEMAP].tiles).toEqual([
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ]);
    expect(result.current.isReady).toBe(false);

    act(() => {
      latestMapInstance!._emit('load');
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();

    unmount();
    expect(latestMapInstance!.remove).toHaveBeenCalledTimes(1);
  });

  it('updates monochrome saturation and tint via setPaintProperty without recreating tile sources', () => {
    const container = document.createElement('div');
    const ref = { current: container };

    const { rerender } = renderHook(
      ({ monochrome, tint }: { monochrome: boolean; tint: [number, number, number, number] }) =>
        useMapLibreMap(ref, {
          tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OSM',
          mapSourceMonochrome: monochrome,
          mapTintColor: tint,
        }),
      {
        initialProps: {
          monochrome: true,
          tint: [0, 0, 0, 0] as [number, number, number, number],
        },
      }
    );

    act(() => {
      latestMapInstance!._emit('load');
    });

    latestMapInstance!.addSource.mockClear();

    rerender({
      monochrome: false,
      tint: [210, 70, 70, 0.16],
    });

    expect(latestMapInstance!.addSource).not.toHaveBeenCalled();
    expect(latestMapInstance!.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.BASEMAP_RASTER,
      'raster-saturation',
      0
    );
    expect(latestMapInstance!.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.MAP_TINT,
      'background-color',
      'rgb(210, 70, 70)'
    );
    expect(latestMapInstance!.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.MAP_TINT,
      'background-opacity',
      0.16
    );
  });

  it('swaps basemap tile source when tileLayerUrl changes', () => {
    const container = document.createElement('div');
    const ref = { current: container };

    const { rerender } = renderHook(
      ({ url }: { url: string }) =>
        useMapLibreMap(ref, {
          tileLayerUrl: url,
          attribution: '© Test',
        }),
      {
        initialProps: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
      }
    );

    act(() => {
      latestMapInstance!._emit('load');
    });

    rerender({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    });

    expect(latestMapInstance!.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.BASEMAP_RASTER);
    expect(latestMapInstance!.removeSource).toHaveBeenCalledWith(MAP_SOURCE_IDS.BASEMAP);
    expect(latestMapInstance!.addSource).toHaveBeenCalledWith(
      MAP_SOURCE_IDS.BASEMAP,
      expect.objectContaining({
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
      })
    );
  });
});
