'use client';

import { drawSubdivisions } from './drawSubdivisions/drawSubdivisions';
import { drawActivities } from './drawActivities/drawActivities';
import { RegionVisitAnalyzer } from '@/lib/utils/regionVisitAnalyzer';
import { useEffect, useRef, useState, useCallback } from 'react';
import { GPXTrack, Subdivision } from "@/lib/types/types";
import { DataLoader } from "@/lib/services/dataLoader";
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
    const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
    const [visitData, setVisitData] = useState<Map<string, any>>(new Map());
    const currentImageLayerRef = useRef<any>(null);
    const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const renderAbortRef = useRef(false);
    const subdivisionLayersRef = useRef<any[]>([]);

    // Track last analysis to prevent duplicates
    const lastAnalysisRef = useRef<{ tracksSize: number; subdivisionsSize: number } | null>(null);
    const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce map movements to avoid excessive reloads
    const loadSubdivisionsForViewport = useCallback(async () => {
        if (!map) return;

        const startTime = performance.now();
        console.log('🗺️ [MapContainer] Loading subdivisions for viewport...');

        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const viewportBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        };

        const subs = await DataLoader.loadSubdivisions(viewportBounds, zoom);
        const duration = (performance.now() - startTime).toFixed(2);

        console.log(`✅ [MapContainer] Loaded ${subs.length} subdivisions (${duration}ms)`);
        setSubdivisions(subs);
    }, [map]);

    // Setup map event listeners with debouncing
    useEffect(() => {
        if (!map) return;

        console.log('📌 [MapContainer] Attaching map event listeners');

        loadSubdivisionsForViewport();

        let moveTimeout: NodeJS.Timeout;
        const handleMoveEnd = () => {
            // Debounce: only reload after 500ms of no movement
            clearTimeout(moveTimeout);
            moveTimeout = setTimeout(() => {
                console.log('🔄 [MapContainer] Map moved, reloading subdivisions');
                loadSubdivisionsForViewport();
            }, 500);
        };

        map.on('moveend', handleMoveEnd);

        return () => {
            console.log('🧹 [MapContainer] Removing map event listeners');
            clearTimeout(moveTimeout);
            map.off('moveend', handleMoveEnd);
        };
    }, [map, loadSubdivisionsForViewport]);

    // Analyze region visits - but ONLY when needed
    useEffect(() => {
        if (subdivisions.length === 0 || tracks.size === 0) return;

        // Skip if nothing changed
        if (
            lastAnalysisRef.current?.tracksSize === tracks.size &&
            lastAnalysisRef.current?.subdivisionsSize === subdivisions.length
        ) {
            console.log('⏭️ [MapContainer] Skipping analysis - data unchanged');
            return;
        }

        console.log(`🔍 [MapContainer] Analyzing ${tracks.size} tracks against ${subdivisions.length} regions...`);

        // Clear existing timeout
        if (analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }

        const startTime = performance.now();
        analysisTimeoutRef.current = setTimeout(() => {
            const tracksArray = Array.from(tracks.values());
            const visitMap = RegionVisitAnalyzer.analyzeRegionVisits(tracksArray, subdivisions);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(visitMap.values()).filter(v => v.visited).length;

            console.log(`✅ [MapContainer] Analysis complete: ${visitedCount} regions visited (${duration}ms)`);
            setVisitData(visitMap);

            // Remember we analyzed this combination
            lastAnalysisRef.current = {
                tracksSize: tracks.size,
                subdivisionsSize: subdivisions.length,
            };
        }, 500); // Wait 500ms to batch updates

        return () => {
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [tracks, subdivisions]);

    // Draw activities heatmap - render ONCE
    useEffect(() => {
        if (!map || !showHeatmap || tracks.size === 0) {
            return;
        }

        console.log(`🎨 [MapContainer] Rendering heatmap for ${tracks.size} tracks`);
        const cleanup = drawActivities(map, tracks, currentImageLayerRef, renderAbortRef, renderTimeoutRef);
        return cleanup;
    }, [map, tracks, showHeatmap]);

    // Draw subdivisions - CACHE the layers
    useEffect(() => {
        if (!map || subdivisions.length === 0) {
            return;
        }

        const startTime = performance.now();
        console.log(`🖍️ [MapContainer] Drawing ${subdivisions.length} subdivision borders...`);

        // Clear old layers
        if (subdivisionLayersRef.current && Array.isArray(subdivisionLayersRef.current)) {
            subdivisionLayersRef.current.forEach((layer: any) => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }
        subdivisionLayersRef.current = [];

        if (showBorders) {
            const calculateWeightForZoom = (zoom: number): number => {
                return Math.pow(2, (zoom - 10) / 2.5);
            };

            const initialWeight = calculateWeightForZoom(map.getZoom());
            const layers = drawSubdivisions(map, subdivisions, visitData, () => {}, initialWeight);
            subdivisionLayersRef.current = layers;

            const duration = (performance.now() - startTime).toFixed(2);
            console.log(`✅ [MapContainer] Drawn ${layers.length} subdivision layers (${duration}ms)`);

            const handleZoom = () => {
                const zoom = map.getZoom();
                const weight = calculateWeightForZoom(zoom);

                if (Array.isArray(subdivisionLayersRef.current)) {
                    subdivisionLayersRef.current.forEach((layer: any) => {
                        layer.setStyle({ weight });
                    });
                }
            };

            map.on('zoomend', handleZoom);

            return () => {
                map.off('zoomend', handleZoom);
                if (Array.isArray(subdivisionLayersRef.current)) {
                    subdivisionLayersRef.current.forEach((layer: any) => {
                        if (map.hasLayer(layer)) {
                            map.removeLayer(layer);
                        }
                    });
                }
            };
        }
    }, [map, subdivisions, showBorders, visitData]);

    return null;
}
