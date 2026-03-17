'use client';

import L from 'leaflet';
import { REGION_VISIT_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { getRegionColorsHeatmap } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsHeatmap';
import { getRegionColorsStatic } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsStatic';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

/**
 * Manages lifecycle of region layers with intelligent caching and updates
 * Avoids unnecessary layer recreation by tracking and reusing existing layers
 */
export class RegionLayerManager {
  private layerMap = new Map<string, L.GeoJSON>();
  private layerGroup: L.LayerGroup;

  constructor(private map: L.Map) {
    this.layerGroup = L.layerGroup().addTo(map);
  }

  /**
   * Sync regions with current layer state
   * Only creates new layers, updates existing ones, removes stale ones
   */
  syncRegions(
    regions: Regions[],
    mode: RegionRenderMode,
    visitData: Map<string, RegionVisitData>,
    weight: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    onRegionClick?: (
      region: Regions,
      visitInfo: RegionVisitData | undefined,
      layer: L.GeoJSON
    ) => void
  ): void {
    const currentRegionIds = new Set(regions.map((r) => r.id));

    // Remove layers for regions no longer in viewport
    for (const [regionId, layer] of this.layerMap.entries()) {
      if (!currentRegionIds.has(regionId)) {
        this.layerGroup.removeLayer(layer);
        this.layerMap.delete(regionId);
      }
    }

    // Sort regions based on mode to control render order
    const sortedRegions = this.sortRegionsByMode(regions, visitData);

    // Add or update regions
    sortedRegions.forEach((region) => {
      const existingLayer = this.layerMap.get(region.id);
      const visit = visitData.get(region.id);

      if (existingLayer) {
        // Update existing layer style
        this.updateLayerStyle(
          existingLayer,
          mode,
          visit,
          weight,
          regionStaticColor,
          regionHeatmapColor
        );
        existingLayer.bringToFront();
      } else {
        // Create new layer
        const newLayer = this.createRegionLayer(
          region,
          mode,
          visit,
          weight,
          regionStaticColor,
          regionHeatmapColor,
          onRegionClick
        );
        this.layerGroup.addLayer(newLayer);
        this.layerMap.set(region.id, newLayer);
      }
    });
  }

  private sortRegionsByMode(
    regions: Regions[],
    visitData: Map<string, RegionVisitData>
  ): Regions[] {
    return [...regions].sort((a, b) => {
      const visitA = visitData.get(a.id);
      const visitB = visitData.get(b.id);

      const countA = visitA?.visitCount ?? 0;
      const countB = visitB?.visitCount ?? 0;
      return countA - countB;
    });
  }

  /**
   * Update styles for all existing layers (e.g., when visit data changes)
   */
  updateStyles(
    mode: RegionRenderMode,
    visitData: Map<string, RegionVisitData>,
    weight: number,
    regionStaticColors: ColorThreshold[],
    regionHeatmapColors: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
  ): void {
    for (const [regionId, layer] of this.layerMap.entries()) {
      const visit = visitData.get(regionId);
      this.updateLayerStyle(layer, mode, visit, weight, regionStaticColors, regionHeatmapColors);
    }
  }

  /**
   * Update weight for all layers (zoom changes)
   */
  updateWeight(weight: number): void {
    for (const layer of this.layerMap.values()) {
      layer.setStyle({ weight });
    }
  }

  /**
   * Clear all layers
   */
  clear(): void {
    this.layerGroup.clearLayers();
    this.layerMap.clear();
  }

  /**
   * Remove from map and cleanup
   */
  destroy(): void {
    this.clear();
    this.map.removeLayer(this.layerGroup);
  }

  private createRegionLayer(
    region: Regions,
    mode: RegionRenderMode,
    visit: RegionVisitData | undefined,
    weight: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[],
    onRegionClick?: (
      region: Regions,
      visitInfo: RegionVisitData | undefined,
      layer: L.GeoJSON
    ) => void
  ): L.GeoJSON {
    const style = this.calculateStyle(mode, visit, weight, regionStaticColor, regionHeatmapColor);

    const layer = L.geoJSON(region.geometry, {
      style,
      onEachFeature: (_feature, leafletLayer) => {
        if (onRegionClick) {
          leafletLayer.on('click', () => {
            onRegionClick(region, visit, layer);
          });
        }
      },
    });

    return layer;
  }

  private updateLayerStyle(
    layer: L.GeoJSON,
    mode: RegionRenderMode,
    visit: RegionVisitData | undefined,
    weight: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[]
  ): void {
    const style = this.calculateStyle(mode, visit, weight, regionStaticColor, regionHeatmapColor);
    layer.setStyle(style);
  }

  private calculateStyle(
    mode: RegionRenderMode,
    visit: RegionVisitData | undefined,
    weight: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[]
  ): L.PathOptions {
    let fillColor: string;
    let strokeColor: string;

    // Heatmap
    if (mode === 'heatmap') {
      ({ fillColor, strokeColor } = getRegionColorsHeatmap(visit, regionHeatmapColor));
    }
    // DEFAULT: static
    else {
      ({ fillColor, strokeColor } = getRegionColorsStatic(visit, regionStaticColor));
    }

    return {
      fillColor,
      color: strokeColor,
      weight,
      opacity: 1,
      fillOpacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    };
  }

  /**
   * Get count of currently managed layers
   */
  getLayerCount(): number {
    return this.layerMap.size;
  }
}
