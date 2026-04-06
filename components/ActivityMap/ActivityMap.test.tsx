import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import ActivityMap from './ActivityMap';

const mockLayersPanel = jest.fn();

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
  default: function MockLayersPanel(props: any) {
    mockLayersPanel(props);
    return (
      <div data-testid="layers-panel">
        Layers Panel
        <button
          data-testid="update-settings"
          onClick={() => props.onSettingChange('showActivities', false)}
          type="button"
        >
          Update settings
        </button>
      </div>
    );
  },
}));

const mockUseGPXData = useGPXData as jest.MockedFunction<typeof useGPXData>;
const mockUseLeafletMap = useLeafletMap as jest.MockedFunction<typeof useLeafletMap>;

describe('ActivityMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();

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

  it('loads saved settings from anonymous localStorage key', () => {
    const persistedTileLayerUrl =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const persistedAttribution = 'Tiles © Esri';
    window.localStorage.setItem(
      'rr:map-settings:anon',
      JSON.stringify({
        version: 1,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          showActivities: false,
          tileLayerUrl: persistedTileLayerUrl,
          attribution: persistedAttribution,
        },
      })
    );

    render(<ActivityMap />);

    return waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(false);
      expect(latestLayersPanelProps.settings.tileLayerUrl).toBe(persistedTileLayerUrl);
      expect(latestLayersPanelProps.settings.attribution).toBe(persistedAttribution);

      const latestUseLeafletMapCall = mockUseLeafletMap.mock.calls.at(-1);
      expect(latestUseLeafletMapCall?.[1]).toEqual(
        expect.objectContaining({
          tileLayerUrl: persistedTileLayerUrl,
          attribution: persistedAttribution,
        })
      );
    });
  });

  it('saves settings to user-specific localStorage key when user id is present', async () => {
    window.localStorage.setItem('rr:user-id', 'user-123');

    render(<ActivityMap />);

    await waitFor(() => {
      const persisted = window.localStorage.getItem('rr:map-settings:user:user-123');
      expect(persisted).toBeTruthy();

      const parsed = JSON.parse(persisted as string);
      expect(parsed.version).toBe(1);
      expect(parsed.settings.showActivities).toBe(true);
    });
  });

  it('persists updated settings after user interaction', async () => {
    render(<ActivityMap />);

    const button = screen.getByTestId('update-settings');
    await userEvent.click(button);

    await waitFor(() => {
      const persisted = window.localStorage.getItem('rr:map-settings:anon');
      expect(persisted).toBeTruthy();

      const parsed = JSON.parse(persisted as string);
      expect(parsed.settings.showActivities).toBe(false);
    });
  });
});
