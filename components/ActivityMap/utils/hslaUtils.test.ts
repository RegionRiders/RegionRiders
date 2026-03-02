import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { hslaToRgba, parseHslaString, rgbaToHsla } from './hslaUtils';

describe('hslaUtils', () => {
  describe('rgbaToHsla', () => {
    it('should convert red to HSL', () => {
      const result = rgbaToHsla(255, 0, 0, 1);
      expect(result.h).toBe(0);
      expect(result.s).toBeCloseTo(100);
      expect(result.l).toBeCloseTo(50);
      expect(result.a).toBe(1);
    });

    it('should convert green to HSL', () => {
      const result = rgbaToHsla(0, 255, 0, 1);
      expect(result.h).toBeCloseTo(120);
      expect(result.s).toBeCloseTo(100);
      expect(result.l).toBeCloseTo(50);
    });

    it('should convert blue to HSL', () => {
      const result = rgbaToHsla(0, 0, 255, 1);
      expect(result.h).toBeCloseTo(240);
      expect(result.s).toBeCloseTo(100);
      expect(result.l).toBeCloseTo(50);
    });

    it('should convert white to HSL', () => {
      const result = rgbaToHsla(255, 255, 255, 1);
      expect(result.l).toBeCloseTo(100);
      expect(result.s).toBe(0);
    });

    it('should convert black to HSL', () => {
      const result = rgbaToHsla(0, 0, 0, 1);
      expect(result.l).toBe(0);
    });

    it('should preserve alpha value', () => {
      const result = rgbaToHsla(128, 128, 128, 0.5);
      expect(result.a).toBe(0.5);
    });

    it('should handle gray (no saturation)', () => {
      const result = rgbaToHsla(128, 128, 128, 1);
      expect(result.s).toBe(0);
    });
  });

  describe('hslaToRgba', () => {
    it('should convert red HSL to RGBA', () => {
      const result = hslaToRgba(0, 100, 50, 1);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
      expect(result[3]).toBe(1);
    });

    it('should convert green HSL to RGBA', () => {
      const result = hslaToRgba(120, 100, 50, 1);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(0);
    });

    it('should convert blue HSL to RGBA', () => {
      const result = hslaToRgba(240, 100, 50, 1);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(255);
    });

    it('should handle yellow (h < 60)', () => {
      const result = hslaToRgba(60, 100, 50, 1);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(0);
    });

    it('should handle cyan (h < 180)', () => {
      const result = hslaToRgba(180, 100, 50, 1);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(255);
      expect(result[2]).toBe(255);
    });

    it('should handle purple (h < 300)', () => {
      const result = hslaToRgba(300, 100, 50, 1);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(255);
    });

    it('should handle pink (h >= 300)', () => {
      const result = hslaToRgba(330, 100, 50, 1);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(0);
      expect(result[2]).toBeCloseTo(128, 0);
    });

    it('should preserve alpha value', () => {
      const result = hslaToRgba(180, 50, 50, 0.75);
      expect(result[3]).toBe(0.75);
    });
  });

  describe('parseHslaString', () => {
    it('should parse hsla string', () => {
      const result = parseHslaString('hsla(180, 50%, 50%, 0.5)');
      expect(result).toEqual({
        h: 180,
        s: 50,
        l: 50,
        a: 0.5,
      });
    });

    it('should parse hsl string (default alpha to 1)', () => {
      const result = parseHslaString('hsl(180, 50%, 50%)');
      expect(result).toEqual({
        h: 180,
        s: 50,
        l: 50,
        a: 1,
      });
    });

    it('should handle decimal values', () => {
      const result = parseHslaString('hsla(180.5, 50.5%, 50.5%, 0.75)');
      expect(result).toEqual({
        h: 180.5,
        s: 50.5,
        l: 50.5,
        a: 0.75,
      });
    });

    it('should return null for invalid input', () => {
      expect(parseHslaString('invalid')).toBeNull();
    });

    it('should return null for rgb format', () => {
      expect(parseHslaString('rgb(255, 0, 0)')).toBeNull();
    });
  });
});
