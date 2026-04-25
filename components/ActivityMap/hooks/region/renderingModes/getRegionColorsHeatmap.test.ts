import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { getRegionColorsHeatmap } from './getRegionColorsHeatmap';

describe('getRegionColorsHeatmap', () => {
  const mockThresholds: ColorThreshold[] = [
    { threshold: 0, color: [60, 60, 60, 0] },
    { threshold: 1, color: [220, 20, 20, 0.1] },
    { threshold: 5, color: [255, 165, 0, 0.1] },
    { threshold: 10, color: [255, 255, 0, 0.1] },
  ];

  const mockGeometry = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  };

  const createMockVisit = (
    visited: boolean,
    visitCount: number,
    id = 'region-1'
  ): RegionVisitData => ({
    regionId: id,
    regionName: `Region ${id}`,
    visited,
    visitCount,
    trackIds: ['track-1'],
    geometry: mockGeometry,
  });

  it('should return transparent color for undefined visit', () => {
    const result = getRegionColorsHeatmap(undefined, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return transparent color for visit with visited false', () => {
    const visit = createMockVisit(false, 0);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return transparent color for visit with visitCount 0', () => {
    const visit = createMockVisit(true, 0);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for visit count of 1', () => {
    const visit = createMockVisit(true, 1);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('220');
    expect(result.fillColor).toContain('20');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for visit count of 5', () => {
    const visit = createMockVisit(true, 5);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('255');
    expect(result.fillColor).toContain('165');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for high visit count', () => {
    const visit = createMockVisit(true, 10);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('255');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should use default thresholds when not provided', () => {
    const visit = createMockVisit(true, 3);

    const result = getRegionColorsHeatmap(visit);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return stroke color with full opacity', () => {
    const visit = createMockVisit(true, 5);

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.strokeColor).toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*1\)/);
  });

  it('should handle visit with undefined visitCount', () => {
    const visit = {
      regionId: 'region-1',
      regionName: 'Region 1',
      visited: true,
      trackIds: ['track-1'],
      geometry: mockGeometry,
    } as RegionVisitData;

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });
});
