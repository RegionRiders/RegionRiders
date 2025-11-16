/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { readdir } from 'fs/promises';
import { logger } from '@/lib/logger';
import { GET } from './route';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('GPX Files API Route', () => {
  const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return list of GPX files successfully', async () => {
    const mockFiles = ['track1.gpx', 'track2.gpx', 'readme.txt', 'track3.gpx'];
    mockReaddir.mockResolvedValue(mockFiles as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      files: ['track1.gpx', 'track2.gpx', 'track3.gpx'],
    });
    expect(mockReaddir).toHaveBeenCalledWith(
      expect.stringContaining('public/data/gpx')
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should filter out non-GPX files', async () => {
    const mockFiles = [
      'track.gpx',
      'image.jpg',
      'data.json',
      'ride.GPX',
      'notes.txt',
    ];
    mockReaddir.mockResolvedValue(mockFiles as any);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual(['track.gpx']);
  });

  it('should return empty array when no GPX files found', async () => {
    const mockFiles = ['readme.txt', 'image.jpg', 'data.json'];
    mockReaddir.mockResolvedValue(mockFiles as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      files: [],
    });
  });

  it('should return empty array when directory is empty', async () => {
    mockReaddir.mockResolvedValue([] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      files: [],
    });
  });

  it('should handle errors when directory does not exist', async () => {
    const error = new Error('ENOENT: no such file or directory');
    mockReaddir.mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.files).toEqual([]);
    expect(data.error).toBeDefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading GPX directory')
    );
  });

  it('should handle permission errors', async () => {
    const error = new Error('EACCES: permission denied');
    mockReaddir.mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.files).toEqual([]);
    expect(data.error).toContain('permission denied');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle unknown errors', async () => {
    const error = new Error('Unknown error');
    mockReaddir.mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.files).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should convert error to string in error response', async () => {
    const error = new Error('Test error message');
    mockReaddir.mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(data.error).toBe('Error: Test error message');
  });
});
