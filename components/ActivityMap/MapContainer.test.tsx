import { render } from '@testing-library/react';
import type { Regions } from '@/lib/types';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionAnalysis } from './hooks/useRegionAnalysis';
import { useRegionLoading } from './hooks/useRegionLoading';
import { useRegionRendering } from './hooks/useRegionRendering';
import MapContainer from './MapContainer';

// Mock the hooks
jest.mock('./hooks/useActivityRendering', () => ({
  useActivityRendering: jest.fn(),
}));

jest.mock('./hooks/useRegionAnalysis', () => ({
  useRegionAnalysis: jest.fn(),
}));

jest.mock('./hooks/useRegionLoading', () => ({
  useRegionLoading: jest.fn(),
}));

jest.mock('./hooks/useRegionRendering', () => ({
  useRegionRendering: jest.fn(),
}));

const mockUseActivityRendering = useActivityRendering as jest.MockedFunction<
  typeof useActivityRendering
>;
const mockUseRegionAnalysis = useRegionAnalysis as jest.MockedFunction<typeof useRegionAnalysis>;
const mockUseRegionLoading = useRegionLoading as jest.MockedFunction<typeof useRegionLoading>;
const mockUseRegionRendering = useRegionRendering as jest.MockedFunction<typeof useRegionRendering>;

describe('MapContainer', () => {
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
    render(<MapContainer map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionLoading).toHaveBeenCalledWith(mockMap);
  });

  it('should call useRegionAnalysis with tracks and regions', () => {
    render(<MapContainer map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionAnalysis).toHaveBeenCalledWith(mockTracks, mockRegions);
  });

  it('should call useActivityRendering with correct parameters', () => {
    render(<MapContainer map={mockMap} tracks={mockTracks} />);

    expect(mockUseActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true, // showHeatmap default
      'heatmap' // activityMode default
    );
  });

  it('should call useRegionRendering with correct parameters', () => {
    render(<MapContainer map={mockMap} tracks={mockTracks} />);

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      mockRegions,
      mockVisitData,
      true // showBorders default
    );
  });

  it('should pass custom props correctly', () => {
    render(
      <MapContainer
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
    const { container } = render(<MapContainer map={mockMap} tracks={mockTracks} />);

    expect(container.firstChild).toBeNull();
  });
});
