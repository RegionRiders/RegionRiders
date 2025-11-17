import { processTrack } from './index';

describe('regionVisitAnalyzer/processing/index', () => {
  it('should export processTrack', () => {
    expect(processTrack).toBeDefined();
    expect(typeof processTrack).toBe('function');
  });
});
