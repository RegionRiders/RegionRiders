'use client';

/**
 * ActivityMap - Main map component for displaying GPX tracks and regions
 * Integrates Leaflet map with activity heatmap/lines rendering and region analysis
 */
import { memo, useMemo, useRef, useState } from 'react';
import { DEFAULT_MAP_TINT_SWATCHES } from '@/components/ActivityMap/config/mapConfig';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';

const MapContainerMemo = memo(MapContainer);

/**
 * ActivityMap component renders an interactive map with GPX tracks and region overlays
 * Supports heatmap and line rendering modes for activities
 * @returns Map component with controls panel
 */
export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { tracks } = useGPXData();

  const [settings, setSettings] = useState<MapSettings>({
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
    activityLayerTransparency: 1,
    lineColorSwatches: [
      {
        normal: [255, 0, 0, 0.5],
        hover: [255, 100, 100, 0.7],
      },
      {
        normal: [255, 255, 0, 0.5],
        hover: [255, 255, 100, 0.7],
      },
      {
        normal: [0, 255, 0, 0.5],
        hover: [100, 255, 100, 0.7],
      },
      {
        normal: [0, 255, 255, 0.5],
        hover: [100, 255, 255, 0.7],
      },
      {
        normal: [0, 0, 255, 0.5],
        hover: [100, 100, 255, 0.7],
      },
    ],
    selectedLineSwatchIndex: 0,
    activityHeatmapColorSwatches: [
      [
        { threshold: 1, color: [139, 0, 0, 1] }, // dark red
        { threshold: 2, color: [220, 20, 20, 1] }, // red
        { threshold: 10, color: [255, 100, 0, 1] }, // orange-red
        { threshold: 25, color: [255, 165, 0, 1] }, // orange
        { threshold: 50, color: [255, 255, 0, 1] }, // yellow
        { threshold: 150, color: [255, 255, 255, 1] }, // white
      ],
      [
        { threshold: 1, color: [0, 0, 80, 1] }, // dark blue
        { threshold: 2, color: [0, 0, 160, 1] }, // blue
        { threshold: 10, color: [0, 80, 220, 1] }, // light blue
        { threshold: 25, color: [0, 180, 255, 1] }, // sky blue / cyan [web:10]
        { threshold: 50, color: [150, 235, 255, 1] }, // pale cyan
        { threshold: 150, color: [240, 250, 255, 1] }, // almost white
      ],
      [
        { threshold: 1, color: [0, 80, 0, 1] }, // dark green
        { threshold: 2, color: [0, 140, 0, 1] }, // green
        { threshold: 10, color: [80, 200, 0, 1] }, // yellow‑green
        { threshold: 25, color: [160, 230, 0, 1] }, // lime
        { threshold: 50, color: [220, 255, 0, 1] }, // light yellow‑green
        { threshold: 150, color: [255, 255, 220, 1] }, // warm white
      ],
      [
        { threshold: 1, color: [0, 80, 0, 1] }, // dark green
        { threshold: 2, color: [0, 140, 0, 1] }, // green
        { threshold: 10, color: [80, 200, 0, 1] }, // yellow‑green
        { threshold: 25, color: [160, 230, 0, 1] }, // lime
        { threshold: 50, color: [220, 255, 0, 1] }, // light yellow‑green
        { threshold: 150, color: [255, 255, 220, 1] }, // warm white
      ],
      [
        { threshold: 1, color: [0, 80, 0, 1] }, // dark green
        { threshold: 2, color: [0, 140, 0, 1] }, // green
        { threshold: 10, color: [80, 200, 0, 1] }, // yellow‑green
        { threshold: 25, color: [160, 230, 0, 1] }, // lime
        { threshold: 50, color: [220, 255, 0, 1] }, // light yellow‑green
        { threshold: 150, color: [255, 255, 220, 1] }, // warm white
      ],
    ],
    selectedActivityHeatmapSwatchIndex: 0,
    heatmapDensity: 2,
    regionMode: 'heatmap',
    showRegions: true,
    regionBorderThickness: 2,
    regionStaticColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] },
        { threshold: 1, color: [76, 107, 34, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
    ],
    selectedRegionStaticSwatchIndex: 0,
    regionHeatmapColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] }, // transparent
        { threshold: 1, color: [220, 20, 20, 0.1] }, // red
        { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
        { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
        { threshold: 25, color: [255, 255, 255, 0.1] }, // white
      ],
      [
        { threshold: 0, color: [60, 60, 60, 0] }, // transparent
        { threshold: 1, color: [220, 20, 20, 0.1] }, // red
        { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
        { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
        { threshold: 25, color: [255, 255, 255, 0.1] }, // white
      ],
      [
        { threshold: 0, color: [60, 60, 60, 0] }, // transparent
        { threshold: 1, color: [220, 20, 20, 0.1] }, // red
        { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
        { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
        { threshold: 25, color: [255, 255, 255, 0.1] }, // white
      ],
      [
        { threshold: 0, color: [60, 60, 60, 0] }, // transparent
        { threshold: 1, color: [220, 20, 20, 0.1] }, // red
        { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
        { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
        { threshold: 25, color: [255, 255, 255, 0.1] }, // white
      ],
      [
        { threshold: 0, color: [60, 60, 60, 0] }, // transparent
        { threshold: 1, color: [220, 20, 20, 0.1] }, // red
        { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
        { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
        { threshold: 25, color: [255, 255, 255, 0.1] }, // white
      ],
    ],
    selectedRegionHeatmapSwatchIndex: 0,
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    overlayTileLayerUrl: '',
    overlayAttribution: '',
    mapSourceMonochrome: false,
    mapOverlayMonochrome: false,
    mapTintSwatches: DEFAULT_MAP_TINT_SWATCHES,
    selectedMapTintSwatchIndex: 0,
  });

  const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const selectedMapTintColor = settings.mapTintSwatches?.[
    settings.selectedMapTintSwatchIndex ?? 0
  ] ?? [0, 0, 0, 0];

  const { map, isReady, error } = useLeafletMap(mapContainerRef, {
    tileLayerUrl: settings.tileLayerUrl,
    attribution: settings.attribution,
    overlayTileLayerUrl: settings.overlayTileLayerUrl,
    overlayAttribution: settings.overlayAttribution,
    mapSourceMonochrome: settings.mapSourceMonochrome,
    mapOverlayMonochrome: settings.mapOverlayMonochrome,
    mapTintColor: selectedMapTintColor,
  });

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
          <LayersPanel settings={settings} onSettingChange={updateSetting} map={map} />
        </div>
      </div>

      <MapContainerMemo ref={mapContainerRef} />

      {isReady && map && <MapOrchestrator map={map} tracks={memoizedTracks} settings={settings} />}
    </div>
  );
}
