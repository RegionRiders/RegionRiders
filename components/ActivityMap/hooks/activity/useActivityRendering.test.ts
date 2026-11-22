import { renderHook } from '@testing-library/react';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { WebGL2HeatmapLayer } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/WebGL2HeatmapLayer';
import { mountActivityLinesLayer } from '@/components/ActivityMap/hooks/activity/activitiesLines/activityLinesLayer';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

jest.mock('@/components/ActivityMap/hooks/activity/activitiesLines/activityLinesLayer', () => ({
  mountActivityLinesLayer: jest.fn(() => jest.fn()),
}));

describe('useActivityRendering', () => {
  const sampleTracks = new Map<string, GPXTrack>([
    [
      'track-1',
      {
        id: 'track-1',
        name: 'Test Ride',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not mount any layers when map is null, showActivities is false, or tracks are empty', () => {
    const mockMap = createMockMapLibreInstance();

    renderHook(() => useActivityRendering(null, sampleTracks, true, 'heatmap'));
    renderHook(() => useActivityRendering(mockMap as any, sampleTracks, false, 'heatmap'));
    renderHook(() => useActivityRendering(mockMap as any, new Map(), true, 'lines'));

    expect(mockMap.addLayer).not.toHaveBeenCalled();
    expect(mountActivityLinesLayer).not.toHaveBeenCalled();
  });

  it('mounts WebGL2HeatmapLayer in heatmap mode and updates options without recreating the layer', () => {
    const mockMap = createMockMapLibreInstance();
    const updateOptionsSpy = jest.spyOn(WebGL2HeatmapLayer.prototype, 'updateOptions');

    const { rerender, unmount } = renderHook(
      ({ thickness, transparency }) =>
        useActivityRendering(
          mockMap as any,
          sampleTracks,
          true,
          'heatmap',
          thickness,
          transparency,
          1.5
        ),
      { initialProps: { thickness: 2, transparency: 1 } }
    );

    expect(mockMap.addLayer).toHaveBeenCalledTimes(1);
    expect(mockMap.addLayer.mock.calls[0][0]).toBeInstanceOf(WebGL2HeatmapLayer);

    // Changing slider values updates options in-place without re-adding the custom layer
    rerender({ thickness: 5, transparency: 0.6 });
    expect(mockMap.addLayer).toHaveBeenCalledTimes(1);
    expect(updateOptionsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        lineThickness: 5,
        layerTransparency: 0.6,
        heatmapDensity: 1.5,
      })
    );

    unmount();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.ACTIVITIES_HEATMAP);
    updateOptionsSpy.mockRestore();
  });

  it('mounts activityLinesLayer in lines mode with normalized thickness', () => {
    const mockMap = createMockMapLibreInstance();

    renderHook(() =>
      useActivityRendering(
        mockMap as any,
        sampleTracks,
        true,
        'lines',
        99, // clamped to MAX_ACTIVITY_THICKNESS_CONTROL (10)
        0.75
      )
    );

    expect(mountActivityLinesLayer).toHaveBeenCalledWith(
      mockMap,
      sampleTracks,
      expect.objectContaining({
        lineThickness: 10,
        layerTransparency: 0.75,
      })
    );
  });
});
