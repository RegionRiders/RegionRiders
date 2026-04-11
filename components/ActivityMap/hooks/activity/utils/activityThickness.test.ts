import {
  getActivityLinePixelWidthFromControl,
  getActivityLineRadiusFromControl,
  normalizeActivityThicknessControl,
} from './activityThickness';

describe('activityThickness utils', () => {
  it('normalizes invalid control thickness values to a minimum of 1', () => {
    expect(normalizeActivityThicknessControl(0)).toBe(1);
    expect(normalizeActivityThicknessControl(-10)).toBe(1);
    expect(normalizeActivityThicknessControl(Number.NaN)).toBe(1);
  });

  it('maps control value 1 to radius 0 and pixel width 1', () => {
    expect(getActivityLineRadiusFromControl(1)).toBe(0);
    expect(getActivityLinePixelWidthFromControl(1)).toBe(1);
  });

  it('maps control value 3 to radius 2 and pixel width 5', () => {
    expect(getActivityLineRadiusFromControl(3)).toBe(2);
    expect(getActivityLinePixelWidthFromControl(3)).toBe(5);
  });
});
