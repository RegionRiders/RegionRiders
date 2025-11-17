import { clearGeometryCache, pointInPolygon } from './index';

describe('regionVisitAnalyzer/geometry/index', () => {
  it('should export pointInPolygon', () => {
    expect(pointInPolygon).toBeDefined();
    expect(typeof pointInPolygon).toBe('function');
  });

  it('should export clearGeometryCache', () => {
    expect(clearGeometryCache).toBeDefined();
    expect(typeof clearGeometryCache).toBe('function');
  });
});
