import { getHeatmapColorForCount } from './getHeatmapColorForCount';

const TEST_THRESHOLDS = [
    { threshold: 1, color: [139, 0, 0] },      // dark red
    { threshold: 2, color: [220, 20, 20] },    // red
    { threshold: 10, color: [255, 100, 0] },   // orange-red
    { threshold: 25, color: [255, 165, 0] },   // orange
    { threshold: 50, color: [255, 255, 0] },   // yellow
    { threshold: 150, color: [255, 255, 255] } // white
];

describe('getHeatmapColorForCount', () => {
    describe('basic color mapping', () => {
        it('should return a valid RGB array', () => {
            const result = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
            result.forEach(channel => {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            });
        });

        it('should return darker colors for low counts', () => {
            const lowCount = getHeatmapColorForCount(1, 10, 1, TEST_THRESHOLDS);
            const highCount = getHeatmapColorForCount(100, 10, 1, TEST_THRESHOLDS);

            // High count should have higher total RGB value (brighter)
            const lowTotal = lowCount[0] + lowCount[1] + lowCount[2];
            const highTotal = highCount[0] + highCount[1] + highCount[2];
            expect(highTotal).toBeGreaterThan(lowTotal);
        });

        it('should return consistent results for same input', () => {
            const result1 = getHeatmapColorForCount(15, 10, 2, TEST_THRESHOLDS);
            const result2 = getHeatmapColorForCount(15, 10, 2, TEST_THRESHOLDS);

            expect(result1).toEqual(result2);
        });
    });

    describe('line thickness normalization', () => {
        it('should normalize by line thickness', () => {
            // With thickness=1, count=10 represents 10 unique activities
            const thin = getHeatmapColorForCount(10, 10, 1, TEST_THRESHOLDS);

            // With thickness=5, count=50 also represents 10 unique activities (50 / (5*2))
            const thick = getHeatmapColorForCount(50, 10, 5, TEST_THRESHOLDS);

            // Should produce similar colors
            expect(Math.abs(thin[0] - thick[0])).toBeLessThan(50);
            expect(Math.abs(thin[1] - thick[1])).toBeLessThan(50);
            expect(Math.abs(thin[2] - thick[2])).toBeLessThan(50);
        });

        it('should handle thickness of 1', () => {
            const result = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);
            expect(result).toBeDefined();
            expect(result[0]).toBeGreaterThanOrEqual(0);
        });

        it('should handle large thickness values', () => {
            const result = getHeatmapColorForCount(100, 10, 10, TEST_THRESHOLDS);
            expect(result).toBeDefined();
            result.forEach(channel => {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            });
        });
    });

    describe('zoom level adjustment', () => {
        it('should amplify effect at higher zoom levels', () => {
            const lowZoom = getHeatmapColorForCount(10, 5, 1, TEST_THRESHOLDS);
            const highZoom = getHeatmapColorForCount(10, 15, 1, TEST_THRESHOLDS);

            // Higher zoom should result in different (generally brighter) colors
            expect(lowZoom).not.toEqual(highZoom);
        });

        it('should use default zoom when not provided', () => {
            const withDefault = getHeatmapColorForCount(5, undefined, undefined, TEST_THRESHOLDS);
            const withExplicit = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);

            expect(withDefault).toEqual(withExplicit);
        });

        it('should handle extreme zoom values', () => {
            const veryLowZoom = getHeatmapColorForCount(10, 1, 1, TEST_THRESHOLDS);
            const veryHighZoom = getHeatmapColorForCount(10, 20, 1, TEST_THRESHOLDS);

            expect(veryLowZoom).toBeDefined();
            expect(veryHighZoom).toBeDefined();
        });
    });

    describe('custom thresholds', () => {
        it('should use provided custom thresholds', () => {
            const customThresholds = [
                { threshold: 0, color: [0, 0, 0] },
                { threshold: 50, color: [255, 255, 255] }
            ];

            const result = getHeatmapColorForCount(5, 10, 1, customThresholds);
            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should respect custom threshold values', () => {
            const customThresholds = [
                { threshold: 1, color: [100, 100, 100] },
                { threshold: 10, color: [200, 200, 200] }
            ];

            const atFirst = getHeatmapColorForCount(1, 10, 1, customThresholds);
            expect(atFirst).toEqual([100, 100, 100]);
        });
    });

    describe('edge cases', () => {
        it('should handle count of 0', () => {
            const result = getHeatmapColorForCount(0, 10, 1, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should handle very high counts', () => {
            const result = getHeatmapColorForCount(10000, 10, 1, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            result.forEach(channel => {
                expect(channel).toBeLessThanOrEqual(255);
            });
        });

        it('should handle fractional counts', () => {
            const result = getHeatmapColorForCount(2.5, 10, 1, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should handle negative counts as minimum', () => {
            const negative = getHeatmapColorForCount(-5, 10, 1, TEST_THRESHOLDS);
            const zero = getHeatmapColorForCount(0, 10, 1, TEST_THRESHOLDS);

            expect(negative).toEqual(zero);
        });
    });

    describe('color progression', () => {
        it('should show gradual color change across counts', () => {
            const colors = [
                getHeatmapColorForCount(1, 10, 1, TEST_THRESHOLDS),
                getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS),
                getHeatmapColorForCount(15, 10, 1, TEST_THRESHOLDS),
                getHeatmapColorForCount(50, 10, 1, TEST_THRESHOLDS),
                getHeatmapColorForCount(150, 10, 1, TEST_THRESHOLDS),
            ];

            // Each step should produce a different color
            for (let i = 0; i < colors.length - 1; i++) {
                expect(colors[i]).not.toEqual(colors[i + 1]);
            }
        });

        it('should maintain RGB validity throughout progression', () => {
            for (let count = 0; count <= 200; count += 10) {
                const result = getHeatmapColorForCount(count, 10, 1, TEST_THRESHOLDS);
                result.forEach(channel => {
                    expect(channel).toBeGreaterThanOrEqual(0);
                    expect(channel).toBeLessThanOrEqual(255);
                });
            }
        });
    });

    describe('parameter combinations', () => {
        it('should handle various parameter combinations', () => {
            const combinations: Array<[number, number, number]> = [
                [1, 5, 1],
                [10, 10, 2],
                [50, 15, 5],
                [100, 8, 3],
                [200, 12, 10],
            ];

            combinations.forEach(([count, zoom, thickness]) => {
                const result = getHeatmapColorForCount(count, zoom, thickness, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                expect(result).toHaveLength(3);
            });
        });
    });
});
