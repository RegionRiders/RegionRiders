import {
  ActionIcon,
  Accordion,
  Box,
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorPickerModalButton } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorPickerModalButton/ColorPickerModalButton';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ColorRgbaTextInput } from '../../../../controls/ColorTextInputs/ColorRgbaTextInput';

export function ActivitiesSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  const activityHeatmapColorSwatches = settings.activityHeatmapColorSwatches || [
    ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  ];
  const selectedActivityHeatmapSwatchIndex = settings.selectedActivityHeatmapSwatchIndex || 0;

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
            <>
              <Text size="sm"> Lines ColorScheme</Text>
              <SimpleGrid cols={settings.lineColorSwatches.length} spacing="xs">
                {/*Color buttons*/}
                {settings.lineColorSwatches.map((colorSwatch, index) => (
                  <ColorSwatchButton
                    key={index}
                    color={colorSwatch.normal}
                    index={index}
                    selectedIndex={settings.selectedLineSwatchIndex}
                    onClick={() => onSettingChange('selectedLineSwatchIndex', index)}
                  />
                ))}
              </SimpleGrid>
              <SimpleGrid
                cols={settings.lineColorSwatches.length > 2 ? settings.lineColorSwatches.length : 2}
                spacing="xs"
              >
                {/* Selected color full editor */}
                <ColorPickerModalButton
                  primaryColor={settings.lineColorSwatches[settings.selectedLineSwatchIndex].normal}
                  secondaryColor={
                    settings.lineColorSwatches[settings.selectedLineSwatchIndex].hover
                  }
                  primaryLabel="Normal Color"
                  secondaryLabel="Hover Color"
                  onColorChange={(normal, hover) => {
                    const newSwatches = [...settings.lineColorSwatches];
                    newSwatches[settings.selectedLineSwatchIndex] = { normal, hover };
                    onSettingChange('lineColorSwatches', newSwatches);
                  }}
                />
                {/* Selected color simple editor (normal color only) */}
                <Box
                  style={{
                    gridColumn: `span ${(settings.lineColorSwatches.length > 2 ? settings.lineColorSwatches.length : 2) - 1}`,
                  }}
                >
                  <ColorRgbaTextInput
                    color={settings.lineColorSwatches[settings.selectedLineSwatchIndex].normal}
                    onChange={(newColor) => {
                      const newSwatches = [...settings.lineColorSwatches];
                      newSwatches[settings.selectedLineSwatchIndex] = {
                        ...newSwatches[settings.selectedLineSwatchIndex],
                        normal: newColor,
                      };
                      onSettingChange('lineColorSwatches', newSwatches);
                    }}
                  />
                </Box>
              </SimpleGrid>
            </>
          )}

          {settings.activityMode === 'heatmap' && (
            <div>
              <Text size="sm"> Heatmap ColorScheme</Text>
              <SimpleGrid cols={activityHeatmapColorSwatches.length} spacing="xs">
                {activityHeatmapColorSwatches.map((colorThresholds, index) => (
                  <ColorSwatchButton
                    key={index}
                    color={colorThresholds[0]?.color || [0, 0, 0, 0]}
                    colorThresholds={colorThresholds}
                    index={index}
                    selectedIndex={selectedActivityHeatmapSwatchIndex}
                    onClick={() => onSettingChange('selectedActivityHeatmapSwatchIndex', index)}
                  />
                ))}
              </SimpleGrid>
              <Group mt="xs">
                <ActionIcon
                  variant="default"
                  aria-label="Edit activity heatmap colors"
                  onClick={() => undefined}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Group>
            </div>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
