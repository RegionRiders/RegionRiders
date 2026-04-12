import { parseColorToRgba } from './parseColorToRgba';

describe('parseColorToRgba', () => {
  describe('rgba format', () => {
    it('should parse rgba() format', () => {
      expect(parseColorToRgba('rgba(255, 100, 50, 0.5)')).toEqual([255, 100, 50, 0.5]);
    });

    it('should parse bare rgba values', () => {
      expect(parseColorToRgba('255, 100, 50, 0.5')).toEqual([255, 100, 50, 0.5]);
    });

    it('should handle spaces', () => {
      expect(parseColorToRgba('rgba( 255 , 100 , 50 , 0.5 )')).toEqual([255, 100, 50, 0.5]);
    });
  });

  describe('rgb format', () => {
    it('should parse rgb() format (default alpha to 1)', () => {
      expect(parseColorToRgba('rgb(255, 100, 50)')).toEqual([255, 100, 50, 1]);
    });

    it('should parse bare rgb values', () => {
      expect(parseColorToRgba('255, 100, 50')).toEqual([255, 100, 50, 1]);
    });

    it('should return null for wrong part count in rgb', () => {
      expect(parseColorToRgba('rgb(255, 100)')).toBeNull();
    });
  });

  describe('hex format', () => {
    it('should parse 6-digit hex with #', () => {
      const result = parseColorToRgba('#ff6432');
      expect(result).toEqual([255, 100, 50, 1]);
    });

    it('should parse 6-digit hex without #', () => {
      const result = parseColorToRgba('ff6432');
      expect(result).toEqual([255, 100, 50, 1]);
    });

    it('should parse 3-digit hex (expand to 6-digit)', () => {
      const result = parseColorToRgba('#fff');
      expect(result).toEqual([255, 255, 255, 1]);
    });

    it('should parse 8-digit hex (with alpha)', () => {
      const result = parseColorToRgba('#ff643280');
      expect(result?.[3]).toBeCloseTo(0.5, 1);
    });
  });

  describe('hsla format', () => {
    it('should parse hsla() format and convert to rgba', () => {
      const result = parseColorToRgba('hsla(0, 100%, 50%, 1)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should parse hsl() format', () => {
      const result = parseColorToRgba('hsl(0, 100%, 50%)');
      expect(result).toEqual([255, 0, 0, 1]);
    });

    it('should return null for invalid hsla values', () => {
      expect(parseColorToRgba('hsla(400, 100%, 50%, 1)')).toBeNull(); // h > 360
    });

    it('should return null for invalid saturation', () => {
      expect(parseColorToRgba('hsla(180, 150%, 50%, 1)')).toBeNull(); // s > 100
    });

    it('should return null for invalid alpha in hsla', () => {
      expect(parseColorToRgba('hsla(180, 50%, 50%, 2)')).toBeNull(); // a > 1
    });
  });

  describe('validation', () => {
    it('should return null for invalid input', () => {
      expect(parseColorToRgba('invalid')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseColorToRgba('')).toBeNull();
    });

    it('should return null for rgb values out of range', () => {
      expect(parseColorToRgba('rgb(300, 100, 50)')).toBeNull();
    });

    it('should return null for negative rgb values', () => {
      expect(parseColorToRgba('rgb(-10, 100, 50)')).toBeNull();
    });

    it('should return null for invalid alpha in rgba', () => {
      expect(parseColorToRgba('rgba(255, 100, 50, 1.5)')).toBeNull();
    });

    it('should return null for negative alpha', () => {
      expect(parseColorToRgba('rgba(255, 100, 50, -0.5)')).toBeNull();
    });
  });
});
