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

  it('should return transparent color for undefined visit', () => {
    const result = getRegionColorsHeatmap(undefined, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return transparent color for visit with visited false', () => {
    const visit: RegionVisitData = {
      visited: false,
      visitCount: 0,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return transparent color for visit with visitCount 0', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 0,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for visit count of 1', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 1,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('220');
    expect(result.fillColor).toContain('20');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for visit count of 5', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 5,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('255');
    expect(result.fillColor).toContain('165');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return correct color for high visit count', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 10,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('255');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should use default thresholds when not provided', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 3,
    };

    const result = getRegionColorsHeatmap(visit);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should return stroke color with full opacity', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 5,
    };

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.strokeColor).toMatch(/rgba\(\d+,\d+,\d+,1\)/);
  });

  it('should handle visit with undefined visitCount', () => {
    const visit = {
      visited: true,
    } as RegionVisitData;

    const result = getRegionColorsHeatmap(visit, mockThresholds);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });
});
