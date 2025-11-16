import type { GPXTrack } from '@/lib/types/types';
import { drawActivities } from './drawActivities';
import { drawActivitiesAsHeatmap } from './drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from './drawActivitiesAsLines';

// Mock the draw functions
jest.mock('./drawActivitiesAsHeatmap', () => ({
  drawActivitiesAsHeatmap: jest.fn(),
}));

jest.mock('./drawActivitiesAsLines', () => ({
  drawActivitiesAsLines: jest.fn(),
}));

describe('drawActivities', () => {
  const mockMap = {};
  const mockTracks = new Map<string, GPXTrack>([
    [
      'track-1',
      {
        id: 'track-1',
        name: 'Test Track',
        points: [{ lat: 50.0, lon: 14.0 }],
        metadata: { distance: 10.0 },
      },
    ],
  ]);
  const mockImageLayerRef = {};
  const mockAbortRef = {};
  const mockTimeoutRef = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call drawActivitiesAsHeatmap when mode is heatmap', () => {
    drawActivities(mockMap, mockTracks, mockImageLayerRef, mockAbortRef, mockTimeoutRef, 'heatmap');

    expect(drawActivitiesAsHeatmap).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      mockImageLayerRef,
      mockAbortRef,
      mockTimeoutRef
    );
    expect(drawActivitiesAsLines).not.toHaveBeenCalled();
  });

  it('should call drawActivitiesAsLines when mode is lines', () => {
    drawActivities(mockMap, mockTracks, mockImageLayerRef, mockAbortRef, mockTimeoutRef, 'lines');

    expect(drawActivitiesAsLines).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      mockAbortRef,
      mockTimeoutRef
    );
    expect(drawActivitiesAsHeatmap).not.toHaveBeenCalled();
  });

  it('should default to heatmap mode when no mode specified', () => {
    drawActivities(mockMap, mockTracks, mockImageLayerRef, mockAbortRef, mockTimeoutRef);

    expect(drawActivitiesAsHeatmap).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      mockImageLayerRef,
      mockAbortRef,
      mockTimeoutRef
    );
  });

  it('should return the result from drawActivitiesAsHeatmap', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsHeatmap as jest.Mock).mockReturnValue(mockCleanup);

    const result = drawActivities(
      mockMap,
      mockTracks,
      mockImageLayerRef,
      mockAbortRef,
      mockTimeoutRef,
      'heatmap'
    );

    expect(result).toBe(mockCleanup);
  });

  it('should return the result from drawActivitiesAsLines', () => {
    const mockCleanup = jest.fn();
    (drawActivitiesAsLines as jest.Mock).mockReturnValue(mockCleanup);

    const result = drawActivities(
      mockMap,
      mockTracks,
      mockImageLayerRef,
      mockAbortRef,
      mockTimeoutRef,
      'lines'
    );

    expect(result).toBe(mockCleanup);
  });
});
