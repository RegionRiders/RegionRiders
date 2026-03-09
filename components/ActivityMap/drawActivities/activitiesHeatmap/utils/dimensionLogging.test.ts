/**
 * dimensionLogging Tests
 * Tests for dimension error logging utility
 */

import L from 'leaflet';
import { CanvasDimensions } from '@/components/ActivityMap/drawActivities/types';
import { logDimensionError } from './dimensionLogging';

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

describe('logDimensionError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs warning with dimension details', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 800,
      canvasHeight: 600,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(800, 600),
    };

    logDimensionError(dimensions, 10, 'Test error', mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Test error'));
  });

  it('includes canvas dimensions in log message', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 1024,
      canvasHeight: 768,
      topLeft: new L.Point(50, 50),
      bottomRight: new L.Point(1074, 818),
    };

    logDimensionError(dimensions, 12, 'Canvas validation failed', mockLogger);

    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('1024');
    expect(logMessage).toContain('768');
  });

  it('includes zoom level in log message', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
    };

    logDimensionError(dimensions, 15, 'Zoom error', mockLogger);

    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('15');
  });

  it('includes topLeft coordinates in log message', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 200,
      canvasHeight: 200,
      topLeft: new L.Point(123, 456),
      bottomRight: new L.Point(323, 656),
    };

    logDimensionError(dimensions, 8, 'Bounds error', mockLogger);

    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('123');
    expect(logMessage).toContain('456');
  });

  it('includes bottomRight coordinates in log message', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 300,
      canvasHeight: 300,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(789, 321),
    };

    logDimensionError(dimensions, 5, 'Coordinate error', mockLogger);

    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('789');
    expect(logMessage).toContain('321');
  });

  it('handles negative coordinates', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 400,
      canvasHeight: 400,
      topLeft: new L.Point(-100, -50),
      bottomRight: new L.Point(300, 350),
    };

    logDimensionError(dimensions, 7, 'Negative coord error', mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('-100');
    expect(logMessage).toContain('-50');
  });

  it('handles very large values', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 10000,
      canvasHeight: 10000,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(99999, 88888),
    };

    logDimensionError(dimensions, 20, 'Large value error', mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('99999');
    expect(logMessage).toContain('88888');
  });

  it('handles zero zoom', () => {
    const dimensions: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
    };

    logDimensionError(dimensions, 0, 'Zero zoom error', mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const logMessage = mockLogger.warn.mock.calls[0][0];
    expect(logMessage).toContain('"zoom":0');
  });
});
