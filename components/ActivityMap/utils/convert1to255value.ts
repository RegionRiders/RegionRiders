export function convert1to255value(value: number) {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}
