'use client';

import { useEffect, useState, useRef } from 'react';
import { GPXTrack, Subdivision } from '@/lib/types/types';
import { DataLoader } from '@/lib/services/dataLoader';
import { getColorForCount } from './utils/gradientActivityFunctions';

interface MapContainerProps {
  map: any;
  tracks: Map<string, GPXTrack>;
  heatmapSegments: any[];
  intersections: any[];
  onFeatureClick?: (feature: any) => void;
}

// Optimized Bresenham - ONLY mark visited pixels ONCE per track
function drawLineToAccumulator(
    accumulator: Uint32Array,
    visited: Set<number>,
    width: number,
    height: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number
) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  const thicknessSq = thickness * thickness;

  while (true) {
    // Mark circle of pixels
    for (let dx = -thickness; dx <= thickness; dx++) {
      for (let dy = -thickness; dy <= thickness; dy++) {
        if (dx * dx + dy * dy <= thicknessSq) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = py * width + px;
            // Only increment if NOT already visited in THIS track
            if (!visited.has(idx)) {
              accumulator[idx]++;
              visited.add(idx);
            }
          }
        }
      }
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function MapContainer({
                               map,
                               tracks,
                               onFeatureClick,
                             }: MapContainerProps) {
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const currentImageLayerRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRenderingRef = useRef(false);

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

  // Fast heatmap rendering
  useEffect(() => {
    if (!map || tracks.size === 0) return;

    const L = require('leaflet');
    const THICKNESS = 1;

    const renderHeatmap = () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }

      if (isRenderingRef.current) {
        return;
      }

      renderTimeoutRef.current = setTimeout(() => {
        isRenderingRef.current = true;

        requestAnimationFrame(() => {
          try {
            const bounds = map.getBounds();
            const canvasSize = 1024;

            const canvas = document.createElement('canvas');
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              isRenderingRef.current = false;
              return;
            }

            const accumulator = new Uint32Array(canvasSize * canvasSize);

            const latlngToPixel = (lat: number, lon: number) => {
              const x = ((lon - bounds.getWest()) / (bounds.getEast() - bounds.getWest())) * canvasSize;
              const y = ((bounds.getNorth() - lat) / (bounds.getNorth() - bounds.getSouth())) * canvasSize;
              return { x, y };
            };

            // Process each track with its own visited set
            tracks.forEach((track) => {
              const visited = new Set<number>(); // NEW: per-track visited set
              const points = track.points;

              for (let i = 0; i < points.length - 1; i++) {
                const p1 = latlngToPixel(points[i].lat, points[i].lon);
                const p2 = latlngToPixel(points[i + 1].lat, points[i + 1].lon);
                drawLineToAccumulator(accumulator, visited, canvasSize, canvasSize, p1.x, p1.y, p2.x, p2.y, THICKNESS);
              }
            });

            // Color with interpolation
            const imageData = ctx.createImageData(canvasSize, canvasSize);
            const data = imageData.data;

            for (let i = 0; i < accumulator.length; i++) {
              const count = accumulator[i];
              if (count === 0) continue;

              const [r, g, b] = getColorForCount(count);
              const pixelIndex = i * 4;

              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = 255;
            }

            ctx.putImageData(imageData, 0, 0);

            if (currentImageLayerRef.current) {
              try {
                map.removeLayer(currentImageLayerRef.current);
              } catch (e) {
                // Already removed
              }
            }

            const imageUrl = canvas.toDataURL();
            const imageBounds = [
              [bounds.getSouth(), bounds.getWest()],
              [bounds.getNorth(), bounds.getEast()],
            ];

            const imageLayer = L.imageOverlay(imageUrl, imageBounds, {
              opacity: 0.85,
              zIndex: 10,
            });

            imageLayer.addTo(map);
            currentImageLayerRef.current = imageLayer;

            isRenderingRef.current = false;
          } catch (error) {
            console.error('Error rendering heatmap:', error);
            isRenderingRef.current = false;
          }
        });
      }, 150);
    };

    renderHeatmap();
    map.on('zoom', renderHeatmap);
    map.on('move', renderHeatmap);

    return () => {
      map.off('zoom', renderHeatmap);
      map.off('move', renderHeatmap);
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (currentImageLayerRef.current) {
        try {
          map.removeLayer(currentImageLayerRef.current);
        } catch (e) {
          // Already removed
        }
      }
    };
  }, [map, tracks]);

  return null;
}
