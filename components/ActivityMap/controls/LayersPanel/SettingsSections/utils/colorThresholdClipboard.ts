import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

const MAX_CLIPBOARD_TEXT_LENGTH = 20_000;
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

  return candidate.color.every(
    (part) => typeof part === 'number' && Number.isFinite(part) && part >= 0 && part <= 255
  );
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

  for (let i = 1; i < parsed.length; i += 1) {
    if (parsed[i].threshold < parsed[i - 1].threshold) {
      throw new Error('Clipboard thresholds must be sorted in ascending order');
    }
  }

  return parsed;
}
