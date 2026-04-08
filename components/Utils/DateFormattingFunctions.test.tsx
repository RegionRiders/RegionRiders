import {
  dateNoTime,
  dateOnlyTime,
  dateWithTime,
  dayDifference,
  pad,
} from './DateFormattingFunctions';

describe('pad', () => {
  it('pads single-digit numbers with a leading zero', () => {
    expect(pad(5)).toBe('05');
    expect(pad(0)).toBe('00');
    expect(pad(9)).toBe('09');
  });

  it('leaves two-digit numbers unchanged', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
    expect(pad(99)).toBe('99');
  });
});

describe('dateNoTime', () => {
  it('returns ISO date string without time', () => {
    const date = new Date('2024-06-15T12:34:56.000Z');
    expect(dateNoTime(date)).toBe('2024-06-15');
  });

  it('works for the first day of the year', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    expect(dateNoTime(date)).toBe('2020-01-01');
  });
});

describe('dateWithTime', () => {
  it('formats a date using local timezone components', () => {
    // Use a fixed UTC date and derive the expected string from the local timezone
    const date = new Date(2024, 5, 15, 8, 3); // June 15, 2024, 08:03 local
    const expected = `2024-06-15 08:03`;
    expect(dateWithTime(date)).toBe(expected);
  });

  it('pads month, day, hour and minute', () => {
    const date = new Date(2020, 0, 5, 3, 7); // Jan 5, 2020, 03:07 local
    expect(dateWithTime(date)).toBe('2020-01-05 03:07');
  });
});

describe('dateOnlyTime', () => {
  it('returns HH:MM portion', () => {
    const date = new Date(2024, 0, 1, 9, 4);
    expect(dateOnlyTime(date)).toBe('09:04');
  });

  it('formats midnight as 00:00', () => {
    const date = new Date(2024, 0, 1, 0, 0);
    expect(dateOnlyTime(date)).toBe('00:00');
  });
});

describe('dayDifference', () => {
  it('returns 0 for the same day', () => {
    const dateA = new Date('2024-06-15T08:00:00.000Z');
    const dateB = new Date('2024-06-15T23:59:00.000Z');
    expect(dayDifference(dateA, dateB)).toBe(0);
  });

  it('returns positive value when dateA is after dateB', () => {
    const dateA = new Date('2024-06-18T00:00:00.000Z');
    const dateB = new Date('2024-06-15T00:00:00.000Z');
    expect(dayDifference(dateA, dateB)).toBe(3);
  });

  it('returns negative value when dateA is before dateB', () => {
    const dateA = new Date('2024-06-15T00:00:00.000Z');
    const dateB = new Date('2024-06-18T00:00:00.000Z');
    expect(dayDifference(dateA, dateB)).toBe(-3);
  });
});
