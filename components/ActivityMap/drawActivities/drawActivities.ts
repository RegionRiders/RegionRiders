'use client';

import { drawLineToAccumulator } from './utils/drawLineToAccumulator';
import { getHeatmapColorForCount } from './utils/getHeatmapColorForCount';
import { GPXTrack } from "@/lib/types/types";
import L from 'leaflet';
import logger from "@/lib/utils/logger";
import {MAP_CONFIG} from "@/components/ActivityMap/config/mapConfig";

interface HeatmapCache {
    imageUrl: string;
    bounds: any;
    zoomLevel: number;
}

let heatmapCache: HeatmapCache | null = null;

/**
 * renders gpx track heatmap as canvas overlay on a leaflet map
 * uses accumulator buffer for overlapping tracks, then converts to colored image
 * processes tracks in chunks to avoid blocking ui thread
 *
 * @param map - leaflet map instance
 * @param tracks - map of gpx tracks to render
 * @param currentImageLayerRef - ref to current overlay layer for cleanup
 * @param renderAbortRef - ref to abort flag for canceling renders
 * @param renderTimeoutRef - ref to timeout for debouncing
 * @returns cleanup function
 */
export function drawActivities(
    map: any,
    tracks: Map<string, GPXTrack>,
    currentImageLayerRef: any,
    renderAbortRef: any,
    renderTimeoutRef: any
) {
    const THICKNESS = MAP_CONFIG.LINE_THICKNESS * MAP_CONFIG.PIXEL_DENSITY;

    let lastZoom = map?.getZoom?.() ?? 11;
    let zoomChangeTimeout: NodeJS.Timeout | null = null;

    const ensurePane = () => {
        if (!map?.getPane) {return;}
        if (!map.getPane('heatmapPane')) {
            const pane = map.createPane('heatmapPane');
            pane.style.zIndex = '450';
        }
    };

    const renderHeatmap = () => {
        if (!map?.getBounds) {
            logger.warn('[drawActivities] Map not available');
            return;
        }

        const renderStartTime = performance.now();
        const currentZoom = map.getZoom();

        renderAbortRef.current = true;
        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
        }

        renderTimeoutRef.current = setTimeout(() => {
            renderAbortRef.current = false;

            try {
                ensurePane();

                // create a canvas matching viewport
                const bounds = map.getBounds();
                const topLeft = map.project(bounds.getNorthWest(), map.getZoom());
                const bottomRight = map.project(bounds.getSouthEast(), map.getZoom());
                const canvasWidth = Math.round((bottomRight.x - topLeft.x) * MAP_CONFIG.PIXEL_DENSITY);
                const canvasHeight = Math.round((bottomRight.y - topLeft.y) * MAP_CONFIG.PIXEL_DENSITY);

                if (!isFinite(canvasWidth) || !isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
                    logger.warn('[drawActivities] Invalid canvas dimensions, aborting render:', {
                        canvasWidth,
                        canvasHeight,
                        topLeft,
                        bottomRight,
                        zoom: map.getZoom()
                    });
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    logger.error('[drawActivities] Failed to get canvas context');
                    return;
                }

                const accumulator = new Float32Array(canvasWidth * canvasHeight);

                const latlngToPixel = (lat: number, lon: number) => {
                    const point = map.project({ lat, lng: lon }, map.getZoom());
                    return {
                        x: (point.x - topLeft.x) * MAP_CONFIG.PIXEL_DENSITY,
                        y: (point.y - topLeft.y) * MAP_CONFIG.PIXEL_DENSITY,
                    };
                };

                let trackIndex = 0;
                const tracksArray = Array.from(tracks.values());

                // process tracks in chunks to avoid blocking ui
                const processChunk = () => {
                    if (renderAbortRef.current) {return;}

                    const startTime = performance.now();

                    while (trackIndex < tracksArray.length && performance.now() - startTime < MAP_CONFIG.CHUNK_PROCESSING_TIME) {
                        const track = tracksArray[trackIndex];
                        const points = track.points;

                        if (points && points.length > 0) {
                            // draw line segments into accumulator
                            for (let i = 0; i < points.length - 1; i++) {
                                const p1 = latlngToPixel(points[i].lat, points[i].lon);
                                const p2 = latlngToPixel(points[i + 1].lat, points[i + 1].lon);
                                drawLineToAccumulator(
                                    accumulator,
                                    canvasWidth,
                                    canvasHeight,
                                    p1.x,
                                    p1.y,
                                    p2.x,
                                    p2.y,
                                    THICKNESS
                                );
                            }
                        }

                        trackIndex++;
                    }

                    if (trackIndex < tracksArray.length) {
                        requestAnimationFrame(processChunk);
                    } else {
                        finishRender();
                    }
                };

                const finishRender = () => {
                    if (renderAbortRef.current) {return;}

                    const finishStartTime = performance.now();

                    if (!ctx || !isFinite(canvasWidth) || !isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
                        logger.error('[drawActivities] Invalid state in finishRender:', {
                            hasCtx: !!ctx,
                            canvasWidth,
                            canvasHeight
                        });
                        return;
                    }

                    // convert accumulator to colored pixels
                    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
                    const data = imageData.data;

                    for (let i = 0; i < accumulator.length; i++) {
                        const count = accumulator[i];
                        if (count === 0) {continue;}

                        const [r, g, b] = getHeatmapColorForCount(count, THICKNESS);
                        const pixelIndex = i * 4;
                        data[pixelIndex] = r;
                        data[pixelIndex + 1] = g;
                        data[pixelIndex + 2] = b;
                        data[pixelIndex + 3] = Math.round(Math.min(255, count * 40));
                    }

                    ctx.putImageData(imageData, 0, 0);

                    const imageUrl = canvas.toDataURL();
                    const imageBounds: any = [bounds.getSouthWest(), bounds.getNorthEast()];

                    heatmapCache = { imageUrl, bounds: imageBounds, zoomLevel: map.getZoom() };

                    if (currentImageLayerRef.current && map.hasLayer?.(currentImageLayerRef.current)) {
                        map.removeLayer(currentImageLayerRef.current);
                    }

                    if (map?.addLayer) {
                        try {
                            currentImageLayerRef.current = L.imageOverlay(imageUrl, imageBounds, {
                                pane: 'heatmapPane',
                            }).addTo(map);

                            if (renderAbortRef.current) {
                                return;
                            }

                            const totalDuration = (performance.now() - renderStartTime).toFixed(2);
                            const finishDuration = (performance.now() - finishStartTime).toFixed(2);
                            logger.info(`[drawActivities] Heatmap rendered at zoom ${currentZoom} (finish: ${finishDuration}ms, total: ${totalDuration}ms)`);
                            lastZoom = currentZoom;
                        } catch (error) {
                            logger.error('[drawActivities] Error adding image overlay:', error);
                        }
                    }
                };

                processChunk();
            } catch (error) {
                logger.error('[drawActivities] Error rendering heatmap:', error);
            }
        }, 0);
    };

    renderHeatmap();

    // re-render on zoom/move with debouncing
    const handleMapChange = () => {
        const newZoom = map.getZoom();

        if (zoomChangeTimeout) {
            clearTimeout(zoomChangeTimeout);
        }

        zoomChangeTimeout = setTimeout(() => {
            renderHeatmap();
        }, MAP_CONFIG.HEATMAP_RENDER_DELAY);
    };

    if (map) {
        map.on('zoomend', handleMapChange);
        map.on('moveend', handleMapChange);
    }

    // cleanup function
    return () => {
        logger.info('[drawActivities] Cleanup');
        renderAbortRef.current = true;

        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
        }

        if (zoomChangeTimeout) {
            clearTimeout(zoomChangeTimeout);
        }

        if (map) {
            map.off('zoomend', handleMapChange);
            map.off('moveend', handleMapChange);
        }

        if (currentImageLayerRef.current && map?.hasLayer?.(currentImageLayerRef.current)) {
            try {
                map.removeLayer(currentImageLayerRef.current);
            } catch (e) { /* empty */ }
        }
    };
}

export function clearHeatmapCache() {
    heatmapCache = null;
}
