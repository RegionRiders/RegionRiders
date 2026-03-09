import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { getRegionColorsStatic } from './getRegionColorsStatic';

describe('getRegionColorsStatic', () => {
  const mockThresholds: ColorThreshold[] = [
    { threshold: 0, color: [60, 60, 60, 0] },
    { threshold: 1, color: [76, 107, 34, 0.2] },
  ];

  it('should return unvisited color for undefined visit', () => {
    const result = getRegionColorsStatic(undefined, mockThresholds);

    expect(result.fillColor).toBe('rgba(60,60,60,0)');
    expect(result.strokeColor).toBe('rgba(60,60,60,1)');
  });

  it('should return unvisited color for visit with visited false', () => {
    const visit: RegionVisitData = {
      visited: false,
      visitCount: 0,
    };

    const result = getRegionColorsStatic(visit, mockThresholds);

    expect(result.fillColor).toBe('rgba(60,60,60,0)');
    expect(result.strokeColor).toBe('rgba(60,60,60,1)');
  });

  it('should return unvisited color for visit with visitCount 0', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 0,
    };

    const result = getRegionColorsStatic(visit, mockThresholds);

    expect(result.fillColor).toBe('rgba(60,60,60,0)');
    expect(result.strokeColor).toBe('rgba(60,60,60,1)');
  });

  it('should return visited color for visit with visitCount > 0', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 1,
    };

    const result = getRegionColorsStatic(visit, mockThresholds);

    expect(result.fillColor).toBe('rgba(76,107,34,0.2)');
    expect(result.strokeColor).toBe('rgba(76,107,34,1)');
  });

  it('should return visited color for high visit count', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 100,
    };

    const result = getRegionColorsStatic(visit, mockThresholds);

    expect(result.fillColor).toBe('rgba(76,107,34,0.2)');
    expect(result.strokeColor).toBe('rgba(76,107,34,1)');
  });

  it('should use default thresholds when not provided', () => {
    const visit: RegionVisitData = {
      visited: true,
      visitCount: 5,
    };

    const result = getRegionColorsStatic(visit);

    expect(result.fillColor).toContain('rgba');
    expect(result.strokeColor).toContain('rgba');
  });

  it('should handle visit with undefined visitCount', () => {
    const visit = {
      visited: true,
    } as RegionVisitData;

    const result = getRegionColorsStatic(visit, mockThresholds);

    // visitCount is undefined, so 0 is used, which means unvisited
    expect(result.fillColor).toBe('rgba(60,60,60,0)');
    expect(result.strokeColor).toBe('rgba(60,60,60,1)');
  });

  it('should handle visit with visited false but visitCount > 0', () => {
    const visit: RegionVisitData = {
      visited: false,
      visitCount: 5,
    };

    const result = getRegionColorsStatic(visit, mockThresholds);

    // visited is false, so unvisited color is returned
    expect(result.fillColor).toBe('rgba(60,60,60,0)');
    expect(result.strokeColor).toBe('rgba(60,60,60,1)');
  });
});
