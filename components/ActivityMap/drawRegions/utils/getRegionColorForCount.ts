export const VISIT_THRESHOLDS = [
    { visits: 1, color: [34, 197, 94] },   // Green
    { visits: 2, color: [234, 179, 8] },   // Yellow
    { visits: 5, color: [249, 115, 22] },  // Orange
    { visits: 10, color: [220, 38, 38] },  // Red
    { visits: 20, color: [255, 255, 255] } // White cap
];

function fadeColor(c1: number[], c2: number[], t: number): number[] {
    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

export function getRegionColorForCount(count: number): [number, number, number] {
    if (count <= VISIT_THRESHOLDS[0].visits) return VISIT_THRESHOLDS[0].color as [number, number, number];
    if (count >= VISIT_THRESHOLDS[VISIT_THRESHOLDS.length - 1].visits)
        return VISIT_THRESHOLDS[VISIT_THRESHOLDS.length - 1].color as [number, number, number];

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
