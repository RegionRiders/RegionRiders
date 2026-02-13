'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import { ActivityRenderMode } from '@/components/ActivityMap/hooks/activityRendering/useActivityRendering';
import { RegionRenderMode } from '@/components/ActivityMap/hooks/regionRendering/useRegionRendering';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { tracks } = useGPXData();
  const { map, isReady, error } = useLeafletMap(mapContainerRef);

  const [activityMode, setActivityMode] = useState<ActivityRenderMode>('heatmap');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [activityThickness, setActivityThickness] = useState(3);
  const [heatmapDensity, setHeatmapDensity] = useState(2);
  const [regionMode, setRegionMode] = useState<RegionRenderMode>('heatmap');

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  if (error) {
    return (
      <div className={styles.error}>
        <h3 className={styles.errorTitle}>Failed to load map</h3>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.controls}>
          <LayersPanel
            activityMode={activityMode}
            showHeatmap={showHeatmap}
            showBorders={showBorders}
            activityThickness={activityThickness}
            heatmapDensity={heatmapDensity}
            onActivityModeChange={setActivityMode}
            onShowHeatmapChange={setShowHeatmap}
            onShowBordersChange={setShowBorders}
            onActivityThicknessChange={setActivityThickness}
            onHeatmapDensityChange={setHeatmapDensity}
            regionMode={regionMode}
            onRegionModeChange={setRegionMode}
          />
        </div>
      </div>

      <MapContainerMemo ref={mapContainerRef} />

      {isReady && map && (
        <MapOrchestrator
          map={map}
          tracks={memoizedTracks}
          showHeatmap={showHeatmap}
          showBorders={showBorders}
          activityMode={activityMode}
          activityThickness={activityThickness}
          heatmapDensity={heatmapDensity}
        />
      )}
    </div>
  );
}
