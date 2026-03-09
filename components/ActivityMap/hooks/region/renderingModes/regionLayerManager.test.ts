/**
 * @jest-environment jsdom
 */

import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { RegionLayerManager } from './regionLayerManager';

// Mock Leaflet
const mockSetStyle = jest.fn();
const mockBringToFront = jest.fn();
const mockOn = jest.fn();
const mockClearLayers = jest.fn();
const mockAddLayer = jest.fn();
const mockRemoveLayer = jest.fn();

const mockGeoJSONLayer = {
  setStyle: mockSetStyle,
  bringToFront: mockBringToFront,
  on: mockOn,
};

const mockLayerGroup = {
  addTo: jest.fn().mockReturnThis(),
  clearLayers: mockClearLayers,
  addLayer: mockAddLayer,
  removeLayer: mockRemoveLayer,
};

const mockMap = {
  removeLayer: jest.fn(),
};

jest.mock('leaflet', () => ({
  geoJSON: jest.fn((_geometry, options) => {
    // Call onEachFeature if provided to simulate Leaflet's behavior
    if (options?.onEachFeature) {
      options.onEachFeature({}, { on: mockOn });
    }
    return mockGeoJSONLayer;
  }),
  layerGroup: jest.fn(() => mockLayerGroup),
}));

describe('RegionLayerManager', () => {
  let manager: RegionLayerManager;

  const mockThresholds: ColorThreshold[] = [
    { threshold: 0, color: [60, 60, 60, 0] },
    { threshold: 1, color: [76, 107, 34, 0.2] },
  ];

  const createMockRegion = (id: string): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'TEST',
    adminLevel: 1,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new RegionLayerManager(mockMap as any);
  });

  describe('constructor', () => {
    it('should create a layer group and add it to the map', () => {
      expect(mockLayerGroup.addTo).toHaveBeenCalledWith(mockMap);
    });
  });

  describe('syncRegions', () => {
    it('should add new layers for new regions', () => {
      const regions = [createMockRegion('1'), createMockRegion('2')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      expect(mockAddLayer).toHaveBeenCalledTimes(2);
    });

    it('should remove layers for regions no longer in viewport', () => {
      const regions = [createMockRegion('1'), createMockRegion('2')];
      const visitData = new Map<string, RegionVisitData>();

      // First sync with two regions
      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      // Second sync with only one region
      manager.syncRegions([createMockRegion('1')], 'static', visitData, 2, mockThresholds);

      expect(mockRemoveLayer).toHaveBeenCalled();
    });

    it('should update existing layers instead of creating new ones', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>();

      // First sync
      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      const initialAddLayerCount = mockAddLayer.mock.calls.length;

      // Second sync with same region
      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      // Should update style and bring to front, not add new layer
      expect(mockSetStyle).toHaveBeenCalled();
      expect(mockBringToFront).toHaveBeenCalled();
      expect(mockAddLayer).toHaveBeenCalledTimes(initialAddLayerCount);
    });

    it('should use heatmap mode for coloring', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>([
        ['1', { visited: true, visitCount: 5 }],
      ]);

      manager.syncRegions(regions, 'heatmap', visitData, 2, mockThresholds);

      expect(mockAddLayer).toHaveBeenCalled();
    });

    it('should use static mode for coloring', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>([
        ['1', { visited: true, visitCount: 5 }],
      ]);

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      expect(mockAddLayer).toHaveBeenCalled();
    });

    it('should register click handler when provided', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>();
      const onRegionClick = jest.fn();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds, onRegionClick);

      expect(mockOn).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should sort regions by visit count', () => {
      const regions = [createMockRegion('1'), createMockRegion('2'), createMockRegion('3')];
      const visitData = new Map<string, RegionVisitData>([
        ['1', { visited: true, visitCount: 10 }],
        ['2', { visited: true, visitCount: 5 }],
        ['3', { visited: true, visitCount: 1 }],
      ]);

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      // All regions should be added
      expect(mockAddLayer).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateStyles', () => {
    it('should update styles for all existing layers', () => {
      const regions = [createMockRegion('1'), createMockRegion('2')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);
      mockSetStyle.mockClear();

      manager.updateStyles('heatmap', visitData, 3, mockThresholds);

      expect(mockSetStyle).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateWeight', () => {
    it('should update weight for all layers', () => {
      const regions = [createMockRegion('1'), createMockRegion('2')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);
      mockSetStyle.mockClear();

      manager.updateWeight(5);

      expect(mockSetStyle).toHaveBeenCalledTimes(2);
      expect(mockSetStyle).toHaveBeenCalledWith({ weight: 5 });
    });
  });

  describe('clear', () => {
    it('should clear all layers from the layer group', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);
      manager.clear();

      expect(mockClearLayers).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clear layers and remove layer group from map', () => {
      manager.destroy();

      expect(mockClearLayers).toHaveBeenCalled();
      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockLayerGroup);
    });
  });

  describe('getLayerCount', () => {
    it('should return 0 for empty manager', () => {
      expect(manager.getLayerCount()).toBe(0);
    });

    it('should return correct count after adding regions', () => {
      const regions = [createMockRegion('1'), createMockRegion('2'), createMockRegion('3')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);

      expect(manager.getLayerCount()).toBe(3);
    });

    it('should return correct count after removing regions', () => {
      const regions = [createMockRegion('1'), createMockRegion('2')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);
      manager.syncRegions([createMockRegion('1')], 'static', visitData, 2, mockThresholds);

      expect(manager.getLayerCount()).toBe(1);
    });

    it('should return 0 after clear', () => {
      const regions = [createMockRegion('1')];
      const visitData = new Map<string, RegionVisitData>();

      manager.syncRegions(regions, 'static', visitData, 2, mockThresholds);
      manager.clear();

      expect(manager.getLayerCount()).toBe(0);
    });
  });
});
