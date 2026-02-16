import { Accordion, Button, Group, Slider, Stack, Switch, Text } from '@mantine/core';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';

export function ActivitiesSection({
  showHeatmap,
  onShowHeatmapChange,
  activityMode,
  onActivityModeChange,
  activityThickness,
  onActivityThicknessChange,
  heatmapDensity,
  onHeatmapDensityChange,
}: Pick<
  LayersPanelProps,
  | 'onShowHeatmapChange'
  | 'showHeatmap'
  | 'onActivityModeChange'
  | 'activityMode'
  | 'activityThickness'
  | 'onActivityThicknessChange'
  | 'heatmapDensity'
  | 'onHeatmapDensityChange'
>) {
  return (
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
            <Text size="sm">Visualization Mode</Text>
            <Group gap="xs">
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
            <Text size="sm"> Line thickness: {activityThickness ?? 3}px</Text>
            <Slider
              w="100%"
              min={1}
              max={10}
              step={1}
              value={activityThickness ?? 3}
              onChange={onActivityThicknessChange}
            />
          </div>

          {activityMode === 'heatmap' && (
            <div>
              <Text size="sm"> Heatmap pixel density: {heatmapDensity ?? 2}</Text>
              <Slider
                w="100%"
                min={0.25}
                max={5}
                step={0.25}
                value={heatmapDensity ?? 2}
                onChange={onHeatmapDensityChange}
              />
            </div>
          )}

          {activityMode === 'lines' && (
            <div>
              <Text size="sm"> Lines ColorScheme</Text>
              placeholder {/* TODO */}
            </div>
          )}

          {activityMode === 'heatmap' && (
            <div>
              <Text size="sm"> Heatmap ColorScheme</Text>
              placeholder {/* TODO */}
            </div>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
