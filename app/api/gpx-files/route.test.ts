import { readdir } from 'fs/promises';
import { GET } from './route';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('app/api/gpx-files/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return list of GPX files', async () => {
    const mockFiles = ['track1.gpx', 'track2.gpx', 'README.md', 'track3.gpx'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual(['track1.gpx', 'track2.gpx', 'track3.gpx']);
    expect(readdir).toHaveBeenCalledWith(expect.stringContaining('public/data/gpx'));
  });

  it('should filter out non-GPX files', async () => {
    const mockFiles = ['track.gpx', 'data.json', 'image.png', 'route.gpx'];
    (readdir as jest.Mock).mockResolvedValue(mockFiles);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual(['track.gpx', 'route.gpx']);
  });

  it('should return empty array when no GPX files exist', async () => {
    (readdir as jest.Mock).mockResolvedValue(['README.md', 'data.json']);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual([]);
  });

  it('should handle errors and return 500 status', async () => {
    const mockError = new Error('Directory not found');
    (readdir as jest.Mock).mockRejectedValue(mockError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.files).toEqual([]);
    expect(data.error).toBe('Error: Directory not found');
  });

  it('should handle empty directory', async () => {
    (readdir as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.files).toEqual([]);
    expect(response.status).toBe(200);
  });
});
