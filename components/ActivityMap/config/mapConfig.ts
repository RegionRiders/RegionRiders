import { ColorThreshold, MapConfig } from '../types';
import {convert1to255value} from "@/components/ActivityMap/utils/convert1to255value";

export const MAP_CONFIG = {
  HEATMAP_RENDER_DELAY: 0,
  PIXEL_DENSITY: 1,
  ACTIVITY_LINE_THICKNESS: 2,
  REGION_LINE_THICKNESS: 3,
} as const;

export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: [54.352375, 18.656686], // Skrót Pluty - Gdańsk, Poland
  zoom: 11,
  maxZoom: 20,
  minZoom: 3,
  tileLayerUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors © CARTO',
};

export const ACTIVITY_HEATMAP_COLOR_THRESHOLDS: ColorThreshold[] = [
  { threshold: 1, color: [139, 0, 0, convert1to255value(1)] }, // dark red
  { threshold: 2, color: [220, 20, 20, convert1to255value(1)] }, // red
  { threshold: 10, color: [255, 100, 0, convert1to255value(1)] }, // orange-red
  { threshold: 25, color: [255, 165, 0, convert1to255value(1)] }, // orange
  { threshold: 50, color: [255, 255, 0, convert1to255value(1)] }, // yellow
  { threshold: 150, color: [255, 255, 255, convert1to255value(1)] }, // white
];

export const REGION_VISIT_COLOR_THRESHOLDS: ColorThreshold[] = [
  { threshold: 0, color: [60, 60, 60, 0] }, // transparent
  { threshold: 1, color: [220, 20, 20, 0.1] }, // red
  { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
  { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
  { threshold: 25, color: [255, 255, 255, 0.1] }, // white
];
