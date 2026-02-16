import { Accordion, Button, Group, Slider, Stack, Switch, Text } from '@mantine/core';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';

export function RegionsSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  return (
    <Accordion.Item value="regions">
      <Accordion.Control>
        <Group justify="space-between" w="100%">
          <Switch
            checked={settings.showRegions}
            onChange={(e) => onSettingChange('showRegions', e.currentTarget.checked)}
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
                variant={settings.regionMode === 'heatmap' ? 'filled' : 'default'}
                onClick={() => onSettingChange('regionMode', 'heatmap')}
              >
                Heatmap
              </Button>
              <Button
                size="sm"
                variant={settings.regionMode === 'static' ? 'filled' : 'default'}
                onClick={() => onSettingChange('regionMode', 'static')}
              >
                Static
              </Button>
            </Group>
          </div>

          <div>
            <Text size="sm"> Border thickness: {settings.regionBorderThickness}</Text>
            <Slider
              w="100%"
              min={0}
              max={10}
              step={0.1}
              value={settings.regionBorderThickness}
              onChange={(value) => onSettingChange('regionBorderThickness', value)}
            />
          </div>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
