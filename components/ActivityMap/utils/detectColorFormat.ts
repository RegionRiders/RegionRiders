export type ColorFormat = 'rgb' | 'rgba' | 'hex';

export function detectColorFormat(input: string): ColorFormat | null {
  const trimmed = input.trim();
  if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$/.test(trimmed)) {
    return 'rgba';
  }
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(trimmed)) {
    return 'rgb';
  }
  if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return 'hex';
  }
  return null;
}
