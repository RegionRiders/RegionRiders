import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import { render, screen } from '@/test-utils';
import ActivityMap from './ActivityMap';

// Mock the hooks
jest.mock('../../hooks/useGPXData', () => ({
  useGPXData: jest.fn(),
}));

jest.mock('./hooks/map/useLeafletMap', () => ({
  useLeafletMap: jest.fn(),
}));

// Mock the child components
jest.mock('./MapContainer', () => ({
  __esModule: true,
  default: function MockMapContainer() {
    return <div data-testid="map-container">Map Container</div>;
  },
}));

jest.mock('./MapOrchestrator', () => ({
  __esModule: true,
  default: function MockMapOrchestrator() {
    return <div data-testid="map-orchestrator">Map Orchestrator</div>;
  },
}));

jest.mock('./controls/LayersPanel/LayersPanel', () => ({
  __esModule: true,
  default: function MockLayersPanel() {
    return <div data-testid="layers-panel">Layers Panel</div>;
  },
}));

const mockUseGPXData = useGPXData as jest.MockedFunction<typeof useGPXData>;
const mockUseLeafletMap = useLeafletMap as jest.MockedFunction<typeof useLeafletMap>;

describe('ActivityMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseGPXData.mockReturnValue({
      tracks: new Map(),
      loading: false,
      error: null,
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clearTracks: jest.fn(),
      trackCount: 0,
    });

    mockUseLeafletMap.mockReturnValue({
      map: {} as any,
      isReady: true,
      error: null,
    });
  });

  it('renders without crashing', () => {
    render(<ActivityMap />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('displays error message when map fails to load', () => {
    mockUseLeafletMap.mockReturnValue({
      map: null,
      isReady: false,
      error: 'Failed to initialize map',
    });

    render(<ActivityMap />);
    expect(screen.getByText('Failed to load map')).toBeInTheDocument();
    expect(screen.getByText('Failed to initialize map')).toBeInTheDocument();
  });

  it('renders LayersPanel for layer controls', () => {
    render(<ActivityMap />);

    expect(screen.getByTestId('layers-panel')).toBeInTheDocument();
  });

  it('renders MapOrchestrator when map is ready', () => {
    render(<ActivityMap />);
    expect(screen.getByTestId('map-orchestrator')).toBeInTheDocument();
  });

  it('does not render MapOrchestrator when map is not ready', () => {
    mockUseLeafletMap.mockReturnValue({
      map: null,
      isReady: false,
      error: null,
    });

    render(<ActivityMap />);
    expect(screen.queryByTestId('map-orchestrator')).not.toBeInTheDocument();
  });

  it('works with populated tracks', () => {
    const mockTracks = new Map([
      ['track1', { id: 'track1', name: 'Track 1', coordinates: [] } as any],
      ['track2', { id: 'track2', name: 'Track 2', coordinates: [] } as any],
    ]);

    mockUseGPXData.mockReturnValue({
      tracks: mockTracks,
      loading: false,
      error: null,
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clearTracks: jest.fn(),
      trackCount: 2,
    });

    render(<ActivityMap />);
    expect(screen.getByTestId('map-orchestrator')).toBeInTheDocument();
  });
});
