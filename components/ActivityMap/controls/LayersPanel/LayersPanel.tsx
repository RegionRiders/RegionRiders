'use client';

import { Accordion, Card } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { ActivitiesSection, MapStyleSection, RegionsSection } from './SettingsSections';
import styles from './LayersPanel.module.css';

function LayersPanelContent({
  onActivityModeChange,
  onShowHeatmapChange,
  onShowBordersChange,
  activityMode,
  showHeatmap,
  showBorders,
  placeholderImageUrl,
  onActivityThicknessChange,
  activityThickness,
  onHeatmapDensityChange,
  heatmapDensity,
  regionMode,
  onRegionModeChange,
  regionBorderThickness,
  onRegionBorderThicknessChange,
}: Pick<
  LayersPanelProps,
  | 'onActivityModeChange'
  | 'onShowHeatmapChange'
  | 'onShowBordersChange'
  | 'activityMode'
  | 'showHeatmap'
  | 'showBorders'
  | 'placeholderImageUrl'
  | 'onActivityThicknessChange'
  | 'activityThickness'
  | 'onHeatmapDensityChange'
  | 'heatmapDensity'
  | 'regionMode'
  | 'onRegionModeChange'
  | 'regionBorderThickness'
  | 'onRegionBorderThicknessChange'
>) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Accordion multiple>
        <RegionsSection
          showBorders={showBorders}
          onShowBordersChange={onShowBordersChange}
          regionMode={regionMode}
          onRegionModeChange={onRegionModeChange}
          regionBorderThickness={regionBorderThickness}
          onRegionBorderThicknessChange={onRegionBorderThicknessChange}
        />

        <ActivitiesSection
          activityThickness={activityThickness}
          onActivityThicknessChange={onActivityThicknessChange}
          onHeatmapDensityChange={onHeatmapDensityChange}
          heatmapDensity={heatmapDensity}
          onActivityModeChange={onActivityModeChange}
          onShowHeatmapChange={onShowHeatmapChange}
          activityMode={activityMode}
          showHeatmap={showHeatmap}
        />

        <MapStyleSection />
      </Accordion>
    </Card>
  );
}

function IconBoxMultiple(props: { size: number; stroke: number }) {
  return null;
}

export default function LayersPanel({
  onActivityModeChange,
  onShowHeatmapChange,
  onShowBordersChange,
  activityMode = 'heatmap',
  showHeatmap = true,
  showBorders = true,
  placeholderImageUrl = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=400&fit=crop',
  activityThickness,
  onActivityThicknessChange,
  heatmapDensity,
  onHeatmapDensityChange,
  regionMode,
  onRegionModeChange,
  regionBorderThickness,
  onRegionBorderThicknessChange,
}: LayersPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <div className={styles.container}>
      <MapStyleButton
        imageUrl={placeholderImageUrl}
        label="Layers"
        icon={<IconBoxMultiple size={16} stroke={2} />}
        onClick={toggle}
        active={opened}
      />
      <div className={`${styles.panelWrapper} ${opened ? styles.panelWrapperOpen : ''}`}>
        <LayersPanelContent
          onActivityModeChange={onActivityModeChange}
          onShowHeatmapChange={onShowHeatmapChange}
          onShowBordersChange={onShowBordersChange}
          activityMode={activityMode}
          showHeatmap={showHeatmap}
          showBorders={showBorders}
          activityThickness={activityThickness}
          onActivityThicknessChange={onActivityThicknessChange}
          onHeatmapDensityChange={onHeatmapDensityChange}
          heatmapDensity={heatmapDensity}
          regionMode={regionMode}
          onRegionModeChange={onRegionModeChange}
          regionBorderThickness={regionBorderThickness}
          onRegionBorderThicknessChange={onRegionBorderThicknessChange}
        />
      </div>
    </div>
  );
}
