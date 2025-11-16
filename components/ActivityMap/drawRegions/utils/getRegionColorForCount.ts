import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

export const VISIT_THRESHOLDS = [
    { threshold: 1, color: [34, 197, 94] },   // green
    { threshold: 2, color: [234, 179, 8] },   // yellow
    { threshold: 5, color: [249, 115, 22] },  // orange
    { threshold: 10, color: [220, 38, 38] },  // red
    { threshold: 20, color: [255, 255, 255] }, // white
];

/**
 * Maps visit count to RGB color with smooth gradients between thresholds
 * @param count - Number of times region was visited
 * @param thresholds - Optional custom color thresholds (defaults to VISIT_THRESHOLDS)
 * @returns RGB tuple [r, g, b]
 */
export function getRegionColorForCount(
    count: number,
    thresholds: Array<{ threshold: number; color: number[] }> = VISIT_THRESHOLDS
): [number, number, number] {
    return getColorFromThresholds(count, thresholds);
}
