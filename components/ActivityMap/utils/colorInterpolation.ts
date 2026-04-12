/**
 * Shared color interpolation utilities for regions and activities
 */

import type { RGB, RGBA } from '@/components/ActivityMap/mapTypes';

/**
 * Linear interpolation between two colors (RGB or RGBA)
 * @param c1 - First color as RGB or RGBA tuple
 * @param c2 - Second color as RGB or RGBA tuple
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated color with same channel count as input
 */
export function interpolateRgb(c1: RGB | RGBA, c2: RGB | RGBA, t: number): RGB | RGBA {
  const result: number[] = [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];

  // If colors have alpha channel, interpolate it too
  if (c1.length === 4 && c2.length === 4) {
    result.push(c1[3] + (c2[3] - c1[3]) * t);
    return result as RGBA;
  }

  return result as RGB;
}

/**
 * Generic threshold-based color mapping
 * @param value - Input value to map
 * @param thresholds - Array of {threshold, color} objects
 * @returns Color array (RGB or RGBA depending on threshold colors)
 */
export function getColorFromThresholds<T extends { threshold: number; color: RGB | RGBA }>(
  value: number,
  thresholds: T[]
): RGB | RGBA {
  // Below minimum: use first color
  if (value <= thresholds[0].threshold) {
    return [...thresholds[0].color] as RGB | RGBA;
  }

  // Above maximum: use last color
  if (value >= thresholds[thresholds.length - 1].threshold) {
    return [...thresholds[thresholds.length - 1].color] as RGB | RGBA;
  }

  // Find threshold range and interpolate
  for (let i = 0; i < thresholds.length - 1; i++) {
    const lower = thresholds[i];
    const upper = thresholds[i + 1];

    if (value >= lower.threshold && value <= upper.threshold) {
      const range = upper.threshold - lower.threshold;
      const t = range === 0 ? 0 : (value - lower.threshold) / range;
      return interpolateRgb(lower.color, upper.color, t);
    }
  }

  return [...thresholds[thresholds.length - 1].color] as RGB | RGBA;
}
