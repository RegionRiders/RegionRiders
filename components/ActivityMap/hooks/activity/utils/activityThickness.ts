export function normalizeActivityThicknessControl(thickness: number): number {
  if (!Number.isFinite(thickness)) {
    return 1;
  }

  return Math.max(1, Math.round(thickness));
}

export function getActivityLineRadiusFromControl(thickness: number): number {
  return normalizeActivityThicknessControl(thickness) - 1;
}

export function getActivityLinePixelWidthFromControl(thickness: number): number {
  return getActivityLineRadiusFromControl(thickness) * 2 + 1;
}
