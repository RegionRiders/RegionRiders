'use client';

import { drawSubdivisions } from './drawSubdivisions/drawSubdivisions';
import { drawActivities } from './drawActivities/drawActivities';
import { useEffect, useRef, useState } from 'react';
import {GPXTrack, Subdivision} from "@/lib/types/types";
import {DataLoader} from "@/lib/services/dataLoader";
import L from 'leaflet';

interface MapContainerProps {
    map: any;
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
    const currentImageLayerRef = useRef<any>(null);
    const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const renderAbortRef = useRef(false);
    const subdivisionLayersRef = useRef<any[]>([]);
    const popupRef = useRef<L.Popup | null>(null);

    const handleRegionClick = (subdivision: Subdivision, layer: any) => {
        const props = subdivision.properties;

        let content = `<div style="min-width: 200px;">`;

        if (props.name || subdivision.name) {
            content += `<h3 style="margin: 0 0 8px 0;">${props.name || subdivision.name}</h3>`;
        }

        if (props.admin_level) {
            content += `<p style="margin: 4px 0;"><strong>Admin Level:</strong> ${props.admin_level}</p>`;
        }

        if (props['ISO3166-2']) {
            content += `<p style="margin: 4px 0;"><strong>ISO Code:</strong> ${props['ISO3166-2']}</p>`;
        }

        if (props.population) {
            content += `<p style="margin: 4px 0;"><strong>Population:</strong> ${parseInt(props.population).toLocaleString()}</p>`;
        }

        if (props.type) {
            content += `<p style="margin: 4px 0;"><strong>Type:</strong> ${props.type}</p>`;
        }

        if (props['name:en'] && props['name:en'] !== props.name) {
            content += `<p style="margin: 4px 0;"><strong>English Name:</strong> ${props['name:en']}</p>`;
        }

        if (props.wikidata) {
            content += `<p style="margin: 4px 0;"><strong>Wikidata:</strong> <a href="https://www.wikidata.org/wiki/${props.wikidata}" target="_blank">${props.wikidata}</a></p>`;
        }

        content += `</div>`;

        if (popupRef.current && map) {
            map.closePopup(popupRef.current);
        }

        const bounds = layer.getBounds();
        const center = bounds.getCenter();

        const popup = L.popup()
            .setLatLng(center)
            .setContent(content)
            .openOn(map);

        popupRef.current = popup;
    };

    const loadSubdivisionsForViewport = async () => {
        if (!map) return;

        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const viewportBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        };

        const subs = await DataLoader.loadSubdivisions(viewportBounds, zoom);
        setSubdivisions(subs);
    };

    useEffect(() => {
        if (!map) return;

        // Create custom pane for heatmap with higher z-index than overlayPane (400)
        if (!map.getPane('heatmapPane')) {
            const heatmapPane = map.createPane('heatmapPane');
            heatmapPane.style.zIndex = 450; // Higher than overlayPane (400) but below popups (600)
        }

        loadSubdivisionsForViewport();

        const handleMoveEnd = () => {
            loadSubdivisionsForViewport();
        };

        map.on('moveend', handleMoveEnd);

        return () => {
            map.off('moveend', handleMoveEnd);
        };
    }, [map]);

    useEffect(() => {
        if (!map || subdivisions.length === 0) return;

        // Remove existing layers
        if (subdivisionLayersRef.current && Array.isArray(subdivisionLayersRef.current)) {
            subdivisionLayersRef.current.forEach((layer: any) => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }
        subdivisionLayersRef.current = [];

        if (showBorders) {
            /**
             * Calculate stroke width that maintains constant real-world distance
             */
            const calculateWeightForZoom = (zoom: number): number => {
                // Scale: makes borders appear proportional to map scale
                // At zoom 10: ~1px, at zoom 15: ~5.6px, at zoom 20: ~32px
                return Math.pow(2, (zoom - 10) / 2.5);
            };

            const initialWeight = calculateWeightForZoom(map.getZoom());
            const layers = drawSubdivisions(map, subdivisions, handleRegionClick, initialWeight);
            subdivisionLayersRef.current = layers;

            // Update borders on zoom
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
    }, [map, subdivisions, showBorders]);


    // Draw activities SECOND (higher z-index via custom pane)
    useEffect(() => {
        if (!map || !showHeatmap || tracks.size === 0) return;
        const cleanup = drawActivities(map, tracks, currentImageLayerRef, renderAbortRef, renderTimeoutRef);
        return cleanup;
    }, [map, tracks, showHeatmap]);

    return null;
}
