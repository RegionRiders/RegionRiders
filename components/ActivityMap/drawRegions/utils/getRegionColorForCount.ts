import { REGION_VISIT_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold } from '@/components/ActivityMap/types';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

/**
 * Maps visit count to RGBA color with smooth gradients between thresholds
 * Alpha channel is pre-calculated to avoid multiply operations in style props
 * @param count - Number of times region was visited
 * @param thresholds - Optional custom color thresholds
 * @returns RGBA color tuple [r, g, b, a]
 */
export function getRegionColorForCount(
  count: number,
  thresholds: ColorThreshold[] = REGION_VISIT_COLOR_THRESHOLDS
): number[] {
  return getColorFromThresholds(count, thresholds);
}
