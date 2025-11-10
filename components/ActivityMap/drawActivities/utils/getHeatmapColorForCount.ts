export const COLOR_THRESHOLDS = [
    { uniqueActivities: 1, color: [139, 0, 0] },   // dark red
    { uniqueActivities: 2, color: [220, 20, 20] },  // red
    { uniqueActivities: 10, color: [255, 100, 0] }, // orange-red
    { uniqueActivities: 50, color: [255, 165, 0] }, // orange
    { uniqueActivities: 150, color: [255, 255, 0] }, // yellow
    { uniqueActivities: 200, color: [255, 255, 255] } // white
];

// linear interpolation between two rgb colors
function fadeColor(c1: number[], c2: number[], t: number): number[] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

/**
 * maps accumulator count to heatmap color with smooth gradients
 * accounts for line thickness to normalize unique activity count
 *
 * @param count - pixel accumulator value
 * @param lineThickness - thickness of drawn lines
 * @returns rgb tuple [r, g, b]
 */
export function getHeatmapColorForCount(count: number, lineThickness = 1): number[] {
    // normalize for line thickness (both sides of the line)
    const uniqueActivities = count / (lineThickness * 2);

    // below minimum: use the first color
    if (uniqueActivities <= COLOR_THRESHOLDS[0].uniqueActivities) {
        return COLOR_THRESHOLDS[0].color;
    }

    // above maximum: use last color
    if (uniqueActivities >= COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].uniqueActivities) {
        return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
    }

    // find a threshold range and interpolate
    for (let i = 0; i < COLOR_THRESHOLDS.length - 1; i++) {
        const lower = COLOR_THRESHOLDS[i];
        const upper = COLOR_THRESHOLDS[i + 1];

        if (uniqueActivities >= lower.uniqueActivities && uniqueActivities <= upper.uniqueActivities) {
            const range = upper.uniqueActivities - lower.uniqueActivities;
            const t = range === 0 ? 0 : (uniqueActivities - lower.uniqueActivities) / range;
            return fadeColor(lower.color, upper.color, t);
        }
    }

    return COLOR_THRESHOLDS[COLOR_THRESHOLDS.length - 1].color;
}
