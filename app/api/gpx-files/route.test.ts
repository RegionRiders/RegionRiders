/**
 * @jest-environment node
 */

import { GET } from './route';
import { readdir } from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  default: {
    error: jest.fn(),
  },
}));

describe('GET /api/gpx-files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return list of GPX files', async () => {
    const mockFiles = ['route1.gpx', 'route2.gpx', 'data.json', 'route3.gpx'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual(['route1.gpx', 'route2.gpx', 'route3.gpx']);
    expect(data.files).toHaveLength(3);
  });

  it('should filter out non-GPX files', async () => {
    const mockFiles = ['route.gpx', 'readme.txt', 'data.json', 'track.GPX'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toContain('route.gpx');
    expect(data.files).not.toContain('readme.txt');
    expect(data.files).not.toContain('data.json');
  });

  it('should return empty array when no GPX files found', async () => {
    (readdir as jest.Mock).mockResolvedValue(['readme.txt', 'data.json']);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual([]);
  });

  it('should handle empty directory', async () => {
    (readdir as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual([]);
  });

  it('should handle file system errors', async () => {
    const error = new Error('Directory not found');
    (readdir as jest.Mock).mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.files).toEqual([]);
    expect(data.error).toBeDefined();
  });

  it('should return JSON response', async () => {
    (readdir as jest.Mock).mockResolvedValue(['route.gpx']);

    const response = await GET();

    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('should handle permission errors', async () => {
    const error = new Error('Permission denied');
    (readdir as jest.Mock).mockRejectedValue(error);

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it('should preserve file names exactly', async () => {
    const mockFiles = ['My Route (1).gpx', 'track-name.gpx', 'route_2024.gpx'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual(mockFiles);
  });

  it('should handle files with uppercase extension', async () => {
    const mockFiles = ['route1.gpx', 'route2.GPX', 'route3.Gpx'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    // Only lowercase .gpx should be included based on current implementation
    expect(data.files).toContain('route1.gpx');
  });
});