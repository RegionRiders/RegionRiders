/**
 * convert1to255value Tests
 * Tests for color value conversion utility
 */

import { convert1to255value } from './convert1to255value';

describe('convert1to255value', () => {
  it('converts 0 to 0', () => {
    expect(convert1to255value(0)).toBe(0);
  });

  it('converts 1 to 255', () => {
    expect(convert1to255value(1)).toBe(255);
  });

  it('converts 0.5 to 128', () => {
    expect(convert1to255value(0.5)).toBe(128);
  });

  it('converts 0.1 to approximately 26', () => {
    expect(convert1to255value(0.1)).toBe(26);
  });

  it('clamps negative values to 0', () => {
    expect(convert1to255value(-0.5)).toBe(0);
    expect(convert1to255value(-1)).toBe(0);
  });

  it('clamps values above 1 to 255', () => {
    expect(convert1to255value(1.5)).toBe(255);
    expect(convert1to255value(2)).toBe(255);
  });

  it('rounds to nearest integer', () => {
    // 0.25 * 255 = 63.75, rounds to 64
    expect(convert1to255value(0.25)).toBe(64);

    // 0.75 * 255 = 191.25, rounds to 191
    expect(convert1to255value(0.75)).toBe(191);
  });

  it('handles small decimal values', () => {
    expect(convert1to255value(0.01)).toBe(3);
    expect(convert1to255value(0.001)).toBe(0);
  });

  it('returns integer values', () => {
    const result = convert1to255value(0.33);
    expect(Number.isInteger(result)).toBe(true);
  });
});
