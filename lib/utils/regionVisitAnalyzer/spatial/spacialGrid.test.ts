import type { Regions } from '@/lib/types/types';
import { buildSpatialGrid, getAdjacentCells, getGridKey } from './spatialGrid';

describe('spatialGrid', () => {
  describe('getGridKey', () => {
    it('should return correct grid key for positive coordinates', () => {
      expect(getGridKey(5.5, 10.3, 1)).toBe('5,10');
    });

    it('should return correct grid key for negative coordinates', () => {
      expect(getGridKey(-5.5, -10.3, 1)).toBe('-6,-11');
    });

    it('should handle zero coordinates', () => {
      expect(getGridKey(0, 0, 1)).toBe('0,0');
    });

    it('should respect different grid sizes', () => {
      expect(getGridKey(5.5, 10.3, 0.5)).toBe('11,20');
      expect(getGridKey(5.5, 10.3, 2)).toBe('2,5');
    });

    it('should handle boundary cases', () => {
      expect(getGridKey(10.0, 10.0, 1)).toBe('10,10');
      expect(getGridKey(10.9, 10.9, 1)).toBe('10,10');
    });
  });

  describe('getAdjacentCells', () => {
    it('should return 4 adjacent cells for positive coordinates', () => {
      const cells = getAdjacentCells(5.5, 10.3, 1);
      expect(cells).toHaveLength(4);
      expect(cells).toContain('5,10');
      expect(cells).toContain('6,10');
      expect(cells).toContain('5,11');
      expect(cells).toContain('6,11');
    });

    it('should return correct cells for negative coordinates', () => {
      const cells = getAdjacentCells(-5.5, -10.3, 1);
      expect(cells).toHaveLength(4);
      expect(cells).toContain('-6,-11');
      expect(cells).toContain('-5,-11');
      expect(cells).toContain('-6,-10');
      expect(cells).toContain('-5,-10');
    });

    it('should return cells around origin', () => {
      const cells = getAdjacentCells(0.5, 0.5, 1);
      expect(cells).toHaveLength(4);
      expect(cells).toContain('0,0');
      expect(cells).toContain('1,0');
      expect(cells).toContain('0,1');
      expect(cells).toContain('1,1');
    });

    it('should respect different grid sizes', () => {
      const cells = getAdjacentCells(5.5, 10.3, 0.5);
      expect(cells).toHaveLength(4);
      expect(cells).toContain('11,20');
    });
  });

  describe('buildSpatialGrid', () => {
    it('should build grid for single region', () => {
      const regions: Regions[] = [
        {
          id: 'region-1',
          name: 'Test Region',
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
        },
      ];

      const grid = buildSpatialGrid(regions, 1);

      expect(grid.size).toBeGreaterThan(0);
      expect(grid.get('0,0')?.regionIds).toContain('region-1');
    });

    it('should handle multiple regions in same cell', () => {
      const regions: Regions[] = [
        {
          id: 'region-1',
          name: 'Region 1',
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
        },
        {
          id: 'region-2',
          name: 'Region 2',
          country: 'TEST',
          adminLevel: 1,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0.5, 0.5],
                [1.5, 0.5],
                [1.5, 1.5],
                [0.5, 1.5],
                [0.5, 0.5],
              ],
            ],
          },
          properties: {},
        },
      ];

      const grid = buildSpatialGrid(regions, 1);

      // Check overlapping cell has both regions
      const cell = grid.get('0,0');
      expect(cell?.regionIds).toContain('region-1');
      expect(cell?.regionIds).toContain('region-2');
    });

    it('should handle empty regions array', () => {
      const grid = buildSpatialGrid([], 1);
      expect(grid.size).toBe(0);
    });

    it('should handle MultiPolygon geometry', () => {
      const regions: Regions[] = [
        {
          id: 'multi-region',
          name: 'Multi Region',
          country: 'TEST',
          adminLevel: 1,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, 0],
                ],
              ],
              [
                [
                  [5, 5],
                  [6, 5],
                  [6, 6],
                  [5, 6],
                  [5, 5],
                ],
              ],
            ],
          },
          properties: {},
        },
      ];

      const grid = buildSpatialGrid(regions, 1);

      expect(grid.get('0,0')?.regionIds).toContain('multi-region');
      expect(grid.get('5,5')?.regionIds).toContain('multi-region');
    });

    it('should use appropriate grid size', () => {
      const regions: Regions[] = [
        {
          id: 'region-1',
          name: 'Test Region',
          country: 'TEST',
          adminLevel: 1,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0.5, 0],
                [0.5, 0.5],
                [0, 0.5],
                [0, 0],
              ],
            ],
          },
          properties: {},
        },
      ];

      const gridLarge = buildSpatialGrid(regions, 1);
      const gridSmall = buildSpatialGrid(regions, 0.1);

      expect(gridSmall.size).toBeGreaterThan(gridLarge.size);
    });
  });
});
