import {
  expandRasterTileUrls,
  resolveAbsoluteTileUrl,
} from '@/components/ActivityMap/utils/expandRasterTileUrls';

describe('expandRasterTileUrls', () => {
  it('returns an empty array for blank templates', () => {
    expect(expandRasterTileUrls('')).toEqual([]);
    expect(expandRasterTileUrls('   ')).toEqual([]);
  });

  it('expands {s} subdomain placeholders into a, b, c URLs', () => {
    expect(expandRasterTileUrls('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')).toEqual([
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ]);
  });

  it('expands {r} to @2x when devicePixelRatio > 1 and empty string otherwise', () => {
    const template = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    expect(expandRasterTileUrls(template, { devicePixelRatio: 1 })).toEqual([
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    ]);

    expect(expandRasterTileUrls(template, { devicePixelRatio: 2 })).toEqual([
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ]);
  });

  it('returns single URL when no {s} placeholder exists', () => {
    const url =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    expect(expandRasterTileUrls(url)).toEqual([url]);
  });
});

describe('resolveAbsoluteTileUrl', () => {
  it('returns absolute URLs unchanged', () => {
    const url = 'https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf';
    expect(resolveAbsoluteTileUrl(url, 'http://localhost:3000')).toBe(url);
  });

  it('resolves relative tile URLs against the provided origin while preserving placeholders', () => {
    expect(
      resolveAbsoluteTileUrl('/api/regions/tiles/v1/{z}/{x}/{y}.pbf', 'https://regionriders.pl/')
    ).toBe('https://regionriders.pl/api/regions/tiles/v1/{z}/{x}/{y}.pbf');
  });

  it('returns empty string for empty input', () => {
    expect(resolveAbsoluteTileUrl('')).toBe('');
  });
});
