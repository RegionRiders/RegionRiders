import { render } from '@testing-library/react';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionAnalysis } from './hooks/useRegionAnalysis';
import { useRegionRendering } from './hooks/useRegionRendering';
import MapOrchestrator from './MapOrchestrator';

// Mock the hooks
jest.mock('./hooks/useActivityRendering', () => ({
  useActivityRendering: jest.fn(),
}));

jest.mock('./hooks/useRegionAnalysis', () => ({
  useRegionAnalysis: jest.fn(),
}));

jest.mock('./hooks/useRegionRendering', () => ({
  useRegionRendering: jest.fn(),
}));

const mockUseActivityRendering = useActivityRendering as jest.MockedFunction<
  typeof useActivityRendering
>;
const mockUseRegionAnalysis = useRegionAnalysis as jest.MockedFunction<typeof useRegionAnalysis>;
const mockUseRegionRendering = useRegionRendering as jest.MockedFunction<typeof useRegionRendering>;

describe('MapOrchestrator', () => {
  const mockMap: any = {};
  const mockTracks = new Map<string, any>();
  const onRegionTileError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseActivityRendering.mockReturnValue(undefined);
    mockUseRegionRendering.mockReturnValue(undefined);
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
    render(
      <MapOrchestrator map={mockMap} tracks={mockTracks} onRegionTileError={onRegionTileError} />
    );

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      true, // showBorders default
      expect.any(Map),
      onRegionTileError
    );

    expect(mockUseRegionRendering.mock.calls[0]?.[2]).toEqual(new Map());
    expect(mockUseRegionAnalysis).not.toHaveBeenCalled();
  });

  it('should pass custom props correctly', () => {
    render(
      <MapOrchestrator
        map={mockMap}
        tracks={mockTracks}
        showHeatmap={false}
        showBorders={false}
        activityMode="lines"
        onRegionTileError={onRegionTileError}
      />
    );

    expect(mockUseActivityRendering).toHaveBeenCalledWith(mockMap, mockTracks, false, 'lines');

    expect(mockUseRegionRendering).toHaveBeenCalledWith(
      mockMap,
      false,
      expect.any(Map),
      onRegionTileError
    );

    expect(mockUseRegionRendering.mock.calls[0]?.[2]).toEqual(new Map());
  });

  it('should render null', () => {
    const { container } = render(<MapOrchestrator map={mockMap} tracks={mockTracks} />);

    expect(container.firstChild).toBeNull();
  });

  it('reuses the same empty visit data map across rerenders', () => {
    const { rerender } = render(
      <MapOrchestrator map={mockMap} tracks={mockTracks} onRegionTileError={onRegionTileError} />
    );

    const firstVisitData = mockUseRegionRendering.mock.calls[0]?.[2];

    rerender(
      <MapOrchestrator map={mockMap} tracks={mockTracks} onRegionTileError={onRegionTileError} />
    );

    const secondVisitData = mockUseRegionRendering.mock.calls[1]?.[2];

    expect(firstVisitData).toBeInstanceOf(Map);
    expect(secondVisitData).toBe(firstVisitData);
    expect(mockUseRegionAnalysis).not.toHaveBeenCalled();
  });
});
