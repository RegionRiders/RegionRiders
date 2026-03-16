import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

function isValidColorThreshold(value: unknown): value is ColorThreshold {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { threshold?: unknown; color?: unknown };
  if (typeof candidate.threshold !== 'number' || !Number.isFinite(candidate.threshold)) {
    return false;
  }

  if (!Array.isArray(candidate.color) || candidate.color.length !== 4) {
    return false;
  }

  return candidate.color.every((part) => typeof part === 'number' && Number.isFinite(part));
}

export function serializeColorThresholds(thresholds: ColorThreshold[]): string {
  return JSON.stringify(thresholds);
}

export function parseColorThresholds(input: string): ColorThreshold[] {
  const parsed = JSON.parse(input);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Clipboard data is not a non-empty ColorThreshold array');
  }

  if (!parsed.every((item) => isValidColorThreshold(item))) {
    throw new Error('Clipboard data does not match ColorThreshold shape');
  }

  return parsed;
}
