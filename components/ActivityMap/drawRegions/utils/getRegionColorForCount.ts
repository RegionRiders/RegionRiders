import { REGION_VISIT_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

/**
 * Maps visit count to RGB color with smooth gradients between thresholds
 * @param count - Number of times region was visited
 * @param thresholds - Optional custom color thresholds (defaults to VISIT_THRESHOLDS)
 * @returns RGB tuple [r, g, b]
 */
export function getRegionColorForCount(
  count: number,
  thresholds: Array<{ threshold: number; color: number[] }> = REGION_VISIT_COLOR_THRESHOLDS
): [number, number, number] {
  return getColorFromThresholds(count, thresholds);
}
