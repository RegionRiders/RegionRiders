import { RGBA } from '@/components/ActivityMap/mapTypes';
import {
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
});
