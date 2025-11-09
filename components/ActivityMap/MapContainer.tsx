'use client';

import { drawRegions } from '@/components/ActivityMap/drawRegions/drawRegions';
import { drawActivities } from './drawActivities/drawActivities';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { useEffect, useRef, useState, useCallback } from 'react';
import { GPXTrack, Regions } from "@/lib/types/types";
import { DataLoader } from "@/lib/services/DataLoader";
import L from 'leaflet';
import logger from "@/lib/utils/logger";

interface MapContainerProps {
    map: L.Map | null;
    tracks: Map<string, GPXTrack>;
    showHeatmap?: boolean;
    showBorders?: boolean;
}

export default function MapContainer({
                                         map,
                                         tracks,
                                         showHeatmap = true,
                                         showBorders = true,
                                     }: MapContainerProps) {
    const [regions, setregions] = useState<Regions[]>([]);
    const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
    const currentImageLayerRef = useRef<any>(null);
    const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const renderAbortRef = useRef(false);
    const regionLayersRef = useRef<any[]>([]);
    const lastAnalysisRef = useRef<{ tracksSize: number; regionsSize: number } | null>(null);
    const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastBoundsRef = useRef<L.LatLngBounds | null>(null);

    // load regions in viewport
    const loadregionsForViewport = useCallback(async () => {
        if (!map) return;

        const startTime = performance.now();
        const bounds = map.getBounds();
        lastBoundsRef.current = bounds;

        const viewportBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        };

        const subs = await DataLoader.loadRegions(viewportBounds);
        const duration = (performance.now() - startTime).toFixed(2);

        logger.debug(`[MapContainer] Loaded ${subs.length} regions (${duration}ms)`);
        setregions(subs);
    }, [map]);

    // setup map event listeners with debouncing
    useEffect(() => {
        if (!map) return;

        void loadregionsForViewport();

        let moveTimeout: NodeJS.Timeout;

        const handleMoveEnd = () => {
            clearTimeout(moveTimeout);
            moveTimeout = setTimeout(() => {
                void loadregionsForViewport();
            }, 800);
        };

        map.on('moveend', handleMoveEnd);

        return () => {
            clearTimeout(moveTimeout);
            map.off('moveend', handleMoveEnd);
        };
    }, [map, loadregionsForViewport]);

    // analyze region visits when data changes
    useEffect(() => {
        if (regions.length === 0 || tracks.size === 0) return;

        // skip if nothing changed
        if (
            lastAnalysisRef.current?.tracksSize === tracks.size &&
            lastAnalysisRef.current?.regionsSize === regions.length
        ) {
            return;
        }

        if (analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }

        let isMounted = true;
        const startTime = performance.now();

        analysisTimeoutRef.current = setTimeout(() => {
            analyzeRegionVisitsAsync(
                Array.from(tracks.values()),
                regions
            )
                .then((visitData) => {
                    if (isMounted) {
                        setVisitData(visitData);
                        const duration = (performance.now() - startTime).toFixed(2);
                        const visitedCount = Array.from(visitData.values()).filter(v => v.visited).length;

                        // single consolidated log for analysis
                        logger.info(`[MapContainer] ${visitedCount}/${regions.length} regions visited (${duration}ms)`);

                        lastAnalysisRef.current = {
                            tracksSize: tracks.size,
                            regionsSize: regions.length,
                        };
                    }
                })
                .catch((error) => {
                    logger.error('[MapContainer] Analysis failed:', error);
                });
        }, 500);

        return () => {
            isMounted = false;
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [tracks, regions]);

    // draw activities heatmap
    useEffect(() => {
        if (!map || !showHeatmap || tracks.size === 0) return;

        const cleanup = drawActivities(map, tracks, currentImageLayerRef, renderAbortRef, renderTimeoutRef);
        return cleanup;
    }, [map, tracks, showHeatmap]);

    // draw regions
    useEffect(() => {
        if (!map || regions.length === 0) return;

        const startTime = performance.now();

        // clear old layers
        if (regionLayersRef.current && Array.isArray(regionLayersRef.current)) {
            regionLayersRef.current.forEach((layer: any) => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }

        regionLayersRef.current = [];

        if (showBorders) {
            const calculateWeightForZoom = (zoom: number): number => {
                return Math.pow(2, (zoom - 10) / 2.5);
            };

            const initialWeight = calculateWeightForZoom(map.getZoom());
            const layers = drawRegions(map, regions, visitData, () => {}, initialWeight);
            regionLayersRef.current = layers;

            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(visitData.values()).filter(v => v.visited).length;

            // single log for drawing
            logger.debug(`[MapContainer] Drew ${visitedCount}/${regions.length} regions (${duration}ms)`);

            const handleZoom = () => {
                const zoom = map.getZoom();
                const weight = calculateWeightForZoom(zoom);

                if (Array.isArray(regionLayersRef.current)) {
                    regionLayersRef.current.forEach((layer: any) => {
                        layer.setStyle({ weight });
                    });
                }
            };

            map.on('zoomend', handleZoom);

            return () => {
                map.off('zoomend', handleZoom);
                if (Array.isArray(regionLayersRef.current)) {
                    regionLayersRef.current.forEach((layer: any) => {
                        if (map.hasLayer(layer)) {
                            map.removeLayer(layer);
                        }
                    });
                }
            };
        }
    }, [map, regions, showBorders, visitData]);

    return null;
}
