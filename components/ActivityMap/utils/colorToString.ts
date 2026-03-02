/**
 * Color conversion utilities for map components
 * Converts RGBA and HSLA values to CSS color strings
 */

import { RGBA } from '@/components/ActivityMap/mapTypes';

/**
 * Converts an RGBA color tuple to a CSS rgba() string
 * @param color - RGBA color as [r, g, b, a] tuple
 * @returns CSS rgba() string representation
 */
export function colorToString([r, g, b, a]: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Converts HSLA values to a CSS hsl() or hsla() string
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @param a - Alpha (0-1)
 * @returns CSS hsl() string if alpha is 1, otherwise hsla() string
 */
export function hslaToString(h: number, s: number, l: number, a: number): string {
  const hR = Math.round(h),
    sR = Math.round(s),
    lR = Math.round(l);
  if (a === 1) {
    return `hsl(${hR}, ${sR}%, ${lR}%)`;
  }
  return `hsla(${hR}, ${sR}%, ${lR}%, ${+a.toFixed(2)})`;
}
