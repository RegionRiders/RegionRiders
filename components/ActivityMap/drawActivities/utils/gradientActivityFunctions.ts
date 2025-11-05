export const COLOR_THRESHOLDS = [
    { uniqueActivities: 1, color: [139, 0, 0] },       // Dark red (any activity)
    { uniqueActivities: 2, color: [220, 20, 20] },     // Red (1-2 distinct)
    { uniqueActivities: 10, color: [255, 100, 0] },     // Orange-red (2-3 distinct)
    { uniqueActivities: 50, color: [255, 165, 0] },       // Orange (3-7 distinct)
    { uniqueActivities: 150, color: [255, 255, 0] },      // Yellow (7-13 distinct)
    { uniqueActivities: 200, color: [255, 255, 255] },    // White (40+ distinct)
];

function lerpColor(c1: number[], c2: number[], t: number): number[] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

export function getColorForCount(count: number, lineThickness= 1): number[] {
    // account for thickness doubling the count
    const uniqueActivities = count / (lineThickness * 2);

    if (uniqueActivities <= COLOR_THRESHOLDS[0].uniqueActivities) {
        return COLOR_THRESHOLDS[0].color;
    }

    if (uniqueActivities >= COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].uniqueActivities) {
        return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
    }

    for (let i = 0; i < COLOR_THRESHOLDS.length - 1; i++) {
        const lower = COLOR_THRESHOLDS[i];
        const upper = COLOR_THRESHOLDS[i + 1];

        if (uniqueActivities >= lower.uniqueActivities && uniqueActivities <= upper.uniqueActivities) {
            const range = upper.uniqueActivities - lower.uniqueActivities;
            const t = range === 0 ? 0 : (uniqueActivities - lower.uniqueActivities) / range;
            return lerpColor(lower.color, upper.color, t);
        }
    }

    return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
}