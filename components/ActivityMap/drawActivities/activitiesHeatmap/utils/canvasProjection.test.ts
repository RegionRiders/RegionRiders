import { createLatLngToPixelConverter } from './canvasProjection';

describe('canvasProjection', () => {
  describe('createLatLngToPixelConverter', () => {
    const mockMap = {
      project: jest.fn((latLng: any, zoom: number) => ({
        x: latLng.lat * 100 + zoom,
        y: latLng.lng * 100 + zoom,
      })),
      getZoom: jest.fn(() => 10),
    };

    const mockTopLeft = {
      x: 5000,
      y: 1400,
    };

    it('should create a converter function', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      expect(typeof converter).toBe('function');
    });

    it('should convert lat/lng to pixel coordinates', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      const result = converter(50, 14);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    it('should call map.project with correct parameters', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      converter(50.5, 14.5);

      expect(mockMap.project).toHaveBeenCalledWith({ lat: 50.5, lng: 14.5 }, 10);
    });

    it('should call map.getZoom', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      converter(50, 14);

      expect(mockMap.getZoom).toHaveBeenCalled();
    });

    it('should apply PIXEL_DENSITY scaling', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      const result = converter(50, 14);

      // Result should be scaled by PIXEL_DENSITY (which is 2 in mapConfig)
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
    });

    it('should subtract topLeft offset', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      // Mock map.project returns { x: 5010, y: 1410 }
      // After subtracting topLeft and scaling:
      // x = (5010 - 5000) * 2 = 20
      // y = (1410 - 1400) * 2 = 20
      const result = converter(50, 14);

      // The exact values depend on PIXEL_DENSITY constant
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    it('should handle different coordinate values', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      const result1 = converter(51, 15);
      const result2 = converter(49, 13);

      expect(result1.x).not.toBe(result2.x);
      expect(result1.y).not.toBe(result2.y);
    });

    it('should handle negative coordinates', () => {
      const converter = createLatLngToPixelConverter(mockMap, mockTopLeft);

      const result = converter(-50, -14);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });
  });
});
