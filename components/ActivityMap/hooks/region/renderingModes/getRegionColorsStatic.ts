import { REGION_VISIT_STATIC_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export function getRegionColorsStatic(
  visit: RegionVisitData | undefined,
  thresholds: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS
) {
  const visited = !!visit?.visited && (visit?.visitCount ?? 0) > 0;

  let color: RGBA;
  if (!visited) {
    color = thresholds[0].color;
  } else {
    color = thresholds[1].color;
  }

  const [r, g, b, a] = color;

  return {
    fillColor: `rgba(${r},${g},${b},${a})`,
    strokeColor: `rgba(${r},${g},${b},1)`,
  };
}
