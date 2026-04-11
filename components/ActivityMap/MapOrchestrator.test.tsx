import { render } from '@testing-library/react';
import {
  ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
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
        { threshold: 0, color: [60, 60, 60, 0] },
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
});
