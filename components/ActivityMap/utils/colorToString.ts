import { RGBA } from '@/components/ActivityMap/mapTypes';

export function colorToString([r, g, b, a]: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function hslaToString(h: number, s: number, l: number, a: number): string {
  const hR = Math.round(h),
    sR = Math.round(s),
    lR = Math.round(l);
  if (a === 1) {
    return `hsl(${hR}, ${sR}%, ${lR}%)`;
  }
  return `hsla(${hR}, ${sR}%, ${lR}%, ${+a.toFixed(2)})`;
}
