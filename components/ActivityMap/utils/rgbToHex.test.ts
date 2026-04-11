import { rgbToHex } from './rgbToHex';

describe('rgbToHex', () => {
  it('should convert RGB values to hex string', () => {
    expect(rgbToHex(255, 100, 50)).toBe('#ff6432');
  });

  it('should handle black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('should handle white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('should pad single digit hex values', () => {
    expect(rgbToHex(5, 10, 15)).toBe('#050a0f');
  });

  it('should clamp values above 255', () => {
    expect(rgbToHex(300, 256, 1000)).toBe('#ffffff');
  });

  it('should clamp negative values to 0', () => {
    expect(rgbToHex(-10, -5, 0)).toBe('#000000');
  });

  it('should round decimal values', () => {
    expect(rgbToHex(100.4, 100.5, 100.6)).toBe('#646565');
  });

  it('should handle primary colors', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });
});
