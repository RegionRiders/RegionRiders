/**
 * @jest-environment jsdom
 */

import L from 'leaflet';
// Import the mocked function AFTER mocking
import { getRegionColorForCount } from '@/components/ActivityMap/drawRegions/utils/getRegionColorForCount';
import type { Regions } from '@/lib/types';
import type { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { drawRegions } from './drawRegions';

// Mock leaflet
jest.mock('leaflet', () => ({
  geoJSON: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// ✅ FIX: Mock with jest.fn() directly in the factory function
jest.mock('@/components/ActivityMap/drawRegions/utils/getRegionColorForCount', () => ({
  getRegionColorForCount: jest.fn(),
}));

describe('drawRegions', () => {
  let mockMap: any;
  let mockRegions: Regions[];
  let mockVisitData: Map<string, RegionVisitData>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock implementations in beforeEach
    (getRegionColorForCount as jest.Mock)
      .mockImplementationOnce(() => [255, 100, 50, 0.5]) // visited region (count=5)
      .mockImplementationOnce(() => [60, 60, 60, 0]); // unvisited region (count=0)

    mockMap = {
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
    };

    mockRegions = [
      {
        id: 'region-1',
        name: 'Test Region 1',
        country: 'Test Country',
        adminLevel: 1,
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [14.0, 50.0],
              [15.0, 50.0],
              [15.0, 51.0],
              [14.0, 51.0],
              [14.0, 50.0],
            ],
          ],
        },
      },
      {
        id: 'region-2',
        name: 'Test Region 2',
        country: 'Test Country',
        adminLevel: 1,
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [16.0, 50.0],
              [17.0, 50.0],
              [17.0, 51.0],
              [16.0, 51.0],
              [16.0, 50.0],
            ],
          ],
        },
      },
    ];

    mockVisitData = new Map([
      [
        'region-1',
        {
          regionId: 'region-1',
          regionName: 'Test Region 1',
          visited: true,
          visitCount: 5,
          trackIds: ['track-1'],
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [14.0, 50.0],
                [15.0, 50.0],
                [15.0, 51.0],
                [14.0, 51.0],
                [14.0, 50.0],
              ],
            ],
          },
        },
      ],
      [
        'region-2',
        {
          regionId: 'region-2',
          regionName: 'Test Region 2',
          visited: false,
          visitCount: 0,
          trackIds: [],
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [16.0, 50.0],
                [17.0, 50.0],
                [17.0, 51.0],
                [16.0, 51.0],
                [16.0, 50.0],
              ],
            ],
          },
        },
      ],
    ]);
  });

  it('should render all regions', () => {
    const layers = drawRegions(mockMap, mockRegions, mockVisitData);

    expect(layers).toHaveLength(2);
    expect(L.geoJSON).toHaveBeenCalledTimes(2);
  });

  it('should apply correct styles for visited regions', () => {
    drawRegions(mockMap, mockRegions, mockVisitData);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    expect(firstCall[1].style.fillOpacity).toBe(1);
    expect(firstCall[1].style.color).toBe('rgba(255,100,50,1)');
    expect(firstCall[1].style.weight).toBe(2);
  });

  it('should apply correct styles for unvisited regions', () => {
    drawRegions(mockMap, mockRegions, mockVisitData);

    const secondCall = (L.geoJSON as jest.Mock).mock.calls[1];
    expect(secondCall[1].style.fillOpacity).toBe(1);
    expect(secondCall[1].style.color).toBe('rgba(60,60,60,1)');
  });

  it('should use custom initial weight when provided', () => {
    const customWeight = 5;
    drawRegions(mockMap, mockRegions, mockVisitData, undefined, customWeight);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    expect(firstCall[1].style.weight).toBe(customWeight);
  });

  it('should use default weight when not provided', () => {
    drawRegions(mockMap, mockRegions, mockVisitData);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    expect(firstCall[1].style.weight).toBe(2);
  });

  it('should attach click handler when provided', () => {
    const mockClickHandler = jest.fn();

    drawRegions(mockMap, mockRegions, mockVisitData, mockClickHandler);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    expect(firstCall[1].onEachFeature).toBeDefined();
  });

  it('should invoke click handler on region click with correct GeoJSON layer', () => {
    const mockClickHandler = jest.fn();
    const mockGeoJsonLayer = { addTo: jest.fn().mockReturnThis() };
    const mockLeafletLayer = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'click') {
          handler();
        }
      }),
    };

    (L.geoJSON as jest.Mock).mockReturnValue(mockGeoJsonLayer);

    drawRegions(mockMap, mockRegions, mockVisitData, mockClickHandler);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    firstCall[1].onEachFeature({}, mockLeafletLayer);

    expect(mockClickHandler).toHaveBeenCalledWith(
      mockRegions[0],
      mockVisitData.get('region-1'),
      mockGeoJsonLayer
    );
  });

  it('should handle regions without visit data', () => {
    const emptyVisitData = new Map();
    const layers = drawRegions(mockMap, mockRegions, emptyVisitData);

    expect(layers).toHaveLength(2);
    expect(L.geoJSON).toHaveBeenCalledTimes(2);
  });

  it('should handle empty regions array', () => {
    const emptyRegions: Regions[] = [];
    const layers = drawRegions(mockMap, emptyRegions, mockVisitData);

    expect(layers).toHaveLength(0);
    expect(L.geoJSON).not.toHaveBeenCalled();
  });

  it('should return array of layers', () => {
    const mockLayer = { addTo: jest.fn().mockReturnThis() };
    (L.geoJSON as jest.Mock).mockReturnValue(mockLayer);

    const layers = drawRegions(mockMap, mockRegions, mockVisitData);

    expect(layers).toEqual([mockLayer, mockLayer]);
    expect(mockLayer.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('should not attach click handler when not provided', () => {
    drawRegions(mockMap, mockRegions, mockVisitData);

    const firstCall = (L.geoJSON as jest.Mock).mock.calls[0];
    const mockLeafletLayer = { on: jest.fn() };

    firstCall[1].onEachFeature({}, mockLeafletLayer);
    expect(mockLeafletLayer.on).not.toHaveBeenCalled();
  });

  it('should call getRegionColorForCount with correct visit counts', () => {
    drawRegions(mockMap, mockRegions, mockVisitData);

    expect(getRegionColorForCount).toHaveBeenNthCalledWith(1, 5); // region-1 (visited)
    expect(getRegionColorForCount).toHaveBeenNthCalledWith(2, 0); // region-2 (unvisited)
  });
});
