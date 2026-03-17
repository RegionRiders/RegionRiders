import { RGBA } from '@/components/ActivityMap/mapTypes';
import {
  getClipboardErrorMessage,
  parseColorThresholds,
  serializeColorThresholds,
} from './colorThresholdClipboard';

describe('colorThresholdClipboard', () => {
  const thresholds = [
    { threshold: 1, color: [255, 0, 0, 1] as RGBA },
    { threshold: 10, color: [255, 255, 0, 1] as RGBA },
  ];

  it('serializes and parses valid thresholds', () => {
    const serialized = serializeColorThresholds(thresholds);
    expect(parseColorThresholds(serialized)).toEqual(thresholds);
  });

  it('throws on invalid clipboard shape', () => {
    expect(() => parseColorThresholds(JSON.stringify({ threshold: 1 }))).toThrow();
  });

  it('throws on malformed JSON', () => {
    expect(() => parseColorThresholds('{bad json')).toThrow();
  });

  it('throws when color values are out of supported range', () => {
    expect(() =>
      parseColorThresholds(JSON.stringify([{ threshold: 1, color: [255, 255, 255, 999] }]))
    ).toThrow();
  });

  it('throws when thresholds are not sorted ascending', () => {
    expect(() =>
      parseColorThresholds(
        JSON.stringify([
          { threshold: 10, color: [255, 0, 0, 1] },
          { threshold: 1, color: [0, 0, 255, 1] },
        ])
      )
    ).toThrow();
  });

  it('throws when clipboard text is too large', () => {
    const veryLargeJson = `[${' '.repeat(20001)}]`;
    expect(() => parseColorThresholds(veryLargeJson)).toThrow();
  });

  it('returns specific error message when available', () => {
    expect(getClipboardErrorMessage(new Error('Specific parse error'), 'Fallback message')).toBe(
      'Specific parse error'
    );
  });

  it('falls back to generic message when error has no message', () => {
    expect(getClipboardErrorMessage('bad-error-shape', 'Fallback message')).toBe(
      'Fallback message'
    );
  });
});
