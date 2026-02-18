import { RGBA } from '@/components/ActivityMap/mapTypes';
import { detectColorFormat } from './detectColorFormat';

export function parseColorToRgba(input: string): RGBA | null {
  const trimmed = input.trim();
  const format = detectColorFormat(trimmed);
  if (!format) {
    return null;
  }

  if (format === 'rgba' || format === 'rgb') {
    const match = trimmed.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/
    );
    if (!match) {
      return null;
    }
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
    if ([r, g, b].every((v) => v >= 0 && v <= 255) && a >= 0 && a <= 1) {
      return [r, g, b, a];
    }
  }

  if (format === 'hex') {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      hex += 'ff';
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100;
    return [r, g, b, a];
  }

  return null;
}
