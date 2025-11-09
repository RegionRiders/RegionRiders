'use client';

import {drawLineToAccumulator} from './utils/drawLineToAccumulator';
import {getHeatmapColorForCount} from './utils/getHeatmapColorForCount';
import {GPXTrack} from "@/lib/types/types";
import L from 'leaflet';

interface HeatmapCache {
    imageUrl: string;
    bounds: any;
    zoomLevel: number;
}

let heatmapCache: HeatmapCache | null = null;

export function drawActivities(
    map: any,
    tracks: Map<string, GPXTrack>,
    currentImageLayerRef: any,
    renderAbortRef: any,
    renderTimeoutRef: any
) {
    const PIXEL_DENSITY = 1;
    const THICKNESS = 4 * PIXEL_DENSITY;
    let hasInitialRender = false;
    let lastZoom = map?.getZoom?.() ?? 11;
    let zoomChangeTimeout: NodeJS.Timeout | null = null;

    const ensurePane = () => {
        if (!map?.getPane) return;
        if (!map.getPane('heatmapPane')) {
            const pane = map.createPane('heatmapPane');
            pane.style.zIndex = 450;
            console.log('🎨 [drawActivities] Created heatmapPane with z-index 450');
        }
    };

    const renderHeatmap = () => {
        if (!map?.getBounds) {
            console.warn('⚠️ [drawActivities] Map not available');
            return;
        }

        const renderStartTime = performance.now();
        const currentZoom = map.getZoom();
        console.log(`⏳ [drawActivities] Starting heatmap render at zoom ${currentZoom}...`);

        renderAbortRef.current = true;

        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
        }

        renderTimeoutRef.current = setTimeout(() => {
            renderAbortRef.current = false;

            try {
                ensurePane();

                const bounds = map.getBounds();
                const topLeft = map.project(bounds.getNorthWest(), map.getZoom());
                const bottomRight = map.project(bounds.getSouthEast(), map.getZoom());

                const canvasWidth = Math.round((bottomRight.x - topLeft.x) * PIXEL_DENSITY);
                const canvasHeight = Math.round((bottomRight.y - topLeft.y) * PIXEL_DENSITY);

                console.log(`📐 [drawActivities] Canvas size: ${canvasWidth}x${canvasHeight}px`);

                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('❌ [drawActivities] Failed to get canvas context');
                    return;
                }

                const accumulator = new Uint32Array(canvasWidth * canvasHeight);

                const latlngToPixel = (lat: number, lon: number) => {
                    const point = map.project({ lat, lng: lon }, map.getZoom());
                    return {
                        x: (point.x - topLeft.x) * PIXEL_DENSITY,
                        y: (point.y - topLeft.y) * PIXEL_DENSITY,
                    };
                };

                let trackIndex = 0;
                const tracksArray = Array.from(tracks.values());
                const chunkStartTime = performance.now();

                const processChunk = () => {
                    if (renderAbortRef.current) return;

                    const startTime = performance.now();
                    const chunkTime = 8;

                    while (trackIndex < tracksArray.length && performance.now() - startTime < chunkTime) {
                        const track = tracksArray[trackIndex];
                        const points = track.points;

                        if (points && points.length > 0) {
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

                    const progress = ((trackIndex / tracksArray.length) * 100).toFixed(1);
                    console.log(`📊 [drawActivities] Processing: ${progress}% (${trackIndex}/${tracksArray.length} tracks)`);

                    if (trackIndex < tracksArray.length) {
                        requestAnimationFrame(processChunk);
                    } else {
                        const chunkDuration = (performance.now() - chunkStartTime).toFixed(2);
                        console.log(`✅ [drawActivities] Processing complete (${chunkDuration}ms)`);
                        finishRender();
                    }
                };

                const finishRender = () => {
                    if (renderAbortRef.current) return;

                    const finishStartTime = performance.now();
                    console.log('🎨 [drawActivities] Rendering pixels to canvas...');

                    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
                    const data = imageData.data;

                    for (let i = 0; i < accumulator.length; i++) {
                        const count = accumulator[i];
                        if (count === 0) continue;

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

                            const totalDuration = (performance.now() - renderStartTime).toFixed(2);
                            const finishDuration = (performance.now() - finishStartTime).toFixed(2);

                            console.log(`🎉 [drawActivities] Heatmap rendered! (finish: ${finishDuration}ms, total: ${totalDuration}ms)`);
                            hasInitialRender = true;
                            lastZoom = currentZoom;
                        } catch (error) {
                            console.error('❌ [drawActivities] Error adding image overlay:', error);
                        }
                    }
                };

                processChunk();
            } catch (error) {
                console.error('❌ [drawActivities] Error rendering heatmap:', error);
            }
        }, 0);
    };

    // Initial render
    renderHeatmap();

    // Re-render on zoom changes (debounced)
    const handleZoomEnd = () => {
        const newZoom = map.getZoom();

        if (zoomChangeTimeout) {
            clearTimeout(zoomChangeTimeout);
        }

        zoomChangeTimeout = setTimeout(() => {
            console.log(`🔄 [drawActivities] Zoom changed: ${lastZoom} → ${newZoom}, re-rendering heatmap`);
            renderHeatmap();
        }, 300); // Wait 300ms after zoom ends before re-rendering
    };

    if (map) {
        map.on('zoomend', handleZoomEnd);
    }

    return () => {
        console.log('🧹 [drawActivities] Cleanup');
        renderAbortRef.current = true;

        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
        }

        if (zoomChangeTimeout) {
            clearTimeout(zoomChangeTimeout);
        }

        if (map) {
            map.off('zoomend', handleZoomEnd);
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
