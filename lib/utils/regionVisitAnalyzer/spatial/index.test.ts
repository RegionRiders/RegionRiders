import { buildSpatialGrid, clearBoundingBoxCache, getAdjacentCells, getGridKey } from './index';

describe('regionVisitAnalyzer/spatial/index', () => {
  it('should export buildSpatialGrid', () => {
    expect(buildSpatialGrid).toBeDefined();
    expect(typeof buildSpatialGrid).toBe('function');
  });

  it('should export getGridKey', () => {
    expect(getGridKey).toBeDefined();
    expect(typeof getGridKey).toBe('function');
  });

  it('should export getAdjacentCells', () => {
    expect(getAdjacentCells).toBeDefined();
    expect(typeof getAdjacentCells).toBe('function');
  });

  it('should export clearBoundingBoxCache', () => {
    expect(clearBoundingBoxCache).toBeDefined();
    expect(typeof clearBoundingBoxCache).toBe('function');
  });
});
