export type ColorFormat = 'rgb' | 'rgba' | 'hex' | 'hsla';

export function detectColorFormat(input: string): ColorFormat | null {
  const trimmed = input.trim();

  // rgba( … ) with parens
  if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/.test(trimmed)) {
    return 'rgba';
  }

  // bare "r, g, b, a"
  if (/^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*$/.test(trimmed)) {
    return 'rgba';
  }

  // rgb( … ) with parens
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(trimmed)) {
    return 'rgb';
  }

  // bare "r, g, b"
  if (/^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(trimmed)) {
    return 'rgb';
  }

  // #RRGGBB / #RGB / #RRGGBBAA
  if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return 'hex';
  }

  // hex without leading #
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(trimmed)) {
    return 'hex';
  }

  if (/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/.test(trimmed)) {
    return 'hsla';
  }

  return null;
}
