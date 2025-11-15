import { buildSpatialGrid, getGridKey, getAdjacentCells } from './spatialGrid';
import { Regions } from '@/lib/types/types';

describe('spatialGrid', () => {
  const createRegion = (id: string, coords: number[][]): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'PL',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  });

  describe('buildSpatialGrid', () => {
    it('should build grid with regions in correct cells', () => {
      const regions: Regions[] = [
        createRegion('r1', [
          [20.0, 50.0],
          [20.5, 50.0],
          [20.5, 50.5],
          [20.0, 50.5],
          [20.0, 50.0],
        ]),
      ];

      const grid = buildSpatialGrid(regions, 1.0);

      expect(grid.size).toBeGreaterThan(0);
      expect(grid.get('50,20')?.regionIds).toContain('r1');
    });

    it('should handle regions spanning multiple cells', () => {
      const regions: Regions[] = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.5, 50.0],
          [21.5, 51.5],
          [20.0, 51.5],
          [20.0, 50.0],
        ]),
      ];

      const grid = buildSpatialGrid(regions, 1.0);

      // Region should appear in multiple cells
      expect(grid.size).toBeGreaterThan(1);
      expect(grid.get('50,20')?.regionIds).toContain('r1');
      expect(grid.get('51,21')?.regionIds).toContain('r1');
    });

    it('should handle multiple regions in same cell', () => {
      const regions: Regions[] = [
        createRegion('r1', [
          [20.0, 50.0],
          [20.2, 50.0],
          [20.2, 50.2],
          [20.0, 50.2],
          [20.0, 50.0],
        ]),
        createRegion('r2', [
          [20.1, 50.1],
          [20.3, 50.1],
          [20.3, 50.3],
          [20.1, 50.3],
          [20.1, 50.1],
        ]),
      ];

      const grid = buildSpatialGrid(regions, 1.0);

      const cell = grid.get('50,20');
      expect(cell?.regionIds).toContain('r1');
      expect(cell?.regionIds).toContain('r2');
    });

    it('should respect grid size parameter', () => {
      const regions: Regions[] = [
        createRegion('r1', [
          [0.0, 0.0],
          [0.5, 0.0],
          [0.5, 0.5],
          [0.0, 0.5],
          [0.0, 0.0],
        ]),
      ];

      const grid = buildSpatialGrid(regions, 0.1);

      // With smaller grid size, should have more cells
      expect(grid.size).toBeGreaterThan(1);
    });

    it('should handle empty regions array', () => {
      const grid = buildSpatialGrid([], 1.0);

      expect(grid.size).toBe(0);
    });

    it('should handle regions with negative coordinates', () => {
      const regions: Regions[] = [
        createRegion('r1', [
          [-10.0, -20.0],
          [-9.5, -20.0],
          [-9.5, -19.5],
          [-10.0, -19.5],
          [-10.0, -20.0],
        ]),
      ];

      const grid = buildSpatialGrid(regions, 1.0);

      expect(grid.size).toBeGreaterThan(0);
      expect(grid.get('-20,-10')?.regionIds).toContain('r1');
    });
  });

  describe('getGridKey', () => {
    it('should generate correct grid key', () => {
      const key = getGridKey(50.5, 20.5, 1.0);
      expect(key).toBe('50,20');
    });

    it('should handle negative coordinates', () => {
      const key = getGridKey(-50.5, -20.5, 1.0);
      expect(key).toBe('-51,-21');
    });

    it('should respect grid size', () => {
      const key1 = getGridKey(50.05, 20.05, 0.1);
      const key2 = getGridKey(50.15, 20.15, 0.1);

      expect(key1).toBe('500,200');
      expect(key2).toBe('501,201');
    });

    it('should handle coordinates at grid boundaries', () => {
      const key = getGridKey(50.0, 20.0, 1.0);
      expect(key).toBe('50,20');
    });

    it('should floor coordinates correctly', () => {
      const key1 = getGridKey(50.1, 20.1, 1.0);
      const key2 = getGridKey(50.9, 20.9, 1.0);

      expect(key1).toBe('50,20');
      expect(key2).toBe('50,20');
    });
  });

  describe('getAdjacentCells', () => {
    it('should return 4 adjacent cells', () => {
      const cells = getAdjacentCells(50.5, 20.5, 1.0);

      expect(cells).toHaveLength(4);
      expect(cells).toContain('50,20');
      expect(cells).toContain('51,20');
      expect(cells).toContain('50,21');
      expect(cells).toContain('51,21');
    });

    it('should include current cell in adjacent cells', () => {
      const cells = getAdjacentCells(50.5, 20.5, 1.0);

      expect(cells).toContain('50,20'); // Current cell
    });

    it('should handle negative coordinates', () => {
      const cells = getAdjacentCells(-50.5, -20.5, 1.0);

      expect(cells).toHaveLength(4);
      expect(cells).toContain('-51,-21');
      expect(cells).toContain('-50,-21');
      expect(cells).toContain('-51,-20');
      expect(cells).toContain('-50,-20');
    });

    it('should respect grid size', () => {
      const cells = getAdjacentCells(50.05, 20.05, 0.1);

      expect(cells).toHaveLength(4);
      expect(cells).toContain('500,200');
      expect(cells).toContain('501,200');
      expect(cells).toContain('500,201');
      expect(cells).toContain('501,201');
    });

    it('should handle point at grid boundary', () => {
      const cells = getAdjacentCells(50.0, 20.0, 1.0);

      expect(cells).toHaveLength(4);
      expect(cells).toContain('50,20');
    });
  });
});