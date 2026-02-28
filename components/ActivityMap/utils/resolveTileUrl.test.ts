import { latLngToTile, resolveTileUrl } from './resolveTileUrl';

describe('latLngToTile', () => {
  it('returns integer tile coordinates', () => {
    const { x, y } = latLngToTile(54.352, 18.656, 11);
    expect(Number.isInteger(x)).toBe(true);
    expect(Number.isInteger(y)).toBe(true);
  });

  it('returns same coordinates for nearby points within a tile', () => {
    const a = latLngToTile(54.352, 18.656, 11);
    const b = latLngToTile(54.3521, 18.6561, 11);
    expect(a).toEqual(b);
  });
});

describe('resolveTileUrl', () => {
  it('replaces {z}, {x}, {y} placeholders with tile coordinates', () => {
    const url = resolveTileUrl('https://tile.example.com/{z}/{x}/{y}.png', 0, 0, 1);
    expect(url).toBe('https://tile.example.com/1/1/1.png');
  });

  it('replaces {s} with a fixed subdomain', () => {
    const url = resolveTileUrl('https://{s}.tile.example.com/{z}/{x}/{y}.png', 0, 0, 1);
    expect(url).toContain('://a.tile.example.com/');
  });

  it('replaces {r} with empty string', () => {
    const url = resolveTileUrl(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      54.352,
      18.656,
      11
    );
    expect(url).not.toContain('{r}');
    expect(url).toMatch(/\.png$/);
  });

  it('rounds fractional zoom levels', () => {
    const urlA = resolveTileUrl('https://t/{z}/{x}/{y}.png', 0, 0, 10.7);
    const urlB = resolveTileUrl('https://t/{z}/{x}/{y}.png', 0, 0, 11);
    expect(urlA).toBe(urlB);
  });

  it('handles ArcGIS-style {z}/{y}/{x} ordering', () => {
    const url = resolveTileUrl(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      54.352,
      18.656,
      11
    );
    expect(url).not.toContain('{z}');
    expect(url).not.toContain('{x}');
    expect(url).not.toContain('{y}');
  });

  it('computes known tile coordinates for Gdańsk at zoom 11', () => {
    // Gdańsk is approx 54.35°N, 18.66°E
    // At zoom 11, the tile coordinates should be in a reasonable range
    const url = resolveTileUrl('https://t/{z}/{x}/{y}.png', 54.352, 18.656, 11);
    const parts = url.replace('https://t/', '').replace('.png', '').split('/');
    const z = parseInt(parts[0], 10);
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    expect(z).toBe(11);
    // Gdańsk x should be ~1130, y should be ~640 at zoom 11
    expect(x).toBeGreaterThan(1000);
    expect(x).toBeLessThan(1300);
    expect(y).toBeGreaterThan(500);
    expect(y).toBeLessThan(800);
  });
});
