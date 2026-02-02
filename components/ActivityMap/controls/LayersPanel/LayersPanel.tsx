'use client';

import { Accordion, Button, Card, Group, Slider, Stack, Switch, Text } from '@mantine/core';
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
  onActivityThicknessChange?: (thickness: number) => void; // 1-10
  activityThickness?: number;
  onHeatmapDensityChange?: (density: number) => void; // 1-3
  heatmapDensity?: number;
}

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
>) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Accordion multiple>
        <Accordion.Item value="regions">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Switch
                checked={showBorders}
                onChange={(e) => onShowBordersChange?.(e.currentTarget.checked)}
                aria-label="Toggle region borders"
              />
              <Text fw={600} size="sm" mr="auto">
                Regions
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>{/* Add future Regions content here */}</Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="activities">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Switch
                checked={showHeatmap}
                onChange={(e) => onShowHeatmapChange?.(e.currentTarget.checked)}
                aria-label="Toggle activity layer"
              />
              <Text fw={600} size="sm" mr="auto">
                Activities
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
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
              </div>

              <div>
                <Text size="sm" mb="xs">
                  Activity thickness: {activityThickness ?? 3}px
                </Text>
                <Slider
                  w="100%"
                  min={1}
                  max={10}
                  step={1}
                  value={activityThickness ?? 3}
                  onChange={onActivityThicknessChange}
                  marks={[
                    { value: 1, label: '1px' },
                    { value: 5, label: '5px' },
                    { value: 10, label: '10px' },
                  ]}
                />
              </div>

              <div>
                <Text size="sm" mb="xs">
                  Heatmap pixel density: {heatmapDensity ?? 2}
                </Text>
                <Slider
                  w="100%"
                  min={0}
                  max={3}
                  step={1}
                  value={heatmapDensity ?? 2}
                  onChange={onHeatmapDensityChange}
                  marks={[
                    { value: 1, label: 'Low' },
                    { value: 2, label: 'Med' },
                    { value: 3, label: 'High' },
                  ]}
                />
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="mapstyle">
          <Accordion.Control>
            <Text fw={600} size="sm" mr="auto">
              Map Style
            </Text>
          </Accordion.Control>
          <Accordion.Panel>hello</Accordion.Panel>
        </Accordion.Item>
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
        />
      </div>
    </div>
  );
}
