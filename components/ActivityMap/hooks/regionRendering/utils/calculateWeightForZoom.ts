export function calculateWeightForZoom(zoom: number, borderThickness: number = 2): number {
  return 2 ** ((zoom - 10) / 2.5) * borderThickness;
}
