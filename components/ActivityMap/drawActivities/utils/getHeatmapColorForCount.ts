export const COLOR_THRESHOLDS = [
    { uniqueActivities: 1, color: [139, 0, 0] },             // Dark red
    { uniqueActivities: 2, color: [220, 20, 20] },           // Red
    { uniqueActivities: 10, color: [255, 100, 0] },          // Orange-red
    { uniqueActivities: 50, color: [255, 165, 0] },          // Orange
    { uniqueActivities: 150, color: [255, 255, 0] },         // Yellow
    { uniqueActivities: 200, color: [255, 255, 255] },       // White
];

function fadeColor(c1: number[], c2: number[], t: number): number[] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

export function getHeatmapColorForCount(count: number, lineThickness= 1): number[] {
    // account for thickness on both sides of the line
    const uniqueActivities = count / (lineThickness * 2);

    // if below the lowest value, set to the lowest value
    if (uniqueActivities <= COLOR_THRESHOLDS[0].uniqueActivities) {
        return COLOR_THRESHOLDS[0].color;
    }
    // if above the highest value, set to the highest value
    if (uniqueActivities >= COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].uniqueActivities) {
        return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
    }

    for (let i = 0; i < COLOR_THRESHOLDS.length - 1; i++) {
        const lower = COLOR_THRESHOLDS[i];
        const upper = COLOR_THRESHOLDS[i + 1];

        // set to the color between the two thresholds
        if (uniqueActivities >= lower.uniqueActivities && uniqueActivities <= upper.uniqueActivities) {
            const range = upper.uniqueActivities - lower.uniqueActivities;
            const t = range === 0 ? 0 : (uniqueActivities - lower.uniqueActivities) / range;
            return fadeColor(lower.color, upper.color, t);
        }
    }

    // Fallback (should not reach here)
    return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
}