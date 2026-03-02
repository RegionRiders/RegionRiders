/**
 * HSLA color utilities
 * Provides conversion between RGBA and HSLA color spaces
 */

import type { RGBA } from '@/components/ActivityMap/mapTypes';

export type HSLA = { h: number; s: number; l: number };

/**
 * Converts RGBA color to HSLA color space
 * Full float precision to prevent slider instability
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-1)
 * @returns HSLA object with h (0-360), s (0-100), l (0-100), a (0-1)
 */
export function rgbaToHsla(r: number, g: number, b: number, a: number): HSLA & { a: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100, a };
}

/**
 * Converts HSLA color to RGBA color space
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @param a - Alpha (0-1)
 * @returns RGBA tuple [r, g, b, a]
 */
export function hslaToRgba(h: number, s: number, l: number, a: number): RGBA {
  const sl = s / 100,
    ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * sl;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a];
}

/**
 * Parses an HSLA color string into component values
 * @param value - CSS hsla() or hsl() string
 * @returns Object with h, s, l, a values or null if parsing fails
 */
export function parseHslaString(
  value: string
): { h: number; s: number; l: number; a: number } | null {
  const match = value.match(
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (!match) {
    return null;
  }
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}
