/**
 * RGB to hexadecimal color conversion utility
 */

/**
 * Converts RGB values to a hexadecimal color string
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hexadecimal color string (e.g., '#ff6432')
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
