import { render } from '@testing-library/react';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionAnalysis } from '@/components/ActivityMap/hooks/region/useRegionAnalysis';
import { useRegionLoading } from '@/components/ActivityMap/hooks/region/useRegionLoading';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import type { Regions } from '@/lib/types';
import MapOrchestrator from './MapOrchestrator';

// Mock the hooks
jest.mock('@/components/ActivityMap/hooks/activity/useActivityRendering', () => ({
  useActivityRendering: jest.fn(),
}));

jest.mock('@/components/ActivityMap/hooks/region/useRegionAnalysis', () => ({
  useRegionAnalysis: jest.fn(),
}));

jest.mock('@/components/ActivityMap/hooks/region/useRegionLoading', () => ({
  useRegionLoading: jest.fn(),
}));

jest.mock('@/components/ActivityMap/hooks/region/useRegionRendering', () => ({
  useRegionRendering: jest.fn(),
}));

const mockUseActivityRendering = useActivityRendering as jest.MockedFunction<
  typeof useActivityRendering
>;
const mockUseRegionAnalysis = useRegionAnalysis as jest.MockedFunction<typeof useRegionAnalysis>;
const mockUseRegionLoading = useRegionLoading as jest.MockedFunction<typeof useRegionLoading>;
const mockUseRegionRendering = useRegionRendering as jest.MockedFunction<typeof useRegionRendering>;

describe('MapOrchestrator', () => {
  const mockMap: any = {};
  const mockTracks = new Map<string, any>();
  const mockRegions: Regions[] = [];
  const mockVisitData = new Map();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRegionLoading.mockReturnValue({
      regions: mockRegions,
    } as any);

    mockUseRegionAnalysis.mockReturnValue({
      visitData: mockVisitData,
    } as any);

    mockUseActivityRendering.mockReturnValue(undefined);
    mockUseRegionRendering.mockReturnValue(undefined);
  });

  it('should call useRegionLoading with map', () => {
    render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionLoading).toHaveBeenCalledWith(mockMap);
  });

  it('should call useRegionAnalysis with tracks and regions', () => {
    render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionAnalysis).toHaveBeenCalledWith(mockTracks, mockRegions);
  });

  it('should call useActivityRendering with correct parameters', () => {
    render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(mockUseActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true, // showHeatmap default
      'heatmap' // activityMode default
    );
  });

  it('should call useRegionRendering with correct parameters', () => {
    render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      mockRegions,
      mockVisitData,
      true // showBorders default
    );
  });

  it('should pass custom props correctly', () => {
    render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        showHeatmap={false}
        showBorders={false}
        activityMode="lines"
      />
    );

    expect(mockUseActivityRendering).toHaveBeenCalledWith(mockMap, mockTracks, false, 'lines');

    expect(mockUseRegionRendering).toHaveBeenCalledWith(mockMap, mockRegions, mockVisitData, false);
  });

  it('should render null', () => {
    const { container } = render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(container.firstChild).toBeNull();
  });
});
