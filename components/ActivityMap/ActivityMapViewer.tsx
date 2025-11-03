'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { GPXTrack, IntersectionPoint, HeatmapSegment } from '@/lib/types';
import { MapContainer } from './MapContainer';
import { LayerManager } from './LayerManager';

interface ActivityMapViewerProps {
  map: L.Map | null;
  tracks: Map<string, GPXTrack>;
  intersections: IntersectionPoint[];
  heatmapSegments: HeatmapSegment[];
  onFeatureClick?: (feature: any) => void;
}

export function ActivityMapViewer({
  map,
  tracks,
  intersections,
  heatmapSegments,
  onFeatureClick,
}: ActivityMapViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const handleFeatureClick = (feature: any) => {
    setSelectedFeature(feature);
    if (onFeatureClick) {
      onFeatureClick(feature);
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        map={map}
        tracks={tracks}
        heatmapSegments={heatmapSegments}
        intersections={intersections}
        onFeatureClick={handleFeatureClick}
      />

      <LayerManager
        map={map}
        tracks={tracks}
        intersections={intersections}
        heatmapSegments={heatmapSegments}
      />

      {selectedFeature && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded shadow-lg max-w-xs z-40">
          <button
            onClick={() => setSelectedFeature(null)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          <h3 className="font-bold text-sm mb-2">
            {selectedFeature.type === 'subdivision' && 'Subdivision'}
            {selectedFeature.type === 'track' && 'Track'}
            {selectedFeature.type === 'intersection' && 'Intersection'}
          </h3>

          <div className="text-sm space-y-1">
            {selectedFeature.type === 'subdivision' && (
              <>
                <p>
                  <strong>Name:</strong> {selectedFeature.data.name}
                </p>
                <p>
                  <strong>Country:</strong> {selectedFeature.data.country}
                </p>
              </>
            )}

            {selectedFeature.type === 'track' && (
              <>
                <p>
                  <strong>Track:</strong>{' '}
                  {tracks.get(selectedFeature.data.trackId)?.name}
                </p>
                <p>
                  <strong>Intensity:</strong>{' '}
                  {(selectedFeature.data.intensity * 100).toFixed(0)}%
                </p>
              </>
            )}

            {selectedFeature.type === 'intersection' && (
              <>
                <p>
                  <strong>Overlapping Tracks:</strong>{' '}
                  {selectedFeature.data.trackIds.length}
                </p>
                <p>
                  <strong>Intensity:</strong>{' '}
                  {(selectedFeature.data.intensity * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Tracks:</strong>
                  <br />
                  {selectedFeature.data.trackIds.map((id: string) => (
                    <span key={id} className="block">
                      • {tracks.get(id)?.name}
                    </span>
                  ))}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
