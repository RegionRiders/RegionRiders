import {
  lngLatToMercator,
  packTracksForHeatmap,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import { GPXTrack } from '@/lib/types';

describe('heatmapGeometryPacker', () => {
  it('converts lng/lat to normalized Web Mercator [0..1] coordinates', () => {
    const [x0, y0] = lngLatToMercator(0, 0);
    expect(x0).toBeCloseTo(0.5, 6);
    expect(y0).toBeCloseTo(0.5, 6);

    const [xGdansk, yGdansk] = lngLatToMercator(18.656686, 54.352375);
    expect(xGdansk).toBeGreaterThan(0.5);
    expect(xGdansk).toBeLessThan(0.6);
    expect(yGdansk).toBeGreaterThan(0.25);
    expect(yGdansk).toBeLessThan(0.35);
  });

  it('packs multi-point tracks into [x0, y0, x1, y1] segments and decimates lowZoom LOD', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Ride 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.35001, lon: 18.65001 }, // very close -> skipped in lowZoom
            { lat: 54.36, lon: 18.66 },
          ],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(2);
    expect(packed.fullSegments).toHaveLength(8);
    expect(packed.lowZoomSegmentCount).toBe(1);
  });

  it('preserves single-point tracks as zero-length segments for visible capsule rendering (#165)', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'dot-track',
        {
          id: 'dot-track',
          name: 'Dot',
          points: [{ lat: 54.35, lon: 18.65 }],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(1);
    expect(packed.fullSegments[0]).toBeCloseTo(packed.fullSegments[2], 6);
    expect(packed.fullSegments[1]).toBeCloseTo(packed.fullSegments[3], 6);
  });
});
