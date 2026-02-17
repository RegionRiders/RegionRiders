import { Accordion, Button, Group, SimpleGrid, Slider, Stack, Switch, Text } from '@mantine/core';
import { ColorSwatchButton } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorSwatchButton';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';

export function ActivitiesSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  return (
    <Accordion.Item value="activities">
      <Accordion.Control>
        <Group justify="space-between" w="100%">
          <Switch
            checked={settings.showActivities}
            onChange={(e) => onSettingChange('showActivities', e.currentTarget.checked)}
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
                variant={settings.activityMode === 'heatmap' ? 'filled' : 'default'}
                onClick={() => onSettingChange('activityMode', 'heatmap')}
              >
                Heatmap
              </Button>
              <Button
                size="sm"
                variant={settings.activityMode === 'lines' ? 'filled' : 'default'}
                onClick={() => onSettingChange('activityMode', 'lines')}
              >
                Lines
              </Button>
            </Group>
          </div>

          <div>
            <Text size="sm"> Line thickness: {settings.activityThickness ?? 3}px</Text>
            <Slider
              w="100%"
              min={1}
              max={10}
              step={1}
              value={settings.activityThickness ?? 3}
              onChange={(value) => onSettingChange('activityThickness', value)}
            />
          </div>

          {settings.activityMode === 'heatmap' && (
            <div>
              <Text size="sm"> Heatmap pixel density: {settings.heatmapDensity ?? 2}</Text>
              <Slider
                w="100%"
                min={0.25}
                max={3}
                step={0.25}
                value={settings.heatmapDensity ?? 2}
                onChange={(value) => onSettingChange('heatmapDensity', value)}
              />
            </div>
          )}

          {settings.activityMode === 'lines' && (
            <div>
              <Text size="sm"> Lines ColorScheme</Text>
              <SimpleGrid cols={settings.lineColorSwatches.length} spacing="xs">
                {settings.lineColorSwatches.map((color, index) => (
                  <ColorSwatchButton
                    key={index}
                    color={color}
                    index={index}
                    selectedIndex={settings.selectedLineSwatchIndex}
                    onClick={() => onSettingChange('selectedLineSwatchIndex', index)}
                  />
                ))}
              </SimpleGrid>
            </div>
          )}

          {settings.activityMode === 'heatmap' && (
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
