import { parseGPXFile } from './gpxParser';
import { GPXPoint, GPXTrack } from '@/lib/types/types';

// Mock fetch
global.fetch = jest.fn();

describe('parseGPXFile', () => {
  const validGPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="50.0" lon="20.0">
        <ele>100</ele>
        <time>2024-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="50.1" lon="20.1">
        <ele>110</ele>
        <time>2024-01-01T10:01:00Z</time>
      </trkpt>
      <trkpt lat="50.2" lon="20.2">
        <ele>120</ele>
        <time>2024-01-01T10:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <time>2024-01-01T10:00:00Z</time>
</gpx>`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parsing from URL', () => {
    it('should parse valid GPX from URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => validGPX,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.name).toBe('Test Track');
      expect(result.points).toHaveLength(3);
      expect(result.points[0]).toMatchObject({
        lat: 50.0,
        lon: 20.0,
        ele: 100,
        time: '2024-01-01T10:00:00Z',
      });
      expect(result.metadata?.date).toBe('2024-01-01T10:00:00Z');
      expect(result.metadata?.distance).toBeGreaterThan(0);
    });

    it('should handle GPX without track name', async () => {
      const gpxNoName = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0">
        <ele>100</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => gpxNoName,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.name).toBe('Unknown Track');
    });
  });

  describe('parsing from File object', () => {
    it('should parse valid GPX from File', async () => {
      const file = new File([validGPX], 'test.gpx', { type: 'application/gpx+xml' });

      const result = await parseGPXFile(file);

      expect(result.name).toBe('Test Track');
      expect(result.points).toHaveLength(3);
    });

    it('should use filename when track name is missing', async () => {
      const gpxNoName = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = new File([gpxNoName], 'myroute.gpx', { type: 'application/gpx+xml' });

      const result = await parseGPXFile(file);

      expect(result.name).toBe('myroute.gpx');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid XML', async () => {
      const invalidXML = 'This is not XML';

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => invalidXML,
      });

      await expect(parseGPXFile('/data/invalid.gpx')).rejects.toThrow('Invalid GPX file');
    });

    it('should handle malformed GPX gracefully', async () => {
      const malformedGPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="invalid" lon="invalid"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => malformedGPX,
      });

      const result = await parseGPXFile('/data/malformed.gpx');

      expect(result.points).toHaveLength(0);
    });
  });

  describe('point parsing', () => {
    it('should skip points with missing coordinates', async () => {
      const gpxMissingCoords = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"><ele>100</ele></trkpt>
      <trkpt lat="50.1"><ele>110</ele></trkpt>
      <trkpt lon="20.2"><ele>120</ele></trkpt>
      <trkpt lat="50.3" lon="20.3"><ele>130</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => gpxMissingCoords,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.points).toHaveLength(2);
      expect(result.points[0].lat).toBe(50.0);
      expect(result.points[1].lat).toBe(50.3);
    });

    it('should handle points without elevation', async () => {
      const gpxNoEle = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => gpxNoEle,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.points[0].ele).toBe(0);
    });

    it('should handle points without time', async () => {
      const gpxNoTime = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => gpxNoTime,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.points[0].time).toBeUndefined();
    });
  });

  describe('distance calculation', () => {
    it('should calculate distance for multiple points', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => validGPX,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.metadata?.distance).toBeGreaterThan(0);
    });

    it('should return 0 distance for single point', async () => {
      const singlePoint = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => singlePoint,
      });

      const result = await parseGPXFile('/data/test.gpx');

      expect(result.metadata?.distance).toBe(0);
    });

    it('should calculate reasonable distances using haversine', async () => {
      // Points roughly 111km apart (1 degree latitude)
      const oneDegreeLat = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="20.0"></trkpt>
      <trkpt lat="51.0" lon="20.0"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => oneDegreeLat,
      });

      const result = await parseGPXFile('/data/test.gpx');

      // Should be around 111km
      expect(result.metadata?.distance).toBeGreaterThan(100);
      expect(result.metadata?.distance).toBeLessThan(120);
    });
  });

  describe('id generation', () => {
    it('should generate unique IDs for tracks', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => validGPX,
      });

      const result1 = await parseGPXFile('/data/test1.gpx');
      const result2 = await parseGPXFile('/data/test2.gpx');

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^track_\d+_/);
      expect(result2.id).toMatch(/^track_\d+_/);
    });
  });
});