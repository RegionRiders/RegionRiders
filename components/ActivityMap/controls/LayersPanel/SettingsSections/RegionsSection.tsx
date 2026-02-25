import {
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
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ColorRgbaTextInput } from '@/components/controls/ColorTextInputs/ColorRgbaTextInput';
import { ColorPickerModalButton } from './utils/ColorPickerModalButton/ColorPickerModalButton';

export function RegionsSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  const selectedIndex = settings.selectedRegionStaticSwatchIndex || 0;

  const selectedSwatch = settings.regionStaticColorSwatches[selectedIndex] || [];
  const unvisitedColor = selectedSwatch.find((ct) => ct.threshold === 0)?.color || [0, 0, 0, 0];
  const visitedColor = selectedSwatch.find((ct) => ct.threshold === 1)?.color || [0, 255, 0, 0.2];

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

          {settings.regionMode === 'static' && settings.regionStaticColorSwatches.length > 0 && (
            <>
              <Text size="sm"> Region ColorScheme</Text>
              <SimpleGrid cols={settings.regionStaticColorSwatches.length} spacing="xs">
                {/*Color buttons*/}
                {settings.regionStaticColorSwatches.map((colorThresholds, index) => {
                  const unvisited = colorThresholds.find((ct) => ct.threshold === 0);
                  const visited = colorThresholds.find((ct) => ct.threshold === 1);
                  return (
                    <ColorSwatchButton
                      key={index}
                      color={unvisited?.color || [0, 0, 0, 0]}
                      secondaryColor={visited?.color || [0, 0, 0, 0]}
                      index={index}
                      selectedIndex={settings.selectedRegionStaticSwatchIndex}
                      onClick={() => onSettingChange('selectedRegionStaticSwatchIndex', index)}
                    />
                  );
                })}
              </SimpleGrid>
              <SimpleGrid
                cols={
                  settings.regionStaticColorSwatches.length > 2
                    ? settings.regionStaticColorSwatches.length
                    : 2
                }
                spacing="xs"
              >
                {/* Selected color full editor */}
                <ColorPickerModalButton
                  primaryColor={unvisitedColor}
                  secondaryColor={visitedColor}
                  primaryLabel="Unvisited"
                  secondaryLabel="Visited"
                  onColorChange={(unvisited, visited) => {
                    const newSwatches = [...settings.regionStaticColorSwatches];
                    newSwatches[settings.selectedRegionStaticSwatchIndex] = [
                      { threshold: 0, color: unvisited },
                      { threshold: 1, color: visited },
                    ];
                    onSettingChange('regionStaticColorSwatches', newSwatches);
                  }}
                />
                {/* Selected color simple editor (unvisited color only) */}
                <Box
                  style={{
                    gridColumn: `span ${(settings.regionStaticColorSwatches.length > 2 ? settings.regionStaticColorSwatches.length : 2) - 1}`,
                  }}
                >
                  <ColorRgbaTextInput
                    color={unvisitedColor}
                    onChange={(newColor) => {
                      const newSwatches = [...settings.regionStaticColorSwatches];
                      const currentSwatch =
                        newSwatches[settings.selectedRegionStaticSwatchIndex] || [];
                      const visited = currentSwatch.find((ct) => ct.threshold === 1);
                      newSwatches[settings.selectedRegionStaticSwatchIndex] = [
                        { threshold: 0, color: newColor },
                        { threshold: 1, color: visited?.color || visitedColor },
                      ];
                      onSettingChange('regionStaticColorSwatches', newSwatches);
                    }}
                  />
                </Box>
              </SimpleGrid>
            </>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
