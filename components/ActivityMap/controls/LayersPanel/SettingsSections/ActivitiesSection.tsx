import { Accordion, Button, Group, Slider, Stack, Switch, Text } from '@mantine/core';

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
              min={1}
              max={4}
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
  );
}
