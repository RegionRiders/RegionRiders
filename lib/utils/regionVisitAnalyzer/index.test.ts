import {
  analyzeRegionVisits,
  clearBoundingBoxCache,
  clearGeometryCache,
  RegionVisitData,
} from './index';

describe('regionVisitAnalyzer/index', () => {
  it('should export analyzeRegionVisits', () => {
    expect(analyzeRegionVisits).toBeDefined();
    expect(typeof analyzeRegionVisits).toBe('function');
  });

  it('should export clearBoundingBoxCache', () => {
    expect(clearBoundingBoxCache).toBeDefined();
    expect(typeof clearBoundingBoxCache).toBe('function');
  });

  it('should export clearGeometryCache', () => {
    expect(clearGeometryCache).toBeDefined();
    expect(typeof clearGeometryCache).toBe('function');
  });

  it('should export RegionVisitData type', () => {
    const sampleData: RegionVisitData = {
      regionId: 'test-region',
      regionName: 'Test Region',
      visited: false,
      visitCount: 0,
      trackIds: [],
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
    };
    expect(sampleData).toBeDefined();
  });
});
