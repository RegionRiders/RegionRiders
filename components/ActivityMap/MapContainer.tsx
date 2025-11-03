'use client';

import { useEffect, useState, useRef } from 'react';
import { GPXTrack, Subdivision } from '@/lib/types/types';
import { DataLoader } from '@/lib/services/dataLoader';
import { drawLineToAccumulatorWu } from './utils/bresenham';
import { getColorForCount } from './utils/gradientActivityFunctions';

interface MapContainerProps {
  map: any;
  tracks: Map<string, GPXTrack>;
  heatmapSegments: any[];
  intersections: any[];
  onFeatureClick?: (feature: any) => void;
}

export function MapContainer({
                               map,
                               tracks,
                               onFeatureClick,
                             }: MapContainerProps) {
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const currentImageLayerRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderAbortRef = useRef(false);

  useEffect(() => {
    const loadSubdivisions = async () => {
      try {
        const subs = await DataLoader.loadSubdivisions();
        setSubdivisions(subs);
      } catch (error) {
        console.error('Failed to load subdivisions:', error);
      }
    };
    loadSubdivisions();
  }, []);

  useEffect(() => {
    if (!map || subdivisions.length === 0) return;

    const L = require('leaflet');

    subdivisions.forEach((sub) => {
      try {
        const geoJSON = L.geoJSON(sub.geometry as any, {
          style: { color: '#333', weight: 1, opacity: 0.6, fillOpacity: 0.05 },
          renderer: L.canvas({ padding: 0.5 }),
          onEachFeature: (feature: any, layer: any) => {
            layer.on('click', () => {
              if (onFeatureClick) {
                onFeatureClick({ type: 'subdivision', data: sub });
              }
            });
            layer.bindPopup(`<strong>${sub.name}</strong><br>${sub.country}`);
          },
        });
        geoJSON.addTo(map);
      } catch (error) {
        console.error(`Error rendering subdivision ${sub.name}:`, error);
      }
    });
  }, [map, subdivisions, onFeatureClick]);

  useEffect(() => {
    if (!map || tracks.size === 0) return;

    const L = require('leaflet');
    const PIXEL_DENSITY = 1; // Higher = better quality but slower
    const THICKNESS = (4 * PIXEL_DENSITY);

    const renderHeatmap = () => {
      renderAbortRef.current = true;
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }

      renderTimeoutRef.current = setTimeout(() => {
        renderAbortRef.current = false;

        try {
          const bounds = map.getBounds();
          const L = require('leaflet');

          const topLeft = map.project(bounds.getNorthWest(), map.getZoom());
          const bottomRight = map.project(bounds.getSouthEast(), map.getZoom());

          const canvasWidth = Math.round((bottomRight.x - topLeft.x) * PIXEL_DENSITY);
          const canvasHeight = Math.round((bottomRight.y - topLeft.y) * PIXEL_DENSITY);

          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

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

          // Define processChunk INSIDE the timeout
          const processChunk = () => {
            if (renderAbortRef.current) return;

            const startTime = performance.now();
            const chunkTime = 8;

            while (trackIndex < tracksArray.length && performance.now() - startTime < chunkTime) {
              const track = tracksArray[trackIndex];
              const visited = new Map<number, number>();
              const points = track.points;

              for (let i = 0; i < points.length - 1; i++) {
                const p1 = latlngToPixel(points[i].lat, points[i].lon);
                const p2 = latlngToPixel(points[i + 1].lat, points[i + 1].lon);
                drawLineToAccumulatorWu(accumulator, visited, canvasWidth, canvasHeight, p1.x, p1.y, p2.x, p2.y, THICKNESS);
              }

              trackIndex++;
            }

            if (trackIndex < tracksArray.length) {
              requestAnimationFrame(processChunk);
            } else {
              finishRender();
            }
          };

          // Define finishRender INSIDE the timeout
          const finishRender = () => {
            const imageData = ctx.createImageData(canvasWidth, canvasHeight);
            const data = imageData.data;

            for (let i = 0; i < accumulator.length; i++) {
              const count = accumulator[i];
              if (count === 0) continue;

              const [r, g, b] = getColorForCount(count, THICKNESS);
              const pixelIndex = i * 4;

              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = Math.round(Math.min(255, count * 40));
            }

            ctx.putImageData(imageData, 0, 0);

            if (currentImageLayerRef.current) {
              try {
                map.removeLayer(currentImageLayerRef.current);
              } catch (e) {}
            }

            const imageUrl = canvas.toDataURL();
            const imageBounds: any = [
              bounds.getSouthWest(),
              bounds.getNorthEast(),
            ];

            const imageLayer = L.imageOverlay(imageUrl, imageBounds, {
              opacity: 0.85,
              zIndex: 10,
            });

            imageLayer.addTo(map);
            currentImageLayerRef.current = imageLayer;
          };

          // NOW call processChunk
          processChunk();
        } catch (error) {
          console.error('Error rendering heatmap:', error);
        }
      }, 200);
    };


    renderHeatmap();
    map.on('zoom', renderHeatmap);
    map.on('move', renderHeatmap);

    return () => {
      renderAbortRef.current = true;
      map.off('zoom', renderHeatmap);
      map.off('move', renderHeatmap);
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (currentImageLayerRef.current) {
        try {
          map.removeLayer(currentImageLayerRef.current);
        } catch (e) {}
      }
    };
  }, [map, tracks]);


  return null;
}
