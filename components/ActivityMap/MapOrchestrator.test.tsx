import { render } from '@testing-library/react';
import {
  ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  DEFAULT_REGION_STATIC_COLOR_SWATCHES,
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import type { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import MapOrchestrator from './MapOrchestrator';

// Mock the hooks
jest.mock('@/components/ActivityMap/hooks/activity/useActivityRendering', () => ({
  useActivityRendering: jest.fn(),
}));

jest.mock('@/components/ActivityMap/hooks/region/useRegionRendering', () => ({
  useRegionRendering: jest.fn(),
}));

const mockUseActivityRendering = useActivityRendering as jest.MockedFunction<
  typeof useActivityRendering
>;
const mockUseRegionRendering = useRegionRendering as jest.MockedFunction<typeof useRegionRendering>;

describe('MapOrchestrator', () => {
  const mockMap: any = {};
  const mockTracks = new Map<string, any>();
  const onRegionTileError = jest.fn();

  const defaultSettings: MapSettings = {
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
    heatmapDensity: 2,
    lineColorSwatches: [{ normal: [255, 0, 0, 0.5], hover: [255, 100, 100, 0.7] }],
    selectedLineSwatchIndex: 0,
    activityHeatmapColorSwatches: [ACTIVITY_HEATMAP_COLOR_THRESHOLDS],
    selectedActivityHeatmapSwatchIndex: 0,
    regionMode: 'heatmap',
    showRegions: true,
    regionBorderThickness: 2,
    regionLayerTransparency: 1,
    regionStaticColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0.18] },
        { threshold: 1, color: [76, 107, 34, 0.2] },
      ],
    ],
    selectedRegionStaticSwatchIndex: 0,
    regionHeatmapColorSwatches: [REGION_VISIT_HEATMAP_COLOR_THRESHOLDS],
    selectedRegionHeatmapSwatchIndex: 0,
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseActivityRendering.mockReturnValue(undefined);
    mockUseRegionRendering.mockReturnValue(undefined);
  });

  it('should call useActivityRendering with correct parameters from settings', () => {
    render(<MapOrchestrator map={mockMap} tracks={mockTracks} settings={defaultSettings} />);

    expect(mockUseActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      defaultSettings.showActivities,
      defaultSettings.activityMode,
      defaultSettings.activityThickness,
      defaultSettings.activityLayerTransparency ?? 1,
      defaultSettings.heatmapDensity,
      defaultSettings.lineColorSwatches[defaultSettings.selectedLineSwatchIndex],
      defaultSettings.activityHeatmapColorSwatches?.[
        defaultSettings.selectedActivityHeatmapSwatchIndex ?? 0
      ]
    );
  });

  it('should call useRegionRendering with correct parameters from settings', () => {
    render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      expect.any(Map),
      defaultSettings.showRegions,
      defaultSettings.regionMode,
      defaultSettings.regionBorderThickness,
      defaultSettings.regionLayerTransparency ?? 1,
      defaultSettings.regionStaticColorSwatches[defaultSettings.selectedRegionStaticSwatchIndex],
      defaultSettings.regionHeatmapColorSwatches?.[
        defaultSettings.selectedRegionHeatmapSwatchIndex ?? 0
      ],
      onRegionTileError
    );

    expect(mockUseRegionRendering.mock.calls[0]?.[1]).toEqual(new Map());
  });

  it('should pass custom settings correctly', () => {
    const customSettings: MapSettings = {
      ...defaultSettings,
      showActivities: false,
      showRegions: false,
      activityMode: 'lines',
    };

    render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={customSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    expect(mockUseActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      false,
      'lines',
      customSettings.activityThickness,
      customSettings.activityLayerTransparency ?? 1,
      customSettings.heatmapDensity,
      customSettings.lineColorSwatches[customSettings.selectedLineSwatchIndex],
      customSettings.activityHeatmapColorSwatches?.[
        customSettings.selectedActivityHeatmapSwatchIndex ?? 0
      ]
    );

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      expect.any(Map),
      false,
      customSettings.regionMode,
      customSettings.regionBorderThickness,
      customSettings.regionLayerTransparency ?? 1,
      customSettings.regionStaticColorSwatches[customSettings.selectedRegionStaticSwatchIndex],
      customSettings.regionHeatmapColorSwatches?.[
        customSettings.selectedRegionHeatmapSwatchIndex ?? 0
      ],
      onRegionTileError
    );
  });

  it('should render null', () => {
    const { container } = render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('reuses the same empty visit data map across rerenders', () => {
    const { rerender } = render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const firstVisitData = mockUseRegionRendering.mock.calls[0]?.[1];

    rerender(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const secondVisitData = mockUseRegionRendering.mock.calls[1]?.[1];

    expect(firstVisitData).toBeInstanceOf(Map);
    expect(secondVisitData).toBe(firstVisitData);
  });

  it('keeps the placeholder visit data empty even when tracks change', () => {
    const firstTracks = new Map<string, any>([['track-1', { id: 'track-1' }]]);
    const secondTracks = new Map<string, any>([['track-2', { id: 'track-2' }]]);

    const { rerender } = render(
      <MapOrchestrator
        map={mockMap}
        tracks={firstTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const firstVisitData = mockUseRegionRendering.mock.calls[0]?.[1];

    rerender(
      <MapOrchestrator
        map={mockMap}
        tracks={secondTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const secondVisitData = mockUseRegionRendering.mock.calls[1]?.[1];

    expect(firstVisitData).toBeInstanceOf(Map);
    expect(firstVisitData?.size).toBe(0);
    expect(secondVisitData).toBe(firstVisitData);
    expect(secondVisitData?.size).toBe(0);
  });

  it('forwards the static-mode full-alpha unvisited swatch workflow while keeping the visit data empty', () => {
    const { rerender } = render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={defaultSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const firstVisitData = mockUseRegionRendering.mock.calls[0]?.[1];
    const editedStaticSwatches = [
      [
        { threshold: 0, color: [18, 18, 18, 1] as [number, number, number, number] },
        { threshold: 1, color: [76, 107, 34, 0.3] as [number, number, number, number] },
      ],
    ];
    const updatedSettings: MapSettings = {
      ...defaultSettings,
      regionMode: 'static',
      regionBorderThickness: 5,
      regionLayerTransparency: 0.35,
      regionStaticColorSwatches: editedStaticSwatches,
    };

    rerender(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={updatedSettings}
        onRegionTileError={onRegionTileError}
      />
    );

    const latestRegionRenderingCall = mockUseRegionRendering.mock.calls.at(-1);
    const secondVisitData = latestRegionRenderingCall?.[1];
    const forwardedStaticThresholds = latestRegionRenderingCall?.[6];

    expect(firstVisitData).toBeInstanceOf(Map);
    expect(firstVisitData?.size).toBe(0);
    expect(secondVisitData).toBe(firstVisitData);
    expect(secondVisitData?.size).toBe(0);
    expect(updatedSettings.regionMode).toBe('static');
    expect(forwardedStaticThresholds?.find((threshold) => threshold.threshold === 0)?.color[3]).toBe(1);
    expect(latestRegionRenderingCall).toEqual([
      mockMap,
      firstVisitData,
      updatedSettings.showRegions,
      updatedSettings.regionMode,
      updatedSettings.regionBorderThickness,
      updatedSettings.regionLayerTransparency,
      editedStaticSwatches[0],
      updatedSettings.regionHeatmapColorSwatches?.[
        updatedSettings.selectedRegionHeatmapSwatchIndex ?? 0
      ],
      onRegionTileError,
    ]);
  });

  it('falls back to the default placeholder region swatch when custom swatches are absent', () => {
    const settingsWithoutRegionSwatches = {
      ...defaultSettings,
      regionStaticColorSwatches: undefined,
    } as unknown as MapSettings;

    render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        settings={settingsWithoutRegionSwatches}
        onRegionTileError={onRegionTileError}
      />
    );

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      expect.any(Map),
      settingsWithoutRegionSwatches.showRegions,
      settingsWithoutRegionSwatches.regionMode,
      settingsWithoutRegionSwatches.regionBorderThickness,
      settingsWithoutRegionSwatches.regionLayerTransparency ?? 1,
      DEFAULT_REGION_STATIC_COLOR_SWATCHES[0],
      settingsWithoutRegionSwatches.regionHeatmapColorSwatches?.[
        settingsWithoutRegionSwatches.selectedRegionHeatmapSwatchIndex ?? 0
      ],
      onRegionTileError
    );
    expect(DEFAULT_REGION_STATIC_COLOR_SWATCHES[0]?.[0]?.color[3]).toBeGreaterThan(0);
  });
});
