/**
 * trackProcessor Tests
 * Tests for track rendering processor utility
 */

import { GPXTrack } from '@/lib/types';
import { processTracksChunked } from './trackProcessor';

// Mock drawLineToAccumulator
jest.mock('./drawLineToAccumulator', () => ({
  drawLineToAccumulator: jest.fn(),
}));

import { drawLineToAccumulator } from './drawLineToAccumulator';

const mockDrawLineToAccumulator = drawLineToAccumulator as jest.MockedFunction<
  typeof drawLineToAccumulator
>;

// Mock requestAnimationFrame
let rafCallback: (() => void) | null = null;
global.requestAnimationFrame = jest.fn((cb) => {
  rafCallback = cb;
  return 1;
});

describe('processTracksChunked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallback = null;
  });

  it('calls onComplete when no tracks are provided', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(100);
    const latlngToPixel = jest.fn();

    processTracksChunked([], accumulator, 100, 100, latlngToPixel, 2, renderAbortRef, onComplete);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('processes tracks with points', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);
    const latlngToPixel = jest.fn().mockImplementation((lat, lon) => ({
      x: lat * 10,
      y: lon * 10,
    }));

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Test Track',
        points: [
          { lat: 1, lon: 1 },
          { lat: 2, lon: 2 },
          { lat: 3, lon: 3 },
        ],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    // Should call drawLineToAccumulator for each pair of consecutive points
    expect(mockDrawLineToAccumulator).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips tracks with no points', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);
    const latlngToPixel = jest.fn();

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Empty Track',
        points: [],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    expect(mockDrawLineToAccumulator).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips tracks with single point', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);
    const latlngToPixel = jest.fn();

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Single Point Track',
        points: [{ lat: 1, lon: 1 }],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    // No line segments for single point
    expect(mockDrawLineToAccumulator).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('processes multiple tracks', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);
    const latlngToPixel = jest.fn().mockImplementation((lat, lon) => ({
      x: lat,
      y: lon,
    }));

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Track 1',
        points: [
          { lat: 1, lon: 1 },
          { lat: 2, lon: 2 },
        ],
      },
      {
        id: 'track2',
        name: 'Track 2',
        points: [
          { lat: 3, lon: 3 },
          { lat: 4, lon: 4 },
          { lat: 5, lon: 5 },
        ],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    // Track 1: 1 segment (2 points - 1)
    // Track 2: 2 segments (3 points - 1)
    expect(mockDrawLineToAccumulator).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('aborts when renderAbortRef is true', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: true };
    const accumulator = new Float32Array(10000);
    const latlngToPixel = jest.fn();

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Test Track',
        points: [
          { lat: 1, lon: 1 },
          { lat: 2, lon: 2 },
        ],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    // Should abort immediately without processing
    expect(mockDrawLineToAccumulator).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('passes correct parameters to drawLineToAccumulator', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);
    const canvasWidth = 200;
    const canvasHeight = 150;
    const lineThickness = 3;

    const latlngToPixel = jest.fn().mockImplementation((lat, lon) => ({
      x: lat * 100,
      y: lon * 100,
    }));

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Test Track',
        points: [
          { lat: 0.5, lon: 0.5 },
          { lat: 1.0, lon: 1.0 },
        ],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      canvasWidth,
      canvasHeight,
      latlngToPixel,
      lineThickness,
      renderAbortRef,
      onComplete
    );

    expect(mockDrawLineToAccumulator).toHaveBeenCalledWith(
      accumulator,
      canvasWidth,
      canvasHeight,
      50, // 0.5 * 100
      50, // 0.5 * 100
      100, // 1.0 * 100
      100, // 1.0 * 100
      lineThickness
    );
  });

  it('calls latlngToPixel for each point', () => {
    const onComplete = jest.fn();
    const renderAbortRef = { current: false };
    const accumulator = new Float32Array(10000);

    const latlngToPixel = jest.fn().mockReturnValue({ x: 50, y: 50 });

    const tracks: GPXTrack[] = [
      {
        id: 'track1',
        name: 'Test Track',
        points: [
          { lat: 1, lon: 2 },
          { lat: 3, lon: 4 },
          { lat: 5, lon: 6 },
        ],
      },
    ];

    processTracksChunked(
      tracks,
      accumulator,
      100,
      100,
      latlngToPixel,
      2,
      renderAbortRef,
      onComplete
    );

    // Should call for each point in segments
    // Segment 1: points 0 and 1
    // Segment 2: points 1 and 2
    // Total: 4 calls
    expect(latlngToPixel).toHaveBeenCalledTimes(4);
    expect(latlngToPixel).toHaveBeenCalledWith(1, 2);
    expect(latlngToPixel).toHaveBeenCalledWith(3, 4);
    expect(latlngToPixel).toHaveBeenCalledWith(5, 6);
  });
});
