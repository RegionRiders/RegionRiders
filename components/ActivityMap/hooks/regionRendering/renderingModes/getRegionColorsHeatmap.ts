import { REGION_VISIT_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export function getRegionColorsHeatmap(
  visit: RegionVisitData | undefined,
  thresholds: ColorThreshold[] = REGION_VISIT_COLOR_THRESHOLDS
) {
  const visited = !!visit?.visited && (visit?.visitCount ?? 0) > 0;
  const count = visited ? visit.visitCount : 0;

  const [r, g, b, a] = getColorFromThresholds(count, thresholds);

  return {
    fillColor: `rgba(${r},${g},${b},${a})`,
    strokeColor: `rgba(${r},${g},${b},1)`,
  };
}
