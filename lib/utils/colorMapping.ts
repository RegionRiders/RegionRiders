export function intensityToColor(intensity: number): string {
  const colors = [
    { intensity: 0, color: '#0000FF' },
    { intensity: 0.33, color: '#00FF00' },
    { intensity: 0.66, color: '#FFFF00' },
    { intensity: 1, color: '#FF0000' },
  ];

  if (intensity <= 0) return colors[0].color;
  if (intensity >= 1) return colors[3].color;

  let lower = colors[0];
  let upper = colors[1];

  for (let i = 0; i < colors.length - 1; i++) {
    if (intensity >= colors[i].intensity && intensity <= colors[i + 1].intensity) {
      lower = colors[i];
      upper = colors[i + 1];
      break;
    }
  }

  const range = upper.intensity - lower.intensity;
  const normalized = (intensity - lower.intensity) / range;

  const lowerRGB = hexToRgb(lower.color);
  const upperRGB = hexToRgb(upper.color);

  const r = Math.round(lowerRGB.r + (upperRGB.r - lowerRGB.r) * normalized);
  const g = Math.round(lowerRGB.g + (upperRGB.g - lowerRGB.g) * normalized);
  const b = Math.round(lowerRGB.b + (upperRGB.b - lowerRGB.b) * normalized);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function getHeatmapOpacity(intensity: number): number {
  return 0.5 + intensity * 0.5;
}

export function getHeatmapWeight(intensity: number): number {
  return 2 + intensity * 4;
}
