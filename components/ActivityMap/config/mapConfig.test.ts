/**
 * Map Config Tests
 * Tests for map configuration constants
 */

import {
  ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  DEFAULT_LEAFLET_CONFIG,
  HEATMAP_CONFIG,
  REGION_VISIT_COLOR_THRESHOLDS,
} from './mapConfig';

describe('mapConfig', () => {
  describe('HEATMAP_CONFIG', () => {
    it('has required properties', () => {
      expect(HEATMAP_CONFIG.HEATMAP_RENDER_DELAY).toBeDefined();
      expect(HEATMAP_CONFIG.PIXEL_DENSITY).toBeDefined();
      expect(HEATMAP_CONFIG.ACTIVITY_LINE_THICKNESS).toBeDefined();
      expect(HEATMAP_CONFIG.REGION_LINE_THICKNESS).toBeDefined();
    });

    it('has valid numeric values', () => {
      expect(typeof HEATMAP_CONFIG.HEATMAP_RENDER_DELAY).toBe('number');
      expect(typeof HEATMAP_CONFIG.PIXEL_DENSITY).toBe('number');
      expect(typeof HEATMAP_CONFIG.ACTIVITY_LINE_THICKNESS).toBe('number');
      expect(typeof HEATMAP_CONFIG.REGION_LINE_THICKNESS).toBe('number');
    });

    it('has positive values for line thickness', () => {
      expect(HEATMAP_CONFIG.ACTIVITY_LINE_THICKNESS).toBeGreaterThan(0);
      expect(HEATMAP_CONFIG.REGION_LINE_THICKNESS).toBeGreaterThan(0);
    });

    it('has non-negative render delay', () => {
      expect(HEATMAP_CONFIG.HEATMAP_RENDER_DELAY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DEFAULT_LEAFLET_CONFIG', () => {
    it('has center coordinates', () => {
      expect(DEFAULT_LEAFLET_CONFIG.center).toBeDefined();
      expect(Array.isArray(DEFAULT_LEAFLET_CONFIG.center)).toBe(true);
      expect(DEFAULT_LEAFLET_CONFIG.center).toHaveLength(2);
    });

    it('has valid latitude/longitude ranges', () => {
      const [lat, lng] = DEFAULT_LEAFLET_CONFIG.center;
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });

    it('has valid zoom configuration', () => {
      expect(DEFAULT_LEAFLET_CONFIG.zoom).toBeDefined();
      expect(DEFAULT_LEAFLET_CONFIG.maxZoom).toBeDefined();
      expect(DEFAULT_LEAFLET_CONFIG.minZoom).toBeDefined();

      expect(DEFAULT_LEAFLET_CONFIG.zoom).toBeGreaterThanOrEqual(DEFAULT_LEAFLET_CONFIG.minZoom);
      expect(DEFAULT_LEAFLET_CONFIG.zoom).toBeLessThanOrEqual(DEFAULT_LEAFLET_CONFIG.maxZoom);
    });

    it('has tile layer URL', () => {
      expect(DEFAULT_LEAFLET_CONFIG.tileLayerUrl).toBeDefined();
      expect(typeof DEFAULT_LEAFLET_CONFIG.tileLayerUrl).toBe('string');
      expect(DEFAULT_LEAFLET_CONFIG.tileLayerUrl).toContain('{z}');
      expect(DEFAULT_LEAFLET_CONFIG.tileLayerUrl).toContain('{x}');
      expect(DEFAULT_LEAFLET_CONFIG.tileLayerUrl).toContain('{y}');
    });

    it('has attribution string', () => {
      expect(DEFAULT_LEAFLET_CONFIG.attribution).toBeDefined();
      expect(typeof DEFAULT_LEAFLET_CONFIG.attribution).toBe('string');
      expect(DEFAULT_LEAFLET_CONFIG.attribution.length).toBeGreaterThan(0);
    });
  });

  describe('ACTIVITY_HEATMAP_COLOR_THRESHOLDS', () => {
    it('is an array', () => {
      expect(Array.isArray(ACTIVITY_HEATMAP_COLOR_THRESHOLDS)).toBe(true);
    });

    it('has multiple thresholds', () => {
      expect(ACTIVITY_HEATMAP_COLOR_THRESHOLDS.length).toBeGreaterThan(0);
    });

    it('each threshold has required properties', () => {
      ACTIVITY_HEATMAP_COLOR_THRESHOLDS.forEach((threshold) => {
        expect(threshold.threshold).toBeDefined();
        expect(threshold.color).toBeDefined();
        expect(Array.isArray(threshold.color)).toBe(true);
        expect(threshold.color).toHaveLength(4); // RGBA
      });
    });

    it('thresholds are in ascending order', () => {
      for (let i = 1; i < ACTIVITY_HEATMAP_COLOR_THRESHOLDS.length; i++) {
        expect(ACTIVITY_HEATMAP_COLOR_THRESHOLDS[i].threshold).toBeGreaterThan(
          ACTIVITY_HEATMAP_COLOR_THRESHOLDS[i - 1].threshold
        );
      }
    });
  });

  describe('REGION_VISIT_COLOR_THRESHOLDS', () => {
    it('is an array', () => {
      expect(Array.isArray(REGION_VISIT_COLOR_THRESHOLDS)).toBe(true);
    });

    it('has multiple thresholds', () => {
      expect(REGION_VISIT_COLOR_THRESHOLDS.length).toBeGreaterThan(0);
    });

    it('each threshold has required properties', () => {
      REGION_VISIT_COLOR_THRESHOLDS.forEach((threshold) => {
        expect(threshold.threshold).toBeDefined();
        expect(threshold.color).toBeDefined();
        expect(Array.isArray(threshold.color)).toBe(true);
        expect(threshold.color).toHaveLength(4); // RGBA
      });
    });

    it('thresholds are in ascending order', () => {
      for (let i = 1; i < REGION_VISIT_COLOR_THRESHOLDS.length; i++) {
        expect(REGION_VISIT_COLOR_THRESHOLDS[i].threshold).toBeGreaterThanOrEqual(
          REGION_VISIT_COLOR_THRESHOLDS[i - 1].threshold
        );
      }
    });

    it('starts with threshold 0', () => {
      expect(REGION_VISIT_COLOR_THRESHOLDS[0].threshold).toBe(0);
    });
  });
});
