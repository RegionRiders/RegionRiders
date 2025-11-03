'use client';

import { GPXTrack, IntersectionPoint, HeatmapSegment } from '@/lib/types';
import L from 'leaflet';
import { useState } from 'react';

interface LayerManagerProps {
  map: L.Map | null;
  tracks: Map<string, GPXTrack>;
  intersections: IntersectionPoint[];
  heatmapSegments: HeatmapSegment[];
}

interface LayerVisibility {
  subdivisions: boolean;
  tracks: boolean;
  heatmap: boolean;
  intersections: boolean;
}

export function LayerManager({
  map,
  tracks,
  intersections,
  heatmapSegments,
}: LayerManagerProps) {
  const [visibility, setVisibility] = useState<LayerVisibility>({
    subdivisions: true,
    tracks: true,
    heatmap: true,
    intersections: true,
  });

  const handleVisibilityChange = (layer: keyof LayerVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const stats = {
    trackCount: tracks.size,
    intersectionCount: intersections.length,
    segmentCount: heatmapSegments.length,
  };

  return (
    <div className="absolute bottom-4 right-4 bg-white p-4 rounded shadow-lg w-64 z-50">
      <h3 className="font-bold text-lg mb-3">Layer Control</h3>

      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibility.subdivisions}
            onChange={() => handleVisibilityChange('subdivisions')}
            className="w-4 h-4"
          />
          <span>Subdivisions</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibility.tracks}
            onChange={() => handleVisibilityChange('tracks')}
            className="w-4 h-4"
          />
          <span>Tracks</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibility.heatmap}
            onChange={() => handleVisibilityChange('heatmap')}
            className="w-4 h-4"
          />
          <span>Heatmap</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibility.intersections}
            onChange={() => handleVisibilityChange('intersections')}
            className="w-4 h-4"
          />
          <span>Intersections</span>
        </label>
      </div>

      <div className="border-t pt-3">
        <h4 className="font-semibold text-sm mb-2">Statistics</h4>
        <div className="text-sm space-y-1">
          <p>Tracks: <span className="font-mono">{stats.trackCount}</span></p>
          <p>Intersections: <span className="font-mono">{stats.intersectionCount}</span></p>
          <p>Segments: <span className="font-mono">{stats.segmentCount}</span></p>
        </div>
      </div>

      <div className="border-t mt-3 pt-3">
        <h4 className="font-semibold text-sm mb-2">Heatmap Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>No overlap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Low overlap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Medium overlap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>High overlap</span>
          </div>
        </div>
      </div>
    </div>
  );
}
