import { Accordion, Button, Group, Stack, Switch, Text } from '@mantine/core';

export function RegionsSection({
  showBorders,
  onShowBordersChange,
  regionMode,
  onRegionModeChange,
}: Pick<
  LayersPanelProps,
  'onShowBordersChange' | 'showBorders' | 'regionMode' | 'onRegionModeChange'
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
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
