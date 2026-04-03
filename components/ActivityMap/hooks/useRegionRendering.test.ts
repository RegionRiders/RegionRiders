import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import { useRegionRendering } from './useRegionRendering';

jest.mock('leaflet.vectorgrid', () => ({}));

jest.mock('@/lib/services/maps/selectRenderProfile', () => ({
  selectRegionRenderProfile: jest.fn(() => 'mobile'),
}));

jest.mock('@/components/ActivityMap/config/regionTileProfiles', () => ({
  getRegionTileProfileConfig: jest.fn(() => ({
    sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 4,
    maxZoom: 12,
    style: {
      color: '#c51b1f',
      weight: 1,
      fillColor: '#c51b1f',
      fillOpacity: 0.08,
      opacity: 0.9,
    },
  })),
}));

describe('useRegionRendering', () => {
  const addTo = jest.fn();
  const on = jest.fn();
  const off = jest.fn();

  const mockLayer: any = {
    addTo,
    on,
    off,
  };

  const mockMap = {
    hasLayer: jest.fn(() => false),
    removeLayer: jest.fn(),
    getPane: jest.fn(() => null),
    createPane: jest.fn(() => ({ style: { zIndex: '' } })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (L as any).vectorGrid = {
      protobuf: jest.fn(() => mockLayer),
    };
  });

  it('does nothing when map is null', () => {
    renderHook(() => useRegionRendering(null, true));

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('does not render layer when borders are hidden', () => {
    renderHook(() => useRegionRendering(mockMap, false));

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('creates vector tile layer and adds it to map', () => {
    renderHook(() => useRegionRendering(mockMap, true));

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(addTo).toHaveBeenCalledWith(mockMap);
    expect(on).toHaveBeenCalledWith('load', expect.any(Function));
    expect(on).toHaveBeenCalledWith('tileerror', expect.any(Function));
  });

  it('cleans up tile listeners and map layer on unmount', () => {
    mockMap.hasLayer.mockReturnValue(true);

    const { unmount } = renderHook(() => useRegionRendering(mockMap, true));

    unmount();

    expect(off).toHaveBeenCalledWith('load', expect.any(Function));
    expect(off).toHaveBeenCalledWith('tileerror', expect.any(Function));
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockLayer);
  });
});
