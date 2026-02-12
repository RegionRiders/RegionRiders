interface LayersPanelProps {
  onActivityModeChange?: (mode: 'heatmap' | 'lines') => void;
  onShowHeatmapChange?: (show: boolean) => void;
  onShowBordersChange?: (show: boolean) => void;
  activityMode?: 'heatmap' | 'lines';
  showHeatmap?: boolean;
  showBorders?: boolean;
  placeholderImageUrl?: string;
  onActivityThicknessChange?: (thickness: number) => void; // 1-10
  activityThickness?: number;
  onHeatmapDensityChange?: (density: number) => void; // 1-3
  heatmapDensity?: number;
}
