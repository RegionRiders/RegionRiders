import logger from "@/lib/utils/logger";

/**
 * Ensures a Leaflet map pane exists with the specified z-index
 *
 * @param map - Leaflet map instance
 * @param paneName - Name of the pane to create
 * @param zIndex - Z-index value for the pane
 */
export function ensureMapPane(
    map: any,
    paneName: string,
    zIndex: string
): void {
    if (!map?.getPane) {
        return;
    }

    if (!map.getPane(paneName)) {
        const pane = map.createPane(paneName);
        pane.style.zIndex = zIndex;
        logger.debug(`[ensureMapPane] Created '${paneName}' with z-index ${zIndex}`);
    }
}
