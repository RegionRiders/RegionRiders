import {
  DEFAULT_CHANNELS_PER_BATCH,
  FLOATS_PER_PACKED_SEGMENT,
  lngLatToMercator,
  packTracksForHeatmap,
  splitFloat64,
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

  it('splits 64-bit Mercator coordinates into Double-Single (hi + lo) float32 pairs with sub-millimeter precision', () => {
    const [x, y] = lngLatToMercator(18.656686123, 54.352375987);
    const [xHi, xLo] = splitFloat64(x);
    const [yHi, yLo] = splitFloat64(y);

    expect(Math.abs(xHi + xLo - x)).toBeLessThan(1e-12);
    expect(Math.abs(yHi + yLo - y)).toBeLessThan(1e-12);
  });

  it('packs multi-point tracks into 9-float segments with MRT channel index and batch metadata across 3 LOD tiers', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Ride 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.3502, lon: 18.6502 }, // included in fullSegments, skipped in medium/low
            { lat: 54.3525, lon: 18.6525 }, // included in mediumZoomSegments, skipped in low
            { lat: 54.38, lon: 18.68 }, // included in all tiers
          ],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.channelsPerBatch).toBe(DEFAULT_CHANNELS_PER_BATCH);
    expect(packed.fullSegmentCount).toBe(3);
    expect(packed.fullSegments).toHaveLength(3 * FLOATS_PER_PACKED_SEGMENT);
    expect(packed.fullBatches).toHaveLength(1);
    expect(packed.fullBatches[0].segmentOffset).toBe(0);
    expect(packed.fullBatches[0].segmentCount).toBe(3);
    expect(packed.mediumZoomSegmentCount).toBe(2);
    expect(packed.lowZoomSegmentCount).toBe(1);

    // Every segment of track-1 is assigned to channel 0
    for (let s = 0; s < 3; s++) {
      expect(packed.fullSegments[s * FLOATS_PER_PACKED_SEGMENT + 8]).toBe(0);
    }
  });

  it('packs geographically distant non-overlapping tracks into the same MRT channel while separating overlapping tracks', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'gdansk-1',
        {
          id: 'gdansk-1',
          name: 'Gdansk 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.36, lon: 18.66 },
          ],
        },
      ],
      [
        'gdansk-2',
        {
          id: 'gdansk-2',
          name: 'Gdansk 2 (overlaps gdansk-1)',
          points: [
            { lat: 54.351, lon: 18.651 },
            { lat: 54.361, lon: 18.661 },
          ],
        },
      ],
      [
        'krakow-1',
        {
          id: 'krakow-1',
          name: 'Krakow 1 (far away)',
          points: [
            { lat: 50.06, lon: 19.94 },
            { lat: 50.07, lon: 19.95 },
          ],
        },
      ],
    ]);

    // With 2 channels/batch, all 3 tracks still fit in 1 batch because Krakow shares channel 0 with Gdansk-1
    const packed = packTracksForHeatmap(tracks, 2);
    expect(packed.fullBatches).toHaveLength(1);
    expect(packed.fullSegmentCount).toBe(3);

    const channels = [
      packed.fullSegments[8],
      packed.fullSegments[FLOATS_PER_PACKED_SEGMENT + 8],
      packed.fullSegments[2 * FLOATS_PER_PACKED_SEGMENT + 8],
    ].sort((a, b) => a - b);
    expect(channels).toEqual([0, 0, 1]);
  });

  it('spills overlapping tracks into multiple contiguous batches when exceeding channelsPerBatch', () => {
    const tracks = new Map<string, GPXTrack>();
    for (let i = 0; i < 5; i++) {
      tracks.set(`overlap-${i}`, {
        id: `overlap-${i}`,
        name: `Overlap ${i}`,
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      });
    }

    const packed = packTracksForHeatmap(tracks, 2);
    expect(packed.fullBatches).toHaveLength(3);
    expect(packed.fullBatches.map((b) => [b.segmentOffset, b.segmentCount])).toEqual([
      [0, 2],
      [2, 2],
      [4, 1],
    ]);
  });

  it('preserves single-point tracks as zero-length segments (#165)', () => {
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
    expect(packed.fullSegments[0]).toBe(packed.fullSegments[2]);
    expect(packed.fullSegments[1]).toBe(packed.fullSegments[3]);
    expect(packed.fullSegments[8]).toBe(0);
  });
});
