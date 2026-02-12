export function calculateWeightForZoom(zoom: number): number {
  return 2 ** ((zoom - 10) / 2.5);
}
