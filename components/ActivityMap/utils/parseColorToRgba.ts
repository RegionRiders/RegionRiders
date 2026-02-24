import { RGBA } from '@/components/ActivityMap/mapTypes';
import { detectColorFormat } from './detectColorFormat';

export function parseColorToRgba(input: string): RGBA | null {
  const trimmed = input.trim();
  const format = detectColorFormat(trimmed);

  if (!format) {
    return null;
  }

  if (format === 'rgba' || format === 'rgb') {
    // works for both "rgba(x,x,x,x)" / "rgb(x,x,x)" and bare "x, x, x[, x]"
    const inner = trimmed.includes('(') ? trimmed.slice(trimmed.indexOf('(') + 1, -1) : trimmed;

    const parts = inner.split(',').map((p) => p.trim());
    if (format === 'rgb' && parts.length !== 3) {
      return null;
    }
    if (format === 'rgba' && parts.length !== 4) {
      return null;
    }

    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;

    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
      return null;
    }
    if (Number.isNaN(a) || a < 0 || a > 1) {
      return null;
    }

    return [r, g, b, a];
  }

  if (format === 'hex') {
    // support both "#xxxx" and "xxxx"
    let hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }

    if (hex.length === 6) {
      hex += 'ff';
    }

    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100;
      return [r, g, b, a];
    }
  }

  if (format === 'hsla') {
    const match = trimmed.match(
      /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (!match) {
      return null;
    }
    const h = parseFloat(match[1]);
    const s = parseFloat(match[2]);
    const l = parseFloat(match[3]);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
      return null;
    }
    if (Number.isNaN(a) || a < 0 || a > 1) {
      return null;
    }
    return hslaToRgba(h, s, l, a);
  }

  return null;
}

function hslaToRgba(h: number, s: number, l: number, a: number): RGBA {
  const sl = s / 100,
    ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * sl;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0,
    g = 0,
    b = 0;
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
