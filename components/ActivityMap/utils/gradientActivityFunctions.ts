// Hardcoded color thresholds to be replaced by user config later
const COLOR_THRESHOLDS = [
    { count: 1, color: [139, 0, 0] },       // 1: Dark red
    { count: 50, color: [220, 20, 20] },     // 5: Red
    { count: 100, color: [255, 100, 0] },    // 10: Orange-red
    { count: 500, color: [255, 165, 0] },    // 20: Orange
    { count: 1000, color: [255, 255, 0] },    // 50: Yellow
    { count: 2500, color: [255, 255, 255] }, // 200+: White
];

// Fill colors between two colors
function fillGradientColors(
    c1: [number, number, number],
    c2: [number, number, number],
    t: number
): [number, number, number] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

// Color lookup with gradient interpolation
function getColorForCount(count: number): [number, number, number] {
    // Find surrounding thresholds
    for (let i = 0; i < COLOR_THRESHOLDS.length - 1; i++) {
        const lower = COLOR_THRESHOLDS[i];
        const upper = COLOR_THRESHOLDS[i + 1];

        if (count >= lower.count && count < upper.count) {
            // Interpolate between this threshold and next
            const range = upper.count - lower.count;
            const t = (count - lower.count) / range;
            return fillGradientColors(
                lower.color as [number, number, number],
                upper.color as [number, number, number],
                t
            );
        }
    }

    // Beyond highest threshold
    if (count >= COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].count) {
        return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color as [number, number, number];
    }

    // Below lowest threshold
    return [0, 0, 0];
}

export { getColorForCount };