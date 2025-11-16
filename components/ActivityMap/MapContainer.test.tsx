import { render } from '@/test-utils';
import type { Map as LeafletMap } from 'leaflet';
import { GPXTrack } from '@/lib/types/types';
import MapContainer from './MapContainer';
import * as useActivityRendering from './hooks/useActivityRendering';
import * as useRegionAnalysis from './hooks/useRegionAnalysis';
import * as useRegionLoading from './hooks/useRegionLoading';
import * as useRegionRendering from './hooks/useRegionRendering';

// Mock all the hooks
jest.mock('./hooks/useActivityRendering');
jest.mock('./hooks/useRegionAnalysis');
jest.mock('./hooks/useRegionLoading');
jest.mock('./hooks/useRegionRendering');

describe('MapContainer', () => {
  let mockMap: Partial<LeafletMap>;
  let mockTracks: Map<string, GPXTrack>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMap = {} as LeafletMap;
    mockTracks = new Map();

    // Setup default mock implementations
    jest.spyOn(useRegionLoading, 'useRegionLoading').mockReturnValue({
      regions: [],
      isLoading: false,
      error: null,
    });

    jest.spyOn(useRegionAnalysis, 'useRegionAnalysis').mockReturnValue({
      visitData: new Map(),
      isAnalyzing: false,
    });

    jest.spyOn(useActivityRendering, 'useActivityRendering').mockReturnValue(undefined);
    jest.spyOn(useRegionRendering, 'useRegionRendering').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />
    );
    expect(container).toBeInTheDocument();
  });

  it('should return null (no visual output)', () => {
    const { container } = render(
      <MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />
    );
    // Check that component returns null - the container may have Mantine styles
    const content = Array.from(container.children).filter(
      (child) => !child.hasAttribute('data-mantine-styles')
    );
    expect(content).toHaveLength(0);
  });

  it('should call useRegionLoading with map', () => {
    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(useRegionLoading.useRegionLoading).toHaveBeenCalledWith(mockMap);
  });

  it('should call useRegionAnalysis with tracks and regions', () => {
    const mockRegions = [{ id: 'test-region' }] as any;
    jest.spyOn(useRegionLoading, 'useRegionLoading').mockReturnValue({
      regions: mockRegions,
      isLoading: false,
      error: null,
    });

    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(useRegionAnalysis.useRegionAnalysis).toHaveBeenCalledWith(
      mockTracks,
      mockRegions
    );
  });

  it('should call useActivityRendering with correct parameters', () => {
    render(
      <MapContainer
        map={mockMap as LeafletMap}
        tracks={mockTracks}
        showHeatmap={true}
        activityMode="heatmap"
      />
    );

    expect(useActivityRendering.useActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true,
      'heatmap'
    );
  });

  it('should call useRegionRendering with correct parameters', () => {
    const mockVisitData = new Map();
    const mockRegions = [{ id: 'test-region' }] as any;

    jest.spyOn(useRegionLoading, 'useRegionLoading').mockReturnValue({
      regions: mockRegions,
      isLoading: false,
      error: null,
    });

    jest.spyOn(useRegionAnalysis, 'useRegionAnalysis').mockReturnValue({
      visitData: mockVisitData,
      isAnalyzing: false,
    });

    render(
      <MapContainer
        map={mockMap as LeafletMap}
        tracks={mockTracks}
        showBorders={true}
      />
    );

    expect(useRegionRendering.useRegionRendering).toHaveBeenCalledWith(
      mockMap,
      mockRegions,
      mockVisitData,
      true
    );
  });

  it('should use default value for showHeatmap when not provided', () => {
    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(useActivityRendering.useActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true,
      'heatmap'
    );
  });

  it('should use default value for showBorders when not provided', () => {
    const mockVisitData = new Map();
    const mockRegions = [] as any;

    jest.spyOn(useRegionLoading, 'useRegionLoading').mockReturnValue({
      regions: mockRegions,
      isLoading: false,
      error: null,
    });

    jest.spyOn(useRegionAnalysis, 'useRegionAnalysis').mockReturnValue({
      visitData: mockVisitData,
      isAnalyzing: false,
    });

    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(useRegionRendering.useRegionRendering).toHaveBeenCalledWith(
      mockMap,
      mockRegions,
      mockVisitData,
      true
    );
  });

  it('should use default value for activityMode when not provided', () => {
    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(useActivityRendering.useActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true,
      'heatmap'
    );
  });

  it('should pass showHeatmap=false correctly', () => {
    render(
      <MapContainer
        map={mockMap as LeafletMap}
        tracks={mockTracks}
        showHeatmap={false}
      />
    );

    expect(useActivityRendering.useActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      false,
      'heatmap'
    );
  });

  it('should pass showBorders=false correctly', () => {
    const mockVisitData = new Map();
    const mockRegions = [] as any;

    jest.spyOn(useRegionLoading, 'useRegionLoading').mockReturnValue({
      regions: mockRegions,
      isLoading: false,
      error: null,
    });

    jest.spyOn(useRegionAnalysis, 'useRegionAnalysis').mockReturnValue({
      visitData: mockVisitData,
      isAnalyzing: false,
    });

    render(
      <MapContainer
        map={mockMap as LeafletMap}
        tracks={mockTracks}
        showBorders={false}
      />
    );

    expect(useRegionRendering.useRegionRendering).toHaveBeenCalledWith(
      mockMap,
      mockRegions,
      mockVisitData,
      false
    );
  });

  it('should pass activityMode="lines" correctly', () => {
    render(
      <MapContainer
        map={mockMap as LeafletMap}
        tracks={mockTracks}
        activityMode="lines"
      />
    );

    expect(useActivityRendering.useActivityRendering).toHaveBeenCalledWith(
      mockMap,
      mockTracks,
      true,
      'lines'
    );
  });

  it('should handle null map gracefully', () => {
    render(<MapContainer map={null} tracks={mockTracks} />);

    expect(useRegionLoading.useRegionLoading).toHaveBeenCalledWith(null);
  });

  it('should handle empty tracks', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    render(<MapContainer map={mockMap as LeafletMap} tracks={emptyTracks} />);

    expect(useRegionAnalysis.useRegionAnalysis).toHaveBeenCalledWith(
      emptyTracks,
      expect.any(Array)
    );
  });

  it('should coordinate all hooks in the correct order', () => {
    const callOrder: string[] = [];

    jest.spyOn(useRegionLoading, 'useRegionLoading').mockImplementation((map) => {
      callOrder.push('useRegionLoading');
      return { regions: [], isLoading: false, error: null };
    });

    jest.spyOn(useRegionAnalysis, 'useRegionAnalysis').mockImplementation((tracks, regions) => {
      callOrder.push('useRegionAnalysis');
      return { visitData: new Map(), isAnalyzing: false };
    });

    jest.spyOn(useActivityRendering, 'useActivityRendering').mockImplementation(() => {
      callOrder.push('useActivityRendering');
    });

    jest.spyOn(useRegionRendering, 'useRegionRendering').mockImplementation(() => {
      callOrder.push('useRegionRendering');
    });

    render(<MapContainer map={mockMap as LeafletMap} tracks={mockTracks} />);

    expect(callOrder).toEqual([
      'useRegionLoading',
      'useRegionAnalysis',
      'useActivityRendering',
      'useRegionRendering',
    ]);
  });
});
