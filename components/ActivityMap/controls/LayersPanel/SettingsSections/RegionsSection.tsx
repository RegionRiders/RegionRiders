import { Accordion, Button, Group, Slider, Stack, Switch, Text } from '@mantine/core';

export function RegionsSection({
  showBorders,
  onShowBordersChange,
  regionMode,
  onRegionModeChange,
  regionBorderThickness,
  onRegionBorderThicknessChange,
}: Pick<
  LayersPanelProps,
  | 'onShowBordersChange'
  | 'showBorders'
  | 'regionMode'
  | 'onRegionModeChange'
  | 'regionBorderThickness'
  | 'onRegionBorderThicknessChange'
>) {
  return (
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
      <Accordion.Panel>
        <Stack gap="md">
          <div>
            <Text size="sm">Visualization Mode</Text>
            <Group gap="xs">
              <Button
                size="sm"
                variant={regionMode === 'heatmap' ? 'filled' : 'default'}
                onClick={() => onRegionModeChange?.('heatmap')}
              >
                Heatmap
              </Button>
              <Button
                size="sm"
                variant={regionMode === 'static' ? 'filled' : 'default'}
                onClick={() => onRegionModeChange?.('static')}
              >
                Static
              </Button>
            </Group>
          </div>

          <div>
            <Text size="sm"> Border thickness: {regionBorderThickness ?? 3}</Text>
            <Slider
              w="100%"
              min={0}
              max={10}
              step={0.1}
              value={regionBorderThickness ?? 3}
              onChange={onRegionBorderThicknessChange}
            />
          </div>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
