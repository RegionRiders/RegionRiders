import { act } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import { fireEvent, render, screen } from '@/test-utils';
import ActivityMap from './ActivityMap';

// Mock the hooks
jest.mock('../../hooks/useGPXData', () => ({
  useGPXData: jest.fn(),
}));

jest.mock('./hooks/useLeafletMap', () => ({
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
  default: function MockMapOrchestrator(props: { onRegionTileError?: (message: string) => void }) {
    if (props.onRegionTileError) {
      (globalThis as any).__mockOnRegionTileError = props.onRegionTileError;
    }

    return <div data-testid="map-orchestrator">Map Orchestrator</div>;
  },
}));

const mockUseGPXData = useGPXData as jest.MockedFunction<typeof useGPXData>;
const mockUseLeafletMap = useLeafletMap as jest.MockedFunction<typeof useLeafletMap>;

describe('ActivityMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).__mockOnRegionTileError;

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

  it('renders mode selector with heatmap and lines options', () => {
    render(<ActivityMap />);

    expect(screen.getByLabelText('Heatmap')).toBeInTheDocument();
    expect(screen.getByLabelText('Lines')).toBeInTheDocument();
  });

  it('defaults to heatmap mode', () => {
    render(<ActivityMap />);

    const heatmapRadio = screen.getByLabelText('Heatmap') as HTMLInputElement;
    expect(heatmapRadio.checked).toBe(true);
  });

  it('changes mode when user selects lines', () => {
    render(<ActivityMap />);

    const linesRadio = screen.getByLabelText('Lines') as HTMLInputElement;
    fireEvent.click(linesRadio);

    expect(linesRadio.checked).toBe(true);
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

    expect(screen.getByText('Region overlay unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('map-orchestrator')).toBeInTheDocument();
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
});
