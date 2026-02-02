'use client';

import { Accordion, Button, Card, Group, Switch, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
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
      <Accordion>
        {/* Regions Section */}
        <Accordion.Item value="regions">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Text fw={600} size="sm">
                Regions
              </Text>
              <Switch
                checked={showBorders}
                onChange={(e) => onShowBordersChange?.(e.currentTarget.checked)}
                aria-label="Toggle region borders"
              />
            </Group>
          </Accordion.Control>
          <Accordion.Panel>{/* Add future Regions content here */}</Accordion.Panel>
        </Accordion.Item>

        {/* Activities Section */}
        <Accordion.Item value="activities">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Text fw={600} size="sm">
                Activities
              </Text>
              <Switch
                checked={showHeatmap}
                onChange={(e) => onShowHeatmapChange?.(e.currentTarget.checked)}
                aria-label="Toggle activity layer"
              />
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">Activity Visualization</Text>
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
          </Accordion.Panel>
        </Accordion.Item>

        {/* Map Style Section */}
        <Accordion.Item value="mapstyle">
          <Accordion.Control>
            <Text fw={600} size="sm">
              Map Style
            </Text>
          </Accordion.Control>
          <Accordion.Panel>hello</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}

function IconBoxMultiple() {
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
