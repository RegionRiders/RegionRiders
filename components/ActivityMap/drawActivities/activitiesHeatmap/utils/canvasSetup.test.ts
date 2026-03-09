/**
 * canvasSetup Tests
 * Tests for canvas creation utility
 */

import { createCanvasContext } from './canvasSetup';

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

describe('createCanvasContext', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeAll(() => {
    // Save original getContext
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });

  afterAll(() => {
    // Restore original getContext
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getContext to return a mock 2D context
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      drawImage: jest.fn(),
      setTransform: jest.fn(),
      canvas: {},
    } as unknown as CanvasRenderingContext2D);
  });

  it('creates canvas with correct dimensions', () => {
    const result = createCanvasContext(800, 600, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.canvas.width).toBe(800);
    expect(result?.canvas.height).toBe(600);
  });

  it('returns context object', () => {
    const result = createCanvasContext(100, 100, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.ctx).toBeDefined();
  });

  it('handles small dimensions', () => {
    const result = createCanvasContext(1, 1, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.canvas.width).toBe(1);
    expect(result?.canvas.height).toBe(1);
  });

  it('handles large dimensions', () => {
    const result = createCanvasContext(4096, 4096, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.canvas.width).toBe(4096);
    expect(result?.canvas.height).toBe(4096);
  });

  it('returns null and logs error when getContext fails', () => {
    // Mock getContext to return null
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

    const result = createCanvasContext(100, 100, mockLogger);

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to get canvas context');
  });

  it('does not log error on success', () => {
    // Use the default mock that returns a valid context
    const result = createCanvasContext(100, 100, mockLogger);

    expect(result).not.toBeNull();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('handles zero width gracefully', () => {
    const result = createCanvasContext(0, 100, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.canvas.width).toBe(0);
  });

  it('handles zero height gracefully', () => {
    const result = createCanvasContext(100, 0, mockLogger);

    expect(result).not.toBeNull();
    expect(result?.canvas.height).toBe(0);
  });
});
