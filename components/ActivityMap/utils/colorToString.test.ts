import { RGBA } from '@/components/ActivityMap/mapTypes';
import { colorToString, hslaToString } from './colorToString';

describe('colorToString', () => {
  describe('colorToString', () => {
    it('should convert RGBA array to rgba string', () => {
      const color: RGBA = [255, 100, 50, 0.5];
      expect(colorToString(color)).toBe('rgba(255, 100, 50, 0.5)');
    });

    it('should handle full opacity', () => {
      const color: RGBA = [0, 0, 0, 1];
      expect(colorToString(color)).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle zero opacity', () => {
      const color: RGBA = [255, 255, 255, 0];
      expect(colorToString(color)).toBe('rgba(255, 255, 255, 0)');
    });

    it('should handle decimal alpha values', () => {
      const color: RGBA = [128, 128, 128, 0.75];
      expect(colorToString(color)).toBe('rgba(128, 128, 128, 0.75)');
    });
  });

  describe('hslaToString', () => {
    it('should convert HSLA values to hsla string', () => {
      expect(hslaToString(180, 50, 50, 0.5)).toBe('hsla(180, 50%, 50%, 0.5)');
    });

    it('should return hsl string when alpha is 1', () => {
      expect(hslaToString(0, 100, 50, 1)).toBe('hsl(0, 100%, 50%)');
    });

    it('should round h, s, l values', () => {
      expect(hslaToString(180.7, 50.4, 50.9, 1)).toBe('hsl(181, 50%, 51%)');
    });

    it('should handle alpha values with decimal precision', () => {
      expect(hslaToString(120, 75, 25, 0.333)).toBe('hsla(120, 75%, 25%, 0.33)');
    });

    it('should handle zero values', () => {
      expect(hslaToString(0, 0, 0, 0)).toBe('hsla(0, 0%, 0%, 0)');
    });
  });
});
