/**
 * @jest-environment jsdom
 */

import L from 'leaflet';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { attachActivityHoverEvents } from '@/components/ActivityMap/hooks/activity/activitiesLines/utils/activityLineEvents';
import type { GPXTrack } from '@/lib/types';
import type { LinesRefs } from '../activityTypes';
import { drawActivitiesAsLines } from './drawActivitiesAsLines';

// Mock leaflet
jest.mock('leaflet', () => {
  const featureGroupMock = jest.fn(() => ({
    addLayer: jest.fn(),
    addTo: jest.fn(),
  }));

  const canvasMock = jest.fn(() => ({}));
  const polylineMock = jest.fn(() => ({
    on: jest.fn(),
  }));

  return {
    __esModule: true,
    default: {
      featureGroup: featureGroupMock,
      canvas: canvasMock,
      polyline: polylineMock,
    },
    featureGroup: featureGroupMock,
    canvas: canvasMock,
    polyline: polylineMock,
  };
});

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock utilities
jest.mock('../utils/ensureMapPane', () => ({
  ensureMapPane: jest.fn(),
}));

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesLines/utils/filterVisibleTracks',
  () => ({
    filterVisibleTracks: jest.fn((tracks: Map<string, GPXTrack>) => Array.from(tracks.entries())),
  })
);

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesLines/utils/activityLineEvents',
  () => ({
    attachActivityHoverEvents: jest.fn(),
    attachActivityClickHandler: jest.fn(),
  })
);

describe('drawActivitiesAsLines', () => {
  let mockMap: any;
  let mockTracks: Map<string, GPXTrack>;
  let refs: LinesRefs;

  const defaultLineColor: RGBA = [255, 0, 0, 1];
  const defaultHoverColor: RGBA = [255, 100, 100, 1];

  beforeEach(() => {
    jest.clearAllMocks();

    const pane = { style: { opacity: '1' } };
    mockMap = {
      getBounds: jest.fn(() => ({
        contains: jest.fn(() => true),
      })),
      getPane: jest.fn(() => pane),
      on: jest.fn(),
      off: jest.fn(),
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      addLayer: jest.fn(), // needed by activityGroup.addTo(map)
    };

    mockTracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Test Track',
          points: [
            { lat: 49.5, lon: 14.5 },
            { lat: 49.6, lon: 14.6 },
          ],
          metadata: { distance: 10.0 },
        },
      ],
    ]);

    refs = {
      renderAbortRef: { current: false },
      renderTimeoutRef: { current: null },
      lineThickness: 2,
      lineColor: defaultLineColor,
      lineHoverColor: defaultHoverColor,
      layerTransparency: 1,
    };
  });

  it('should attach event listeners to map', () => {
    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should return cleanup function', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
  });

  it('should remove event listeners on cleanup', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, refs);

    cleanup();

    expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('should set renderAbortRef to true on cleanup', () => {
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, refs);

    cleanup();

    expect(refs.renderAbortRef.current).toBe(true);
  });

  it('should create canvas renderer', () => {
    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(L.canvas).toHaveBeenCalledWith({ pane: 'linesPane' });
  });

  it('should set pane opacity from layer transparency slider', () => {
    refs.layerTransparency = 0.4;
    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(mockMap.getPane).toHaveBeenCalledWith('linesPane');
    const pane = mockMap.getPane.mock.results.find(
      (result: { value?: { style?: { opacity?: string } } }) => result.value && result.value.style
    )?.value;
    expect(pane?.style.opacity).toBe('0.4');
  });

  it('should create feature group for tracks', () => {
    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(L.featureGroup).toHaveBeenCalled();
  });

  it('should derive line and hover weights from shared thickness control', () => {
    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(L.polyline).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ weight: 3 })
    );
    expect(attachActivityHoverEvents).toHaveBeenCalledWith(
      expect.any(Object),
      refs.lineColor,
      refs.lineHoverColor,
      3,
      6
    );
  });

  it('should handle empty tracks map', () => {
    const emptyTracks = new Map<string, GPXTrack>();

    const cleanup = drawActivitiesAsLines(mockMap, emptyTracks, refs);

    expect(cleanup).toBeDefined();
  });

  it('should clean up activity group on cleanup', () => {
    const mockActivityGroup = {
      addLayer: jest.fn(),
      addTo: jest.fn(),
    };

    (L.featureGroup as jest.Mock).mockReturnValue(mockActivityGroup);
    mockMap.hasLayer.mockReturnValue(true);

    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, refs);

    cleanup();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockActivityGroup);
  });

  it('should reset pane opacity to 1 on cleanup', () => {
    refs.layerTransparency = 0.4;
    const cleanup = drawActivitiesAsLines(mockMap, mockTracks, refs);
    cleanup();

    const pane = mockMap.getPane.mock.results.find(
      (result: { value?: { style?: { opacity?: string } } }) => result.value && result.value.style
    )?.value;
    expect(pane?.style.opacity).toBe('1');
  });

  it('should not abort initial rendering when renderAbortRef was true before call', () => {
    // Even if set to true before, current implementation always does initial render
    refs.renderAbortRef.current = true;

    drawActivitiesAsLines(mockMap, mockTracks, refs);

    expect(L.featureGroup).toHaveBeenCalled();
  });
});
