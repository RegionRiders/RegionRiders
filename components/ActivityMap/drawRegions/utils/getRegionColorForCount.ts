export const VISIT_THRESHOLDS = [
    { visits: 1, color: [34, 197, 94] },   // green
    { visits: 2, color: [234, 179, 8] },   // yellow
    { visits: 5, color: [249, 115, 22] },  // orange
    { visits: 10, color: [220, 38, 38] },  // red
    { visits: 20, color: [255, 255, 255] } // white
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
 * maps visit count to rgb color with smooth gradients between thresholds
 *
 * @param count - number of times region was visited
 * @returns rgb tuple [r, g, b]
 */
export function getRegionColorForCount(count: number): [number, number, number] {
    // below minimum: use the first color
    if (count <= VISIT_THRESHOLDS[0].visits) {
        return VISIT_THRESHOLDS[0].color as [number, number, number];
    }

    // above maximum: use last color
    if (count >= VISIT_THRESHOLDS[VISIT_THRESHOLDS.length - 1].visits) {
        return VISIT_THRESHOLDS[VISIT_THRESHOLDS.length - 1].color as [number, number, number];
    }

    // find which threshold range count falls into and interpolate
    for (let i = 0; i < VISIT_THRESHOLDS.length - 1; i++) {
        const lower = VISIT_THRESHOLDS[i];
        const upper = VISIT_THRESHOLDS[i + 1];

        if (count >= lower.visits && count <= upper.visits) {
            const range = upper.visits - lower.visits;
            const t = range === 0 ? 0 : (count - lower.visits) / range;
            return fadeColor(lower.color, upper.color, t) as [number, number, number];
        }
    }

    return VISIT_THRESHOLDS[VISIT_THRESHOLDS.length - 1].color as [number, number, number];
}
