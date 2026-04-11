import L from 'leaflet';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('ensureMapPane');

/**
 * Ensures a Leaflet map pane exists with the specified z-index
 *
 * @param map - Leaflet map instance
 * @param paneName - Name of the pane to create
 * @param zIndex - Z-index value for the pane (numeric or string)
 */
export function ensureMapPane(map: L.Map, paneName: string, zIndex: number | string): void {
  if (!map || !map.getPane) {
    return;
  }

  if (!map.getPane(paneName)) {
    const pane: HTMLElement = map.createPane(paneName);
    pane.style.zIndex = String(zIndex);
    logger.debug(`Created '${paneName}' with z-index ${zIndex}`);
  }
}
