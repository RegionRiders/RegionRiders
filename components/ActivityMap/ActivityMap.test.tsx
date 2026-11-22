import { act } from '@testing-library/react';
import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import {
  loadAuthenticatedUserIdFromApi,
  loadMapSettingsFromApi,
  saveMapSettingsToApi,
} from '@/components/ActivityMap/storage/mapSettingsApi';
import { MAP_SETTINGS_STORAGE_VERSION } from '@/components/ActivityMap/storage/mapSettingsPersistence';
import { useGPXData } from '@/hooks/useGPXData';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import ActivityMap, { SETTINGS_PERSIST_DEBOUNCE_MS } from './ActivityMap';

const mockLayersPanel = jest.fn();
const mockMapOrchestrator = jest.fn();
const INITIAL_PERSIST_WAIT_MS = SETTINGS_PERSIST_DEBOUNCE_MS;

const advanceInitialPersistWindow = () => {
  act(() => {
    jest.advanceTimersByTime(INITIAL_PERSIST_WAIT_MS);
  });
};

const flushHydrationPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

// Mock the hooks
jest.mock('../../hooks/useGPXData', () => ({
  useGPXData: jest.fn(),
}));

jest.mock('@/components/ActivityMap/hooks/map/useLeafletMap', () => ({
  useLeafletMap: jest.fn(),
}));

jest.mock('@/components/ActivityMap/storage/mapSettingsApi', () => ({
  isUnauthenticatedMapSettingsResult: (value: unknown) =>
    Boolean(
      value &&
      typeof value === 'object' &&
      'unauthenticated' in (value as Record<string, unknown>) &&
      (value as { unauthenticated?: unknown }).unauthenticated === true
    ),
  loadAuthenticatedUserIdFromApi: jest.fn(),
  loadMapSettingsFromApi: jest.fn(),
  saveMapSettingsToApi: jest.fn(),
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
  default: function MockMapOrchestrator(props: { onRegionTileError?: (message: string) => void }) {
    mockMapOrchestrator(props);
    if (props.onRegionTileError) {
      (globalThis as any).__mockOnRegionTileError = props.onRegionTileError;
    }

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
        <button
          data-testid="update-region-transparency"
          onClick={() => props.onSettingChange('regionLayerTransparency', 0.35)}
          type="button"
        >
          Update region transparency
        </button>
        <button
          data-testid="update-region-border-thickness"
          onClick={() => props.onSettingChange('regionBorderThickness', 5)}
          type="button"
        >
          Update region border thickness
        </button>
        <button
          data-testid="update-region-mode"
          onClick={() => props.onSettingChange('regionMode', 'heatmap')}
          type="button"
        >
          Update region mode
        </button>
      </div>
    );
  },
}));

const mockUseGPXData = useGPXData as jest.MockedFunction<typeof useGPXData>;
const mockUseLeafletMap = useLeafletMap as jest.MockedFunction<typeof useLeafletMap>;
const mockLoadMapSettingsFromApi = loadMapSettingsFromApi as jest.MockedFunction<
  typeof loadMapSettingsFromApi
>;
const mockLoadAuthenticatedUserIdFromApi = loadAuthenticatedUserIdFromApi as jest.MockedFunction<
  typeof loadAuthenticatedUserIdFromApi
>;
const mockSaveMapSettingsToApi = saveMapSettingsToApi as jest.MockedFunction<
  typeof saveMapSettingsToApi
>;

type HydrationSettingsResolver = (value: {
  userId: string;
  settings: Partial<typeof DEFAULT_MAP_SETTINGS>;
  updatedAt: string;
}) => void;

