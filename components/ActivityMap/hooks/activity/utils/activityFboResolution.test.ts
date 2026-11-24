import { computeActivityFboResolution } from '@/components/ActivityMap/hooks/activity/utils/activityFboResolution';

describe('activityFboResolution', () => {
  it('uses up to 2.0x DPR and 2560px cap on desktop for heatmap and lines', () => {
    const desktop1x = computeActivityFboResolution(800, 600, 4096, 'heatmap', {
      dpr: 1,
      isMobile: false,
    });
    expect(desktop1x).toEqual({
      width: 800,
      height: 600,
      effectiveScale: 1,
      maxTextureDim: 2560,
      isMobile: false,
    });

    const desktopRetina = computeActivityFboResolution(1600, 900, 4096, 'heatmap', {
      dpr: 2,
      isMobile: false,
    });
    expect(desktopRetina.width).toBe(2560);
    expect(desktopRetina.height).toBe(1440);
    expect(desktopRetina.maxTextureDim).toBe(2560);
  });

  it('caps mobile heatmap at 1.5x DPR and 1600px while allowing mobile lines up to 2.0x DPR and 1920px', () => {
    const mobileHeatmap = computeActivityFboResolution(412, 915, 4096, 'heatmap', {
      dpr: 3,
      isMobile: true,
    });
    expect(mobileHeatmap.width).toBe(618);
    expect(mobileHeatmap.height).toBe(1373);
    expect(mobileHeatmap.effectiveScale).toBeCloseTo(1.5, 2);
    expect(mobileHeatmap.maxTextureDim).toBe(1600);

    const mobileLines = computeActivityFboResolution(412, 915, 4096, 'lines', {
      dpr: 3,
      isMobile: true,
    });
    expect(mobileLines.width).toBe(824);
    expect(mobileLines.height).toBe(1830);
    expect(mobileLines.effectiveScale).toBeCloseTo(2.0, 2);
    expect(mobileLines.maxTextureDim).toBe(1920);
  });

  it('respects smaller GPU MAX_TEXTURE_SIZE limits', () => {
    const constrained = computeActivityFboResolution(1000, 500, 1024, 'lines', {
      dpr: 2,
      isMobile: false,
    });
    expect(constrained.width).toBe(1024);
    expect(constrained.height).toBe(512);
    expect(constrained.maxTextureDim).toBe(1024);
  });
});
