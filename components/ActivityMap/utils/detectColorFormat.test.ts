import { detectColorFormat, ColorFormat } from './detectColorFormat';

describe('detectColorFormat', () => {
  describe('rgba format', () => {
    it('should detect rgba() format', () => {
      expect(detectColorFormat('rgba(255, 100, 50, 0.5)')).toBe('rgba');
    });

    it('should detect bare rgba values', () => {
      expect(detectColorFormat('255, 100, 50, 0.5')).toBe('rgba');
    });

    it('should handle spaces in rgba', () => {
      expect(detectColorFormat('rgba( 255 , 100 , 50 , 0.5 )')).toBe('rgba');
    });

    it('should handle decimal alpha', () => {
      expect(detectColorFormat('rgba(255, 100, 50, 0.333)')).toBe('rgba');
    });
  });

  describe('rgb format', () => {
    it('should detect rgb() format', () => {
      expect(detectColorFormat('rgb(255, 100, 50)')).toBe('rgb');
    });

    it('should detect bare rgb values', () => {
      expect(detectColorFormat('255, 100, 50')).toBe('rgb');
    });

    it('should handle spaces in rgb', () => {
      expect(detectColorFormat('rgb( 255 , 100 , 50 )')).toBe('rgb');
    });
  });

  describe('hex format', () => {
    it('should detect 6-digit hex with #', () => {
      expect(detectColorFormat('#ff6432')).toBe('hex');
    });

    it('should detect 6-digit hex without #', () => {
      expect(detectColorFormat('ff6432')).toBe('hex');
    });

    it('should detect 3-digit hex with #', () => {
      expect(detectColorFormat('#f64')).toBe('hex');
    });

    it('should detect 3-digit hex without #', () => {
      expect(detectColorFormat('f64')).toBe('hex');
    });

    it('should detect 8-digit hex (with alpha)', () => {
      expect(detectColorFormat('#ff643280')).toBe('hex');
    });

    it('should detect 8-digit hex without #', () => {
      expect(detectColorFormat('ff643280')).toBe('hex');
    });

    it('should be case insensitive', () => {
      expect(detectColorFormat('#FF6432')).toBe('hex');
      expect(detectColorFormat('aAbBcC')).toBe('hex');
    });
  });

  describe('hsla format', () => {
    it('should detect hsla() format', () => {
      expect(detectColorFormat('hsla(180, 50%, 50%, 0.5)')).toBe('hsla');
    });

    it('should detect hsl() format (without alpha)', () => {
      expect(detectColorFormat('hsl(180, 50%, 50%)')).toBe('hsla');
    });

    it('should handle decimal hue', () => {
      expect(detectColorFormat('hsla(180.5, 50%, 50%, 0.5)')).toBe('hsla');
    });
  });

  describe('invalid formats', () => {
    it('should return null for invalid input', () => {
      expect(detectColorFormat('invalid')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(detectColorFormat('')).toBeNull();
    });

    it('should return null for partial rgba', () => {
      expect(detectColorFormat('rgba(255, 100)')).toBeNull();
    });

    it('should return null for invalid hex', () => {
      expect(detectColorFormat('#gg6432')).toBeNull();
    });
  });

  describe('whitespace handling', () => {
    it('should trim input', () => {
      expect(detectColorFormat('  #ff6432  ')).toBe('hex');
    });

    it('should handle leading/trailing whitespace in rgb', () => {
      expect(detectColorFormat('  rgb(255, 100, 50)  ')).toBe('rgb');
    });
  });
});