describe('ActivityMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).__mockOnRegionTileError;
    window.localStorage.clear();
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue(null);
    mockLoadMapSettingsFromApi.mockResolvedValue(null);
    mockSaveMapSettingsToApi.mockResolvedValue(true);

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

  afterEach(async () => {
    await flushHydrationPromises();
    if (jest.isMockFunction(setTimeout)) {
      jest.clearAllTimers();
    }
    jest.useRealTimers();
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

  it('shows a non-fatal region overlay error message', () => {
    render(<ActivityMap />);

    const reportError = (globalThis as any).__mockOnRegionTileError as
      | ((message: string) => void)
      | undefined;

    expect(reportError).toBeDefined();

    act(() => {
      reportError?.('Region overlay unavailable');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Region overlay unavailable');
    expect(screen.getByTestId('map-orchestrator')).toBeInTheDocument();
  });

  it('announces the region overlay error through a live status region', () => {
    render(<ActivityMap />);

    const reportError = (globalThis as any).__mockOnRegionTileError as
      | ((message: string) => void)
      | undefined;

    act(() => {
      reportError?.('Region overlay unavailable');
    });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  it('clears a prior region overlay error when the overlay recovers', () => {
    render(<ActivityMap />);

    const reportError = (globalThis as any).__mockOnRegionTileError as
      | ((message: string) => void)
      | undefined;

    act(() => {
      reportError?.('Region overlay unavailable');
    });

    expect(screen.getByText('Region overlay unavailable')).toBeInTheDocument();

    act(() => {
      reportError?.('');
    });

    expect(screen.queryByText('Region overlay unavailable')).not.toBeInTheDocument();
  });

  it('keeps a single visible overlay error when the same message is reported repeatedly', () => {
    render(<ActivityMap />);

    const reportError = (globalThis as any).__mockOnRegionTileError as
      | ((message: string) => void)
      | undefined;

    act(() => {
      reportError?.('Region overlay unavailable');
      reportError?.('Region overlay unavailable');
    });

    expect(screen.getAllByText('Region overlay unavailable')).toHaveLength(1);
  });

  it('keeps the map shell and overlay status intact while region settings change', async () => {
    render(<ActivityMap />);

    const reportError = (globalThis as any).__mockOnRegionTileError as
      | ((message: string) => void)
      | undefined;

    act(() => {
      reportError?.('Region overlay unavailable');
    });

    await userEvent.click(screen.getByTestId('update-region-transparency'));
    await userEvent.click(screen.getByTestId('update-region-border-thickness'));
    await userEvent.click(screen.getByTestId('update-region-mode'));

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.regionLayerTransparency).toBe(0.35);
      expect(latestLayersPanelProps.settings.regionBorderThickness).toBe(5);
      expect(latestLayersPanelProps.settings.regionMode).toBe('heatmap');

      const latestMapOrchestratorProps = mockMapOrchestrator.mock.calls.at(-1)?.[0];
      expect(latestMapOrchestratorProps.settings.regionLayerTransparency).toBe(0.35);
      expect(latestMapOrchestratorProps.settings.regionBorderThickness).toBe(5);
      expect(latestMapOrchestratorProps.settings.regionMode).toBe('heatmap');
    });

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('map-orchestrator')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Region overlay unavailable');
  });

  it('loads saved settings from anonymous localStorage key', () => {
    const persistedTileLayerUrl =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const persistedAttribution = 'Tiles © Esri';
    window.localStorage.setItem(
      'rr:map-settings:anon',
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
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

  it('prefers newer user-scoped local settings when they are fresher than API settings', async () => {
    const userId = 'user-local-fresh-123';
    const persistedTileLayerUrl = 'https://example.com/local/{z}/{x}/{y}';
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue(userId);
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId,
      settings: {
        ...DEFAULT_MAP_SETTINGS,
        showActivities: true,
        tileLayerUrl: 'https://example.com/api/{z}/{x}/{y}',
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    window.localStorage.setItem(
      `rr:map-settings:user:${userId}`,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-02-01T00:00:00.000Z',
        settings: {
          ...DEFAULT_MAP_SETTINGS,
          showActivities: false,
          tileLayerUrl: persistedTileLayerUrl,
        },
      })
    );

    render(<ActivityMap />);
    await flushHydrationPromises();

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(false);
      expect(latestLayersPanelProps.settings.tileLayerUrl).toBe(persistedTileLayerUrl);
    });
  });

  it('prefers API settings when API timestamp is equal to or newer than local savedAt', async () => {
    const userId = 'user-api-fresh-123';
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue(userId);
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId,
      settings: {
        ...DEFAULT_MAP_SETTINGS,
        showActivities: true,
      },
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
    window.localStorage.setItem(
      `rr:map-settings:user:${userId}`,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          ...DEFAULT_MAP_SETTINGS,
          showActivities: false,
          tileLayerUrl: 'https://example.com/local/{z}/{x}/{y}',
        },
      })
    );

    render(<ActivityMap />);
    await flushHydrationPromises();

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(true);
    });

    expect(window.localStorage.getItem(`rr:map-settings:user:${userId}`)).toBeNull();
  });

  it('does not let in-flight hydration overwrite user edits or clear local fallback', async () => {
    const userId = 'user-hydration-race-123';
    let resolveSettingsApi: HydrationSettingsResolver | null = null;

    mockLoadMapSettingsFromApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSettingsApi = resolve as HydrationSettingsResolver;
        })
    );

    window.localStorage.setItem(
      `rr:map-settings:user:${userId}`,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          ...DEFAULT_MAP_SETTINGS,
          showActivities: false,
        },
      })
    );

    render(<ActivityMap />);

    const button = screen.getByTestId('update-settings');
    await userEvent.click(button);

    await waitFor(() => {
      expect(resolveSettingsApi).toBeInstanceOf(Function);
    });

    if (!resolveSettingsApi) {
      throw new Error('Expected hydration settings resolver to be set');
    }

    const resolvedSettingsApi = resolveSettingsApi as HydrationSettingsResolver;

    resolvedSettingsApi({
      userId,
      settings: {
        ...DEFAULT_MAP_SETTINGS,
        showActivities: true,
      },
      updatedAt: '2026-02-01T00:00:00.000Z',
    });

    await flushHydrationPromises();

    expect(window.localStorage.getItem(`rr:map-settings:user:${userId}`)).toBeTruthy();

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(false);
    });
  });

  it('uses auth-session user id for local fallback saves when settings API read fails', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue(null);

    jest.useFakeTimers();
    render(<ActivityMap />);
    await flushHydrationPromises();
    expect(mockLoadAuthenticatedUserIdFromApi).toHaveBeenCalled();
    advanceInitialPersistWindow();
    jest.useRealTimers();

    expect(window.localStorage.getItem('rr:map-settings:user:user-123')).toBeNull();
    expect(mockSaveMapSettingsToApi).not.toHaveBeenCalled();

    const button = screen.getByTestId('update-settings');
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockSaveMapSettingsToApi).not.toHaveBeenCalled();
      const persisted = window.localStorage.getItem('rr:map-settings:user:user-123');
      expect(persisted).toBeTruthy();
    });
  });

  it('does not bump user-scoped local savedAt during hydration when settings API read fails', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue(null);

    const originalSavedAt = '2026-03-01T00:00:00.000Z';
    window.localStorage.setItem(
      'rr:map-settings:user:user-123',
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: originalSavedAt,
        settings: {
          ...DEFAULT_MAP_SETTINGS,
          showActivities: false,
        },
      })
    );

    jest.useFakeTimers();
    render(<ActivityMap />);
    await flushHydrationPromises();
    advanceInitialPersistWindow();
    jest.useRealTimers();

    const persisted = window.localStorage.getItem('rr:map-settings:user:user-123');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.savedAt).toBe(originalSavedAt);
  });

  it('does not request auth-session when settings API provides user id', async () => {
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId: 'user-123',
      settings: {
        showActivities: true,
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    render(<ActivityMap />);

    await waitFor(() => {
      expect(mockLoadMapSettingsFromApi).toHaveBeenCalled();
    });
    expect(mockLoadAuthenticatedUserIdFromApi).not.toHaveBeenCalled();
  });

  it('does not request auth-session when settings API returns unauthenticated', async () => {
    mockLoadMapSettingsFromApi.mockResolvedValue({
      unauthenticated: true,
    });

    render(<ActivityMap />);

    await waitFor(() => {
      expect(mockLoadMapSettingsFromApi).toHaveBeenCalled();
    });
    expect(mockLoadAuthenticatedUserIdFromApi).not.toHaveBeenCalled();
  });

  it('does not treat epoch API updatedAt as missing timestamp', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId: 'user-123',
      settings: {
        showActivities: true,
      },
      updatedAt: '1970-01-01T00:00:00.000Z',
    });
    window.localStorage.setItem(
      'rr:map-settings:user:user-123',
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '1969-12-31T23:59:59.000Z',
        settings: {
          showActivities: false,
        },
      })
    );

    render(<ActivityMap />);

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(true);
    });
  });

  it('does not prefer empty user-scoped local settings over non-empty API settings', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId: 'user-123',
      settings: {
        showActivities: true,
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    window.localStorage.setItem(
      'rr:map-settings:user:user-123',
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-02-01T00:00:00.000Z',
        settings: {},
      })
    );

    render(<ActivityMap />);

    await waitFor(() => {
      const latestLayersPanelProps = mockLayersPanel.mock.calls.at(-1)?.[0];
      expect(latestLayersPanelProps.settings.showActivities).toBe(true);
    });
  });

  it('saves settings to authenticated API when user id is present', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId: 'user-123',
      settings: {
        showActivities: true,
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    jest.useFakeTimers();
    render(<ActivityMap />);
    await flushHydrationPromises();
    expect(mockLoadMapSettingsFromApi).toHaveBeenCalled();
    advanceInitialPersistWindow();
    jest.useRealTimers();
    expect(mockSaveMapSettingsToApi).not.toHaveBeenCalled();

    const button = screen.getByTestId('update-settings');
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockSaveMapSettingsToApi).toHaveBeenCalledWith(
        expect.objectContaining({
          showActivities: false,
        })
      );
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

  it('falls back to local storage when authenticated API save fails', async () => {
    mockLoadAuthenticatedUserIdFromApi.mockResolvedValue('user-123');
    mockLoadMapSettingsFromApi.mockResolvedValue({
      userId: 'user-123',
      settings: {
        showActivities: true,
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    render(<ActivityMap />);
    await waitFor(() => expect(mockLoadMapSettingsFromApi).toHaveBeenCalled());

    mockSaveMapSettingsToApi.mockResolvedValue(false);
    const button = screen.getByTestId('update-settings');
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockSaveMapSettingsToApi).toHaveBeenCalled();
      const persisted = window.localStorage.getItem('rr:map-settings:user:user-123');
      expect(persisted).toBeTruthy();
    });
  });
});
