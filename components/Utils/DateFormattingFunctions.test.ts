import {
  dayDifference,
  dateNoTime,
  dateOnlyTime,
  dateWithTime,
  pad,
} from './DateFormattingFunctions';

describe('DateFormattingFunctions', () => {
  describe('pad', () => {
    it('pads single-digit numbers with a leading zero', () => {
      expect(pad(0)).toBe('00');
      expect(pad(5)).toBe('05');
      expect(pad(9)).toBe('09');
    });

    it('leaves two-digit numbers unchanged', () => {
      expect(pad(10)).toBe('10');
      expect(pad(59)).toBe('59');
    });
  });

  describe('dateNoTime', () => {
    it('returns date in YYYY-MM-DD format', () => {
      expect(dateNoTime(new Date('2024-06-15T12:30:00Z'))).toBe('2024-06-15');
    });

    it('includes leading zeros for single-digit month and day', () => {
      expect(dateNoTime(new Date('2024-01-05T00:00:00Z'))).toBe('2024-01-05');
    });
  });

  describe('dateWithTime', () => {
    it('formats date with time in local time using YYYY-MM-DD HH:MM', () => {
      const date = new Date(2024, 5, 15, 9, 5); // local time: 2024-06-15 09:05
      const result = dateWithTime(date);
      expect(result).toBe('2024-06-15 09:05');
    });

    it('formats midnight correctly', () => {
      const date = new Date(2023, 0, 1, 0, 0); // 2023-01-01 00:00
      expect(dateWithTime(date)).toBe('2023-01-01 00:00');
    });

    it('formats end-of-day time correctly', () => {
      const date = new Date(2023, 11, 31, 23, 59); // 2023-12-31 23:59
      expect(dateWithTime(date)).toBe('2023-12-31 23:59');
    });
  });

  describe('dateOnlyTime', () => {
    it('returns HH:MM for a given date', () => {
      const date = new Date(2024, 0, 1, 8, 45);
      expect(dateOnlyTime(date)).toBe('08:45');
    });

    it('pads single-digit hours and minutes', () => {
      const date = new Date(2024, 0, 1, 3, 7);
      expect(dateOnlyTime(date)).toBe('03:07');
    });
  });

  describe('dayDifference', () => {
    it('returns 0 for same day', () => {
      const a = new Date(2024, 5, 15, 10, 0);
      const b = new Date(2024, 5, 15, 20, 0);
      expect(dayDifference(a, b)).toBe(0);
    });

    it('returns positive value when dateA is after dateB', () => {
      const a = new Date(2024, 5, 17);
      const b = new Date(2024, 5, 15);
      expect(dayDifference(a, b)).toBe(2);
    });

    it('returns negative value when dateA is before dateB', () => {
      const a = new Date(2024, 5, 15);
      const b = new Date(2024, 5, 17);
      expect(dayDifference(a, b)).toBe(-2);
    });

    it('handles month boundaries correctly', () => {
      const a = new Date(2024, 1, 1); // Feb 1
      const b = new Date(2024, 0, 31); // Jan 31
      expect(dayDifference(a, b)).toBe(1);
    });
  });
});
