'use client';

import { IconBoxMultiple } from '@tabler/icons-react';
import { Button, Card, Group, Stack, Switch, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import MapStyleButton from './utils/MapStyleButton/MapStyleButton';
import styles from './LayersPanel.module.css';

interface LayersPanelProps {
  onActivityModeChange?: (mode: 'heatmap' | 'lines') => void;
  onShowHeatmapChange?: (show: boolean) => void;
  onShowBordersChange?: (show: boolean) => void;
  activityMode?: 'heatmap' | 'lines';
  showHeatmap?: boolean;
  showBorders?: boolean;
  placeholderImageUrl?: string;
}

function LayersPanelContent({
  onActivityModeChange,
  onShowHeatmapChange,
  onShowBordersChange,
  activityMode,
  showHeatmap,
  showBorders,
}: Pick<
  LayersPanelProps,
  | 'onActivityModeChange'
  | 'onShowHeatmapChange'
  | 'onShowBordersChange'
  | 'activityMode'
  | 'showHeatmap'
  | 'showBorders'
>) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Stack gap="sm">
        <div>
          <Text fw={600} size="sm">
            Activity Visualization
          </Text>
          <Group mt="xs" gap="xs">
            <Button
              size="sm"
              variant={activityMode === 'heatmap' ? 'filled' : 'default'}
              onClick={() => onActivityModeChange?.('heatmap')}
            >
              Heatmap
            </Button>
            <Button
              size="sm"
              variant={activityMode === 'lines' ? 'filled' : 'default'}
              onClick={() => onActivityModeChange?.('lines')}
            >
              Lines
            </Button>
          </Group>
        </div>
        <div>
          <Text fw={600} size="sm">
            Map Layers
          </Text>
          <Stack gap="4" mt="xs">
            <Group justify="space-between">
              <Text size="sm">Activity Layer</Text>
              <Switch
                checked={showHeatmap}
                onChange={(e) => onShowHeatmapChange?.(e.currentTarget.checked)}
                aria-label="Toggle activity layer visibility"
              />
            </Group>
            <Group justify="space-between">
              <Text size="sm">Region Borders</Text>
              <Switch
                checked={showBorders}
                onChange={(e) => onShowBordersChange?.(e.currentTarget.checked)}
                aria-label="Toggle region borders visibility"
              />
            </Group>
          </Stack>
        </div>
      </Stack>
    </Card>
  );
}

export default function LayersPanel({
  onActivityModeChange,
  onShowHeatmapChange,
  onShowBordersChange,
  activityMode = 'heatmap',
  showHeatmap = true,
  showBorders = true,
  placeholderImageUrl = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=400&fit=crop',
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
        />
      </div>
    </div>
  );
}
