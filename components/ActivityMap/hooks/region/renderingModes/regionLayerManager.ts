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
  private regionMap = new Map<string, Regions>();
  private layerGroup: L.LayerGroup;
  private onRegionClick?: (
    region: Regions,
    visitInfo: RegionVisitData | undefined,
    layer: L.GeoJSON
  ) => void;

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
    regionLayerTransparency: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    onRegionClick?: (
      region: Regions,
      visitInfo: RegionVisitData | undefined,
      layer: L.GeoJSON
    ) => void
  ): void {
    this.onRegionClick = onRegionClick;
    const currentRegionIds = new Set(regions.map((r) => r.id));

    // Remove layers for regions no longer in viewport
    for (const [regionId, layer] of this.layerMap.entries()) {
      if (!currentRegionIds.has(regionId)) {
        this.layerGroup.removeLayer(layer);
        this.layerMap.delete(regionId);
        this.regionMap.delete(regionId);
      }
    }

    // Sort regions based on mode to control render order
    const sortedRegions = this.sortRegionsByMode(regions, visitData);

    // Add or update regions
    sortedRegions.forEach((region) => {
      const existingLayer = this.layerMap.get(region.id);
      const visit = visitData.get(region.id);
      this.regionMap.set(region.id, region);

      if (existingLayer) {
        // Update existing layer style
        this.updateLayerStyle(
          existingLayer,
          region,
          mode,
          visit,
          weight,
          regionLayerTransparency,
          regionStaticColor,
          regionHeatmapColor,
          this.onRegionClick
        );
        existingLayer.bringToFront();
      } else {
        // Create new layer
        const newLayer = this.createRegionLayer(
          region,
          mode,
          visit,
          weight,
          regionLayerTransparency,
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
    regionLayerTransparency: number,
    regionStaticColors: ColorThreshold[],
    regionHeatmapColors: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
  ): void {
    const orderedLayers = [...this.layerMap.entries()].sort((a, b) => {
      const countA = visitData.get(a[0])?.visitCount ?? 0;
      const countB = visitData.get(b[0])?.visitCount ?? 0;
      return countA - countB;
    });

    for (const [regionId, layer] of orderedLayers) {
      const visit = visitData.get(regionId);
      const region = this.regionMap.get(regionId);
      this.updateLayerStyle(
        layer,
        region,
        mode,
        visit,
        weight,
        regionLayerTransparency,
        regionStaticColors,
        regionHeatmapColors,
        this.onRegionClick
      );
      layer.bringToFront();
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
    this.regionMap.clear();
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
    regionLayerTransparency: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[],
    onRegionClick?: (
      region: Regions,
      visitInfo: RegionVisitData | undefined,
      layer: L.GeoJSON
    ) => void
  ): L.GeoJSON {
    const style = this.calculateStyle(
      mode,
      visit,
      weight,
      regionLayerTransparency,
      regionStaticColor,
      regionHeatmapColor
    );

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
    region: Regions | undefined,
    mode: RegionRenderMode,
    visit: RegionVisitData | undefined,
    weight: number,
    regionLayerTransparency: number,
    regionStaticColor: ColorThreshold[],
    regionHeatmapColor: ColorThreshold[],
    onRegionClick?: (
      region: Regions,
      visitInfo: RegionVisitData | undefined,
      layer: L.GeoJSON
    ) => void
  ): void {
    const style = this.calculateStyle(
      mode,
      visit,
      weight,
      regionLayerTransparency,
      regionStaticColor,
      regionHeatmapColor
    );
    layer.setStyle(style);

    layer.off('click');
    if (onRegionClick && region) {
      layer.on('click', () => {
        onRegionClick(region, visit, layer);
      });
    }
  }

  private calculateStyle(
    mode: RegionRenderMode,
    visit: RegionVisitData | undefined,
    weight: number,
    regionLayerTransparency: number,
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
      opacity: regionLayerTransparency,
      fillOpacity: regionLayerTransparency,
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
