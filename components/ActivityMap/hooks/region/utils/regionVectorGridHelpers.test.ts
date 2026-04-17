import { RegionVectorGridLayer, syncCoveredRegionTiles } from './regionVectorGridHelpers';

function createPane(): HTMLDivElement {
  return document.createElement('div');
}

function createCanvasTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');

  Object.defineProperty(tile, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        x: 0,
        y: 0,
        width: 256,
        height: 256,
        top: 0,
        right: 256,
        bottom: 256,
        left: 0,
        toJSON: () => ({}),
      }) satisfies DOMRect,
  });

  return tile;
}

function appendTilesInContainer(
  pane: HTMLElement,
  ...tiles: Array<SVGSVGElement | HTMLCanvasElement>
): void {
  const container = document.createElement('div');
  container.className = 'leaflet-tile-container';
  tiles.forEach((tile) => container.appendChild(tile));
  pane.appendChild(container);
}

function createLayerWithTiles(
  tiles: RegionVectorGridLayer['_tiles'],
  tileZoom: number
): RegionVectorGridLayer {
  return {
    _tileZoom: tileZoom,
    _tiles: tiles,
  } as RegionVectorGridLayer;
}

describe('syncCoveredRegionTiles', () => {
  it('hides stale child tiles once a current active parent tile is ready', () => {
    const pane = createPane();
    const staleLeftTile = createCanvasTile();
    const staleRightTile = createCanvasTile();
    const freshParentTile = createCanvasTile();
    appendTilesInContainer(pane, staleLeftTile, staleRightTile, freshParentTile);

    const layer = createLayerWithTiles(
      {
        staleLeft: {
          el: staleLeftTile,
          coords: { x: 4, y: 6, z: 9 },
          current: false,
          loaded: true,
        },
        staleRight: {
          el: staleRightTile,
          coords: { x: 5, y: 6, z: 9 },
          current: false,
          loaded: true,
        },
        freshParent: {
          el: freshParentTile,
          coords: { x: 2, y: 3, z: 8 },
          current: true,
          loaded: true,
          active: true,
        },
      },
      8
    );

    const map = {
      getPane: jest.fn(() => pane),
    } as any;

    syncCoveredRegionTiles(layer, map, 'regionsPane', true);

    expect(freshParentTile.style.visibility).toBe('');
    expect(staleLeftTile.style.visibility).toBe('hidden');
    expect(staleRightTile.style.visibility).toBe('hidden');
  });

  it('keeps stale tiles visible until the replacement parent tile is active', () => {
    const pane = createPane();
    const staleTile = createCanvasTile();
    const freshParentTile = createCanvasTile();
    appendTilesInContainer(pane, staleTile, freshParentTile);

    const layer = createLayerWithTiles(
      {
        stale: {
          el: staleTile,
          coords: { x: 4, y: 6, z: 9 },
          current: false,
          loaded: true,
        },
        freshParent: {
          el: freshParentTile,
          coords: { x: 2, y: 3, z: 8 },
          current: true,
          loaded: true,
          active: false,
        },
      },
      8
    );

    const map = {
      getPane: jest.fn(() => pane),
    } as any;

    syncCoveredRegionTiles(layer, map, 'regionsPane', true);

    expect(staleTile.style.visibility).toBe('');
    expect(freshParentTile.style.visibility).toBe('');
  });

  it('restores tile visibility when covered-tile hiding is disabled', () => {
    const pane = createPane();
    const staleTile = createCanvasTile();
    const freshTile = createCanvasTile();
    staleTile.style.visibility = 'hidden';
    freshTile.style.visibility = 'hidden';
    appendTilesInContainer(pane, staleTile, freshTile);

    const layer = createLayerWithTiles(
      {
        stale: {
          el: staleTile,
          coords: { x: 4, y: 6, z: 9 },
          current: false,
          loaded: true,
        },
        fresh: {
          el: freshTile,
          coords: { x: 2, y: 3, z: 8 },
          current: true,
          loaded: true,
          active: true,
        },
      },
      8
    );

    const map = {
      getPane: jest.fn(() => pane),
    } as any;

    syncCoveredRegionTiles(layer, map, 'regionsPane', false);

    expect(staleTile.style.visibility).toBe('');
    expect(freshTile.style.visibility).toBe('');
  });
});
