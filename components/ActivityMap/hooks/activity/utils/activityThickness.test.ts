import {
  getActivityLinePixelWidthFromControl,
  getActivityLineRadiusFromControl,
  MAX_ACTIVITY_THICKNESS_CONTROL,
  MIN_ACTIVITY_THICKNESS_CONTROL,
  normalizeActivityThicknessControl,
} from './activityThickness';

describe('activityThickness utils', () => {
  it('normalizes invalid control thickness values to a minimum of 1', () => {
    expect(normalizeActivityThicknessControl(0)).toBe(MIN_ACTIVITY_THICKNESS_CONTROL);
    expect(normalizeActivityThicknessControl(-10)).toBe(MIN_ACTIVITY_THICKNESS_CONTROL);
    expect(normalizeActivityThicknessControl(Number.NaN)).toBe(MIN_ACTIVITY_THICKNESS_CONTROL);
  });

  it('clamps control thickness values to maximum supported slider range', () => {
    expect(normalizeActivityThicknessControl(100)).toBe(MAX_ACTIVITY_THICKNESS_CONTROL);
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
