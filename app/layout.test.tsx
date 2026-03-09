/**
 * RootLayout Tests
 * Tests for the root layout metadata
 */

import { metadata } from './layout';

describe('RootLayout', () => {
  describe('metadata', () => {
    it('has correct title', () => {
      expect(metadata.title).toBe('RegionRiders');
    });

    it('has correct description', () => {
      expect(metadata.description).toBe(
        'Track and share your cycling adventures with RegionRiders.'
      );
    });

    it('has favicon configuration', () => {
      expect(metadata.icons).toBeDefined();
      expect((metadata.icons as any).icon).toBe('/favicon.svg');
      expect((metadata.icons as any).shortcut).toBe('/favicon.svg');
    });
  });
});
