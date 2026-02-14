interface LayersPanelProps {
  onActivityModeChange?: (mode: 'heatmap' | 'lines') => void;
  onShowHeatmapChange?: (show: boolean) => void;
  onShowBordersChange?: (show: boolean) => void;
  activityMode?: 'heatmap' | 'lines';
  showHeatmap?: boolean;
  showBorders?: boolean;
  placeholderImageUrl?: string;
  onActivityThicknessChange?: (thickness: number) => void;
  activityThickness?: number;
  onHeatmapDensityChange?: (density: number) => void;
  heatmapDensity?: number;
  regionMode?: 'heatmap' | 'static';
  onRegionModeChange?: (mode: 'heatmap' | 'static') => void;
  regionBorderThickness?: number;
  onRegionBorderThicknessChange?: (thickness: number) => void;
}
