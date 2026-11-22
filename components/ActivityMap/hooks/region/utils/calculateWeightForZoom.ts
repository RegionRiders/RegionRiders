/**
 * Calculates border weight for regions based on zoom level
 * Uses exponential scaling for smooth visual transitions
 * @param zoom - Current map zoom level
 * @param borderThickness - Base border thickness (default: 2)
 * @returns Calculated weight for the current zoom level
 */
export function calculateWeightForZoom(zoom: number, borderThickness: number = 2): number {
  const scaledWeight = 2 ** ((zoom - 10) / 2.5) * borderThickness;

  return Math.min(Math.max(scaledWeight, 0.35), borderThickness);
}
