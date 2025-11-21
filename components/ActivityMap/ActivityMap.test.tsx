import { useGPXData } from '@/hooks/useGPXData';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import { fireEvent, render, screen } from '@/test-utils';
import ActivityMap from './ActivityMap';

// Mock the hooks
jest.mock('../../hooks/useGPXData', () => ({
  useGPXData: jest.fn(),
}));

jest.mock('../../hooks/useLeafletMap', () => ({
  useLeafletMap: jest.fn(),
}));

jest.mock('./MapContainer', () => ({
  __esModule: true,
  default: function MockMapContainer() {
    return <div data-testid="map-container">Map Container</div>;
  },
}));

const mockUseGPXData = useGPXData as jest.MockedFunction<typeof useGPXData>;
const mockUseLeafletMap = useLeafletMap as jest.MockedFunction<typeof useLeafletMap>;

describe('ActivityMap', () => {
  const mockTracks = new Map<string, any>();

  beforeEach(() => {
    jest.clearAllMocks();

    // Provide full shape expected from useGPXData to satisfy TS
    mockUseGPXData.mockReturnValue({
      tracks: mockTracks,
      loading: false,
      error: null,
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clearTracks: jest.fn(),
      trackCount: 0,
    } as any);

    mockUseLeafletMap.mockReturnValue({
      map: null,
      isReady: false,
      error: null,
    } as any);
  });

  it('should render error message when map loading fails', () => {
    mockUseLeafletMap.mockReturnValue({
      map: null,
      isReady: false,
      error: 'Map loading failed',
    } as any);

    render(<ActivityMap />);

    expect(screen.getByText('Failed to load map')).toBeInTheDocument();
    expect(screen.getByText('Map loading failed')).toBeInTheDocument();
  });

  it('should render mode selector with heatmap selected by default', () => {
    render(<ActivityMap />);

    const heatmapRadio = screen.getByLabelText('Heatmap');
    const linesRadio = screen.getByLabelText('Lines');

    expect(heatmapRadio).toBeChecked();
    expect(linesRadio).not.toBeChecked();
  });

  it('should not render MapContainer when map is not ready', () => {
    render(<ActivityMap />);

    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });

  it('should render MapContainer when map is ready', () => {
    const mockMap: any = {};
    mockUseLeafletMap.mockReturnValue({
      map: mockMap,
      isReady: true,
      error: null,
    } as any);

    render(<ActivityMap />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should change activity mode when radio button is clicked', () => {
    const mockMap: any = {};
    mockUseLeafletMap.mockReturnValue({
      map: mockMap,
      isReady: true,
      error: null,
    } as any);

    render(<ActivityMap />);

    const linesRadio = screen.getByLabelText('Lines');
    fireEvent.click(linesRadio);

    expect(linesRadio).toBeChecked();
    const heatmapRadio = screen.getByLabelText('Heatmap');
    expect(heatmapRadio).not.toBeChecked();
  });

  it('should render map container div', () => {
    render(<ActivityMap />);

    const mapContainer = screen.getByTestId('map-wrapper');
    expect(mapContainer).toHaveStyle({
      width: '100%',
      height: '100%',
    });
  });
});
