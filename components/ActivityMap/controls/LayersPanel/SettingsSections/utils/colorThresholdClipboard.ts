import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

const MAX_CLIPBOARD_TEXT_LENGTH = 20000;
const MAX_THRESHOLDS = 64;

function isValidColorThreshold(value: unknown): value is ColorThreshold {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { threshold?: unknown; color?: unknown };
  if (
    typeof candidate.threshold !== 'number' ||
    !Number.isFinite(candidate.threshold) ||
    candidate.threshold < 0
  ) {
    return false;
  }

  if (!Array.isArray(candidate.color) || candidate.color.length !== 4) {
    return false;
  }

  const [r, g, b, a] = candidate.color;

  const hasValidRgb =
    Number.isInteger(r) &&
    Number.isInteger(g) &&
    Number.isInteger(b) &&
    r >= 0 &&
    r <= 255 &&
    g >= 0 &&
    g <= 255 &&
    b >= 0 &&
    b <= 255;

  const hasValidAlpha = typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 1;

  return hasValidRgb && hasValidAlpha;
}

export function serializeColorThresholds(thresholds: ColorThreshold[]): string {
  return JSON.stringify(thresholds);
}

export function parseColorThresholds(input: string): ColorThreshold[] {
  if (input.length > MAX_CLIPBOARD_TEXT_LENGTH) {
    throw new Error('Clipboard data is too large');
  }

  const parsed = JSON.parse(input);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Clipboard data is not a non-empty ColorThreshold array');
  }

  if (parsed.length > MAX_THRESHOLDS) {
    throw new Error('Clipboard data has too many threshold entries');
  }

  if (!parsed.every((item) => isValidColorThreshold(item))) {
    throw new Error('Clipboard data does not match ColorThreshold shape');
  }

  return parsed;
}

export function getClipboardErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallbackMessage;
}
