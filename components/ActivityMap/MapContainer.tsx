'use client';

import { drawRegions } from '@/components/ActivityMap/drawRegions/drawRegions';
import { drawActivities } from './drawActivities/drawActivities';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { useEffect, useRef, useState, useCallback } from 'react';
import { GPXTrack, Regions } from "@/lib/types/types";
import { DataLoader } from "@/lib/services/DataLoader";
import L from 'leaflet';

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

    // Optimized: Only load regions in viewport (MAJOR improvement)
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

        console.log(`🗺️ [MapContainer] Loading regions for viewport...`);

        // Load only regions that overlap the viewport
        const subs = await DataLoader.loadRegions(viewportBounds);

        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`✅ [MapContainer] Loaded ${subs.length} regions in viewport (${duration}ms)`);

        setregions(subs);
    }, [map]);

    // Setup map event listeners with aggressive debouncing
    useEffect(() => {
        if (!map) return;

        console.log('📌 [MapContainer] Attaching map event listeners');
        loadregionsForViewport();

        let moveTimeout: NodeJS.Timeout;

        const handleMoveEnd = () => {
            clearTimeout(moveTimeout);
            // Increased debounce: 800ms to avoid repeated reloads
            moveTimeout = setTimeout(() => {
                console.log('🔄 [MapContainer] Map moved, reloading regions');
                loadregionsForViewport();
            }, 800);
        };

        map.on('moveend', handleMoveEnd);

        return () => {
            console.log('🧹 [MapContainer] Removing map event listeners');
            clearTimeout(moveTimeout);
            map.off('moveend', handleMoveEnd);
        };
    }, [map, loadregionsForViewport]);

    // Analyze region visits - only when regions change
    useEffect(() => {
        if (regions.length === 0 || tracks.size === 0) {
            return;
        }

        // Skip if nothing meaningful changed
        if (
            lastAnalysisRef.current?.tracksSize === tracks.size &&
            lastAnalysisRef.current?.regionsSize === regions.length
        ) {
            console.log('⏭️ [MapContainer] Skipping analysis - data unchanged');
            return;
        }

        console.log(`🔍 [MapContainer] Analyzing ${tracks.size} tracks against ${regions.length} regions...`);

        if (analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }

        let isMounted = true;
        const startTime = performance.now();

        analysisTimeoutRef.current = setTimeout(() => {
            // Updated function call - now imported directly from barrel
            analyzeRegionVisitsAsync(
                Array.from(tracks.values()),
                regions,
                (progress, message) => {
                    if (isMounted && progress % 25 === 0) {
                        console.log(`📊 ${progress}% - ${message}`);
                    }
                }
            )
                .then((visitData) => {
                    if (isMounted) {
                        setVisitData(visitData);
                        const duration = (performance.now() - startTime).toFixed(2);
                        const visitedCount = Array.from(visitData.values()).filter(v => v.visited).length;
                        console.log(`✅ Analysis complete: ${visitedCount} regions visited (${duration}ms)`);

                        lastAnalysisRef.current = {
                            tracksSize: tracks.size,
                            regionsSize: regions.length,
                        };
                    }
                })
                .catch((error) => {
                    console.error('❌ Analysis failed:', error);
                });
        }, 500);

        return () => {
            isMounted = false;
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [tracks, regions]);

    // Draw activities heatmap - render ONCE
    useEffect(() => {
        if (!map || !showHeatmap || tracks.size === 0) {
            return;
        }

        console.log(`🎨 [MapContainer] Rendering heatmap for ${tracks.size} tracks`);
        const cleanup = drawActivities(map, tracks, currentImageLayerRef, renderAbortRef, renderTimeoutRef);

        return cleanup;
    }, [map, tracks, showHeatmap]);

    // Draw regions only when they change
    useEffect(() => {
        if (!map || regions.length === 0) {
            return;
        }

        const startTime = performance.now();
        console.log(`🖍️ [MapContainer] Drawing ${regions.length} region borders...`);

        // Clear old layers
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
            console.log(`✅ [MapContainer] Drawn ${layers.length} region layers (${duration}ms)`);

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
