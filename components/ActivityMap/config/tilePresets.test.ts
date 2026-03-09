import { TILE_PRESETS, DEFAULT_TILE_PRESET, TilePreset } from './tilePresets';

describe('tilePresets', () => {
  describe('TILE_PRESETS', () => {
    it('should contain standard preset', () => {
      expect(TILE_PRESETS.standard).toBeDefined();
      expect(TILE_PRESETS.standard.name).toBe('Standard');
      expect(TILE_PRESETS.standard.url).toContain('openstreetmap.org');
    });

    it('should contain satellite preset', () => {
      expect(TILE_PRESETS.satellite).toBeDefined();
      expect(TILE_PRESETS.satellite.name).toBe('Satellite');
      expect(TILE_PRESETS.satellite.url).toContain('arcgisonline.com');
    });

    it('should contain terrain preset', () => {
      expect(TILE_PRESETS.terrain).toBeDefined();
      expect(TILE_PRESETS.terrain.name).toBe('Terrain');
      expect(TILE_PRESETS.terrain.url).toContain('opentopomap.org');
    });

    it('should contain dark preset', () => {
      expect(TILE_PRESETS.dark).toBeDefined();
      expect(TILE_PRESETS.dark.name).toBe('Dark');
      expect(TILE_PRESETS.dark.url).toContain('cartocdn.com');
    });

    it('should contain cycling preset', () => {
      expect(TILE_PRESETS.cycling).toBeDefined();
      expect(TILE_PRESETS.cycling.name).toBe('Cycling');
      expect(TILE_PRESETS.cycling.url).toContain('cyclosm');
    });

    it('should contain neutralBase preset', () => {
      expect(TILE_PRESETS.neutralBase).toBeDefined();
      expect(TILE_PRESETS.neutralBase.name).toBe('Alidade Smooth');
      expect(TILE_PRESETS.neutralBase.url).toContain('stadiamaps.com');
    });

    it('should contain bikeOverlay preset', () => {
      expect(TILE_PRESETS.bikeOverlay).toBeDefined();
      expect(TILE_PRESETS.bikeOverlay.name).toBe('Cycling Routes');
      expect(TILE_PRESETS.bikeOverlay.url).toContain('waymarkedtrails.org');
    });

    it('should contain minimalBiking preset', () => {
      expect(TILE_PRESETS.minimalBiking).toBeDefined();
      expect(TILE_PRESETS.minimalBiking.name).toBe('Stadia Outdoors');
      expect(TILE_PRESETS.minimalBiking.url).toContain('stadiamaps.com');
    });

    it('should have attribution for all presets', () => {
      Object.values(TILE_PRESETS).forEach((preset: TilePreset) => {
        expect(preset.attribution).toBeDefined();
        expect(preset.attribution.length).toBeGreaterThan(0);
      });
    });

    it('should have URLs with tile placeholders', () => {
      Object.values(TILE_PRESETS).forEach((preset: TilePreset) => {
        expect(preset.url).toMatch(/{[xyz]}/);
      });
    });
  });

  describe('DEFAULT_TILE_PRESET', () => {
    it('should be the standard preset', () => {
      expect(DEFAULT_TILE_PRESET).toBe(TILE_PRESETS.standard);
    });

    it('should have all required properties', () => {
      expect(DEFAULT_TILE_PRESET.name).toBeDefined();
      expect(DEFAULT_TILE_PRESET.url).toBeDefined();
      expect(DEFAULT_TILE_PRESET.attribution).toBeDefined();
    });
  });
});
