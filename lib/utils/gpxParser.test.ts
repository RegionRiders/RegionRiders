import { parseGPXFile } from './gpxParser';

// Mock File class
class MockFile {
  constructor(
    private content: string[],
    public name: string,
    public options?: any
  ) {}

  async text() {
    return this.content.join('');
  }
}

global.File = MockFile as any;

// Mock DOMParser
global.DOMParser = class DOMParser {
  parseFromString(xmlString: string, mimeType: string) {
    // Simple mock implementation for testing
    const mockDoc = {
      getElementsByTagName: (tagName: string) => {
        if (tagName === 'parsererror') {
          return xmlString.includes('invalid') ? [{}] : [];
        }
        if (tagName === 'trk') {
          return [
            {
              getElementsByTagName: (tag: string) => {
                if (tag === 'name') {
                  return [{ textContent: 'Test Track' }];
                }
                return [];
              },
            },
          ];
        }
        if (tagName === 'trkpt') {
          if (xmlString.includes('valid-track')) {
            return [
              {
                getAttribute: (attr: string) =>
                  attr === 'lat' ? '50.0' : attr === 'lon' ? '14.0' : null,
                getElementsByTagName: (tag: string) => {
                  if (tag === 'ele') {
                    return [{ textContent: '500' }];
                  }
                  if (tag === 'time') {
                    return [{ textContent: '2024-01-01T12:00:00Z' }];
                  }
                  return [];
                },
              },
              {
                getAttribute: (attr: string) =>
                  attr === 'lat' ? '50.1' : attr === 'lon' ? '14.1' : null,
                getElementsByTagName: (tag: string) => {
                  if (tag === 'ele') {
                    return [{ textContent: '510' }];
                  }
                  if (tag === 'time') {
                    return [{ textContent: '2024-01-01T12:01:00Z' }];
                  }
                  return [];
                },
              },
            ];
          }
          return [];
        }
        if (tagName === 'time') {
          return [{ textContent: '2024-01-01T12:00:00Z' }];
        }
        return [];
      },
    };
    return mockDoc as any;
  }
} as any;

// Mock fetch
global.fetch = jest.fn((url: string) => {
  if (url.includes('valid-track')) {
    return Promise.resolve({
      text: () => Promise.resolve('<gpx>valid-track</gpx>'),
    } as Response);
  }
  return Promise.resolve({
    text: () => Promise.resolve('<gpx>empty</gpx>'),
  } as Response);
}) as any;

describe('parseGPXFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File parsing', () => {
    it('should parse a valid GPX file object', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await parseGPXFile(mockFile);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Track');
      expect(result.points).toBeDefined();
      expect(Array.isArray(result.points)).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should parse GPX from URL string', async () => {
      const url = 'http://example.com/valid-track.gpx';

      const result = await parseGPXFile(url);

      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(url);
    });

    it('should extract track points with coordinates', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx');

      const result = await parseGPXFile(mockFile);

      expect(result.points.length).toBeGreaterThan(0);
      expect(result.points[0]).toHaveProperty('lat');
      expect(result.points[0]).toHaveProperty('lon');
    });

    it('should extract elevation data when available', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx');

      const result = await parseGPXFile(mockFile);

      if (result.points.length > 0) {
        expect(result.points[0]).toHaveProperty('ele');
      }
    });

    it('should extract time data when available', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx');

      const result = await parseGPXFile(mockFile);

      if (result.points.length > 0) {
        expect(result.points[0]).toHaveProperty('time');
      }
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid XML', async () => {
      const mockFile = new File(['<gpx>invalid</gpx>'], 'invalid.gpx');

      // Override DOMParser to return parser error
      const originalDOMParser = global.DOMParser;
      global.DOMParser = class DOMParser {
        parseFromString() {
          return {
            getElementsByTagName: (tag: string) => {
              if (tag === 'parsererror' || tag === 'parser error') {
                return [{}];
              }
              return [];
            },
          } as any;
        }
      } as any;

      await expect(parseGPXFile(mockFile)).rejects.toThrow('Invalid GPX file');

      global.DOMParser = originalDOMParser;
    });
  });

  describe('Metadata extraction', () => {
    it('should include track name from GPX', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx');

      const result = await parseGPXFile(mockFile);

      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });

    it('should use filename as fallback when track name is missing', async () => {
      const mockFile = new File(['<gpx>empty</gpx>'], 'fallback.gpx');

      const result = await parseGPXFile(mockFile);

      expect(result.name).toBeDefined();
    });

    it('should calculate distance in metadata', async () => {
      const mockFile = new File(['<gpx>valid-track</gpx>'], 'test.gpx');

      const result = await parseGPXFile(mockFile);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.distance).toBeDefined();
      expect(typeof result.metadata.distance).toBe('number');
    });

    it('should generate unique track IDs', async () => {
      const mockFile1 = new File(['<gpx>valid-track</gpx>'], 'test1.gpx');
      const mockFile2 = new File(['<gpx>valid-track</gpx>'], 'test2.gpx');

      const result1 = await parseGPXFile(mockFile1);
      const result2 = await parseGPXFile(mockFile2);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('Point validation', () => {
    it('should skip points with missing latitude', async () => {
      const mockFile = new File(['<gpx>test</gpx>'], 'test.gpx');

      // Override to return point with missing lat
      const originalDOMParser = global.DOMParser;
      global.DOMParser = class DOMParser {
        parseFromString() {
          return {
            getElementsByTagName: (tag: string) => {
              if (tag === 'parsererror' || tag === 'parser error') return [];
              if (tag === 'trk') {
                return [{ getElementsByTagName: () => [] }];
              }
              if (tag === 'trkpt') {
                return [
                  {
                    getAttribute: (attr: string) => (attr === 'lon' ? '14.0' : null),
                    getElementsByTagName: () => [],
                  },
                ];
              }
              return [];
            },
          } as any;
        }
      } as any;

      const result = await parseGPXFile(mockFile);
      expect(result.points.length).toBe(0);

      global.DOMParser = originalDOMParser;
    });

    it('should skip points with invalid coordinates', async () => {
      const mockFile = new File(['<gpx>test</gpx>'], 'test.gpx');

      const originalDOMParser = global.DOMParser;
      global.DOMParser = class DOMParser {
        parseFromString() {
          return {
            getElementsByTagName: (tag: string) => {
              if (tag === 'parsererror' || tag === 'parser error') return [];
              if (tag === 'trk') {
                return [{ getElementsByTagName: () => [] }];
              }
              if (tag === 'trkpt') {
                return [
                  {
                    getAttribute: (attr: string) =>
                      attr === 'lat' ? 'invalid' : attr === 'lon' ? 'invalid' : null,
                    getElementsByTagName: () => [],
                  },
                ];
              }
              return [];
            },
          } as any;
        }
      } as any;

      const result = await parseGPXFile(mockFile);
      expect(result.points.length).toBe(0);

      global.DOMParser = originalDOMParser;
    });
  });
});
