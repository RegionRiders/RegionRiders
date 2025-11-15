/**
 * Shared color interpolation utilities for regions and activities
 */

/**
 * Linear interpolation between two RGB colors
 * @param c1 - First color as [r, g, b]
 * @param c2 - Second color as [r, g, b]
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated RGB color
 */
export function interpolateRgb(
    c1: number[],
    c2: number[],
    t: number
): number[] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

/**
 * Generic threshold-based color mapping
 * @param value - Input value to map
 * @param thresholds - Array of {threshold, color} objects
 * @returns RGB color as [r, g, b]
 */
export function getColorFromThresholds<T extends { threshold: number; color: number[] }>(
    value: number,
    thresholds: T[]
): [number, number, number] {
    // Below minimum: use first color
    if (value <= thresholds[0].threshold) {
        return thresholds[0].color as [number, number, number];
    }

    // Above maximum: use last color
    if (value >= thresholds[thresholds.length - 1].threshold) {
        return thresholds[thresholds.length - 1].color as [number, number, number];
    }

    // Find threshold range and interpolate
    for (let i = 0; i < thresholds.length - 1; i++) {
        const lower = thresholds[i];
        const upper = thresholds[i + 1];

        if (value >= lower.threshold && value <= upper.threshold) {
            const range = upper.threshold - lower.threshold;
            const t = range === 0 ? 0 : (value - lower.threshold) / range;
            return interpolateRgb(lower.color, upper.color, t) as [number, number, number];
        }
    }

    return thresholds[thresholds.length - 1].color as [number, number, number];
}
