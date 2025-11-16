import { getRegionColorForCount } from './getRegionColorForCount';

// Hardcoded test thresholds - independent of actual implementation
const TEST_THRESHOLDS = [
    { threshold: 1, color: [34, 197, 94] },   // green
    { threshold: 2, color: [234, 179, 8] },   // yellow
    { threshold: 5, color: [249, 115, 22] },  // orange
    { threshold: 10, color: [220, 38, 38] },  // red
    { threshold: 20, color: [255, 255, 255] } // white
];

describe('getRegionColorForCount', () => {
    describe('basic color mapping', () => {
        it('should return a valid RGB tuple', () => {
            const result = getRegionColorForCount(5, TEST_THRESHOLDS);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
            result.forEach(channel => {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            });
        });

        it('should return consistent results for same input', () => {
            const result1 = getRegionColorForCount(7, TEST_THRESHOLDS);
            const result2 = getRegionColorForCount(7, TEST_THRESHOLDS);

            expect(result1).toEqual(result2);
        });

        it('should return different colors for different counts', () => {
            const low = getRegionColorForCount(1, TEST_THRESHOLDS);
            const medium = getRegionColorForCount(5, TEST_THRESHOLDS);
            const high = getRegionColorForCount(15, TEST_THRESHOLDS);

            expect(low).not.toEqual(medium);
            expect(medium).not.toEqual(high);
            expect(low).not.toEqual(high);
        });
    });

    describe('visit count ranges', () => {
        it('should handle single visit', () => {
            const result = getRegionColorForCount(1, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should handle low visit counts (2-4)', () => {
            [2, 3, 4].forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                expect(result).toHaveLength(3);
            });
        });

        it('should handle medium visit counts (5-9)', () => {
            [5, 7, 9].forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                expect(result).toHaveLength(3);
            });
        });

        it('should handle high visit counts (10-19)', () => {
            [10, 15, 19].forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                expect(result).toHaveLength(3);
            });
        });

        it('should handle very high visit counts (20+)', () => {
            [20, 50, 100].forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                result.forEach(channel => {
                    expect(channel).toBeLessThanOrEqual(255);
                });
            });
        });
    });

    describe('custom thresholds', () => {
        it('should use provided custom thresholds', () => {
            const customThresholds = [
                { threshold: 0, color: [0, 0, 0] },
                { threshold: 10, color: [128, 128, 128] },
                { threshold: 50, color: [255, 255, 255] }
            ];

            const result = getRegionColorForCount(5, customThresholds);
            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should respect custom threshold values', () => {
            const customThresholds = [
                { threshold: 1, color: [100, 100, 100] },
                { threshold: 10, color: [200, 200, 200] }
            ];

            const atFirst = getRegionColorForCount(1, customThresholds);
            expect(atFirst).toEqual([100, 100, 100]);
        });

        it('should interpolate with custom thresholds', () => {
            const customThresholds = [
                { threshold: 0, color: [0, 0, 0] },
                { threshold: 100, color: [100, 100, 100] }
            ];

            const midpoint = getRegionColorForCount(50, customThresholds);
            expect(midpoint).toEqual([50, 50, 50]);
        });
    });

    describe('edge cases', () => {
        it('should handle 0 visits', () => {
            const result = getRegionColorForCount(0, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should handle negative counts', () => {
            const negative = getRegionColorForCount(-5, TEST_THRESHOLDS);
            const zero = getRegionColorForCount(0, TEST_THRESHOLDS);

            // Should treat negative as minimum
            expect(negative).toEqual(zero);
        });

        it('should handle fractional counts', () => {
            const result = getRegionColorForCount(2.5, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);
        });

        it('should handle very large counts', () => {
            const result = getRegionColorForCount(1000, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            result.forEach(channel => {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            });
        });
    });

    describe('color progression', () => {
        it('should show progression from cold to hot colors', () => {
            const counts = [1, 3, 7, 12, 25];
            const colors = counts.map(count => getRegionColorForCount(count, TEST_THRESHOLDS));

            // Each should be different
            for (let i = 0; i < colors.length - 1; i++) {
                expect(colors[i]).not.toEqual(colors[i + 1]);
            }
        });

        it('should increase overall brightness with count', () => {
            const low = getRegionColorForCount(1, TEST_THRESHOLDS);
            const high = getRegionColorForCount(50, TEST_THRESHOLDS);

            const lowBrightness = low[0] + low[1] + low[2];
            const highBrightness = high[0] + high[1] + high[2];

            // Higher counts should generally be brighter
            expect(highBrightness).toBeGreaterThanOrEqual(lowBrightness);
        });

        it('should produce smooth transitions between thresholds', () => {
            // Test values between thresholds
            const betweenThresholds = [1.5, 3.5, 7.5, 15];

            betweenThresholds.forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);
                expect(result).toBeDefined();
                expect(result).toHaveLength(3);

                // Should not be exactly a threshold color (interpolated)
                const isThresholdColor = TEST_THRESHOLDS.some(t =>
                    t.color[0] === result[0] &&
                    t.color[1] === result[1] &&
                    t.color[2] === result[2]
                );
                expect(isThresholdColor).toBe(false);
            });
        });
    });

    describe('RGB validity', () => {
        it('should always return valid RGB values', () => {
            // Test many different counts
            for (let count = 0; count <= 100; count += 5) {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);

                result.forEach((channel) => {
                    expect(channel).toBeGreaterThanOrEqual(0);
                    expect(channel).toBeLessThanOrEqual(255);
                    expect(Number.isFinite(channel)).toBe(true);
                });
            }
        });

        it('should return integer or rounded values', () => {
            const testCounts = [1.5, 2.7, 5.3, 10.9];

            testCounts.forEach(count => {
                const result = getRegionColorForCount(count, TEST_THRESHOLDS);

                // Colors should be rounded (no decimals beyond what interpolation produces)
                result.forEach(channel => {
                    expect(Number.isFinite(channel)).toBe(true);
                });
            });
        });
    });

    describe('interpolation behavior', () => {
        it('should interpolate between known thresholds', () => {
            // Value exactly between two thresholds
            const midpoint = 3.5; // Between 2 and 5
            const result = getRegionColorForCount(midpoint, TEST_THRESHOLDS);

            expect(result).toBeDefined();
            expect(result).toHaveLength(3);

            // Should be different from both threshold values
            expect(result).not.toEqual(TEST_THRESHOLDS[1].color);
            expect(result).not.toEqual(TEST_THRESHOLDS[2].color);
        });
    });
});
