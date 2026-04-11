/**
 * @jest-environment jsdom
 */

import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { GPXTrack } from '@/lib/types';
import { processTracksChunked } from './trackProcessor';

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator',
  () => ({
    drawLineToAccumulator: jest.fn(),
  })
);

describe('processTracksChunked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not cull border-hugging segments that can reach the viewport after rounding', () => {
    const tracksArray: GPXTrack[] = [
      {
        id: 'track-1',
        name: 'Track 1',
        points: [
          { lat: 1, lon: 1 },
          { lat: 2, lon: 2 },
        ],
      },
    ];

    const accumulator = new Float32Array(100 * 100);
    const touchedBounds: PixelBounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    const onComplete = jest.fn();
    const latlngToPixel = jest
      .fn()
      .mockReturnValueOnce({ x: 103.4, y: 50 })
      .mockReturnValueOnce({ x: 103.6, y: 51 });

    processTracksChunked(
      tracksArray,
      accumulator,
      100,
      100,
      latlngToPixel,
      5,
      () => false,
      touchedBounds,
      onComplete
    );

    expect(drawLineToAccumulator).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
