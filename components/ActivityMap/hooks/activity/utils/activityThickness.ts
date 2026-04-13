export const MIN_ACTIVITY_THICKNESS_CONTROL = 1;
export const MAX_ACTIVITY_THICKNESS_CONTROL = 10;

export function normalizeActivityThicknessControl(thickness: number): number {
  if (!Number.isFinite(thickness)) {
    return MIN_ACTIVITY_THICKNESS_CONTROL;
  }

  return Math.min(
    MAX_ACTIVITY_THICKNESS_CONTROL,
    Math.max(MIN_ACTIVITY_THICKNESS_CONTROL, Math.round(thickness))
  );
}

export function getActivityLineRadiusFromControl(thickness: number): number {
  return normalizeActivityThicknessControl(thickness) - 1;
}

export function getActivityLinePixelWidthFromControl(thickness: number): number {
  return getActivityLineRadiusFromControl(thickness) * 2 + 1;
}
