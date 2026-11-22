import L from 'leaflet';
import { RegionTileElement, RegionVectorGridLayer } from './regionVectorGridRuntime';

export function syncRegionPaneOpacity(
  map: L.Map,
  paneName: string,
  regionLayerTransparency: number
): void {
  const pane = map.getPane?.(paneName);

  if (pane) {
    const opacity = Number.isFinite(regionLayerTransparency)
      ? Math.min(Math.max(regionLayerTransparency, 0), 1)
      : 1;
    pane.style.opacity = String(opacity);
  }
}

export function clearRegionPaneOpacity(map: L.Map | null, paneName: string): void {
  const pane = map?.getPane?.(paneName);

  if (pane) {
    pane.style.opacity = '';
  }
}

export function syncRenderedRegionPanePaths(
  map: L.Map | null,
  paneName: string,
  baseStyle: L.PathOptions
): void {
  const pane = map?.getPane?.(paneName);

  if (!pane || typeof pane.querySelectorAll !== 'function') {
    return;
  }

  pane.querySelectorAll<SVGPathElement>('path').forEach((path) => {
    if (baseStyle.color !== undefined) {
      path.setAttribute('stroke', String(baseStyle.color));
    }

    if (baseStyle.opacity !== undefined) {
      path.setAttribute('stroke-opacity', String(baseStyle.opacity));
    }

    if (baseStyle.weight !== undefined) {
      path.setAttribute('stroke-width', String(baseStyle.weight));
    }

    if (baseStyle.fill !== undefined) {
      path.setAttribute('fill', baseStyle.fill ? String(baseStyle.fillColor ?? 'none') : 'none');
    }

    if (baseStyle.fillColor !== undefined && baseStyle.fill !== false) {
      path.setAttribute('fill', String(baseStyle.fillColor));
    }

    if (baseStyle.fillOpacity !== undefined) {
      path.setAttribute('fill-opacity', String(baseStyle.fillOpacity));
    }
  });
}

function resetTileVisibility(pane: HTMLElement): void {
  pane
    .querySelectorAll<RegionTileElement>(
      '.leaflet-tile-container > svg, .leaflet-tile-container > canvas'
    )
    .forEach((tile) => {
      tile.style.visibility = '';
    });
}

function isTileElementVisible(tile: RegionTileElement | undefined): tile is RegionTileElement {
  if (!tile) {
    return false;
  }

  const bounds = tile.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

function doesParentTileCoverChildTile(
  parentCoords: { x: number; y: number; z: number },
  childCoords: { x: number; y: number; z: number }
): boolean {
  if (parentCoords.z > childCoords.z) {
    return false;
  }

  if (parentCoords.z === childCoords.z) {
    return parentCoords.x === childCoords.x && parentCoords.y === childCoords.y;
  }

  const scale = 2 ** (childCoords.z - parentCoords.z);

  return (
    childCoords.x >= parentCoords.x * scale &&
    childCoords.x < (parentCoords.x + 1) * scale &&
    childCoords.y >= parentCoords.y * scale &&
    childCoords.y < (parentCoords.y + 1) * scale
  );
}

export function syncCoveredRegionTiles(
  layer: RegionVectorGridLayer | null,
  map: L.Map | null,
  paneName: string,
  shouldHideCoveredTiles: boolean
): void {
  const pane = map?.getPane?.(paneName);

  if (!pane || typeof pane.querySelectorAll !== 'function') {
    return;
  }

  resetTileVisibility(pane);

  if (!shouldHideCoveredTiles) {
    return;
  }

  const activeTileZoom = layer?._tileZoom;
  const tiles = Object.values(layer?._tiles ?? {});

  if (activeTileZoom === undefined || tiles.length === 0) {
    return;
  }

  const freshTiles = tiles.filter(
    (tile) =>
      tile.coords.z === activeTileZoom &&
      tile.current &&
      tile.active &&
      isTileElementVisible(tile.el)
  );

  if (freshTiles.length === 0) {
    return;
  }

  tiles.forEach((tile) => {
    if (!tile.el || tile.current || tile.coords.z <= activeTileZoom || !tile.loaded) {
      return;
    }

    const coveredByFreshTile = freshTiles.some((freshTile) =>
      doesParentTileCoverChildTile(freshTile.coords, tile.coords)
    );

    if (coveredByFreshTile) {
      tile.el.style.visibility = 'hidden';
    }
  });
}

export function updateRenderedTileStyles(
  layer: RegionVectorGridLayer,
  layerName: string,
  baseStyle: L.PathOptions
): void {
  const renderedTiles = layer._vectorTiles;
  const updateStyles = layer._updateStyles;

  if (!renderedTiles || !updateStyles) {
    layer.redraw?.();
    return;
  }

  Object.values(renderedTiles).forEach((tile) => {
    Object.values(tile._features ?? {}).forEach((bucket) => {
      const entries = Array.isArray(bucket) ? bucket : [bucket];

      entries.forEach((entry) => {
        if (entry.layerName !== layerName) {
          return;
        }

        updateStyles(entry.feature, tile, baseStyle);
      });
    });
  });
}
