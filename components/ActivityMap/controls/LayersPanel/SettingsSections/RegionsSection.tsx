import {
  Accordion,
  Box,
  Button,
  Group,
  Notification,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { REGION_VISIT_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ColorRgbaTextInput } from '@/components/controls/ColorTextInputs/ColorRgbaTextInput';
import { ColorPickerModalButton } from './utils/ColorPickerModalButton/ColorPickerModalButton';
import {
  getClipboardErrorMessage,
  parseColorThresholds,
  serializeColorThresholds,
} from './utils/colorThresholdClipboard';

export function RegionsSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const selectedIndex = settings.selectedRegionStaticSwatchIndex || 0;
  const regionHeatmapColorSwatches = settings.regionHeatmapColorSwatches || [
    REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  ];
  const selectedRegionHeatmapSwatchIndex = settings.selectedRegionHeatmapSwatchIndex || 0;
  const selectedHeatmapColorThresholds =
    regionHeatmapColorSwatches[selectedRegionHeatmapSwatchIndex] || [];

  const selectedSwatch = settings.regionStaticColorSwatches[selectedIndex] || [];
  const unvisitedColor = selectedSwatch.find((ct) => ct.threshold === 0)?.color || [0, 0, 0, 0];
  const visitedColor = selectedSwatch.find((ct) => ct.threshold === 1)?.color || [0, 255, 0, 0.2];

  const showClipboardErrorToast = (message: string) => {
    setClipboardError(message);
    setTimeout(() => setClipboardError(null), 3000);
  };

  const handleHeatmapCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeColorThresholds(selectedHeatmapColorThresholds));
    } catch {
      showClipboardErrorToast('Could not copy heatmap colors to clipboard');
    }
  };

  const handleHeatmapPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsedThresholds = parseColorThresholds(text);
      const newSwatches = [...regionHeatmapColorSwatches];
      newSwatches[selectedRegionHeatmapSwatchIndex] = parsedThresholds;
      onSettingChange('regionHeatmapColorSwatches', newSwatches);
    } catch (error) {
      showClipboardErrorToast(
        getClipboardErrorMessage(error, 'Could not paste heatmap colors from clipboard')
      );
    }
  };

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
          {settings.regionMode === 'heatmap' && regionHeatmapColorSwatches.length > 0 && (
            <>
              <Text size="sm"> Heatmap Color Scheme</Text>
              <SimpleGrid cols={regionHeatmapColorSwatches.length} spacing="xs">
                {regionHeatmapColorSwatches.map((colorThresholds, index) => (
                  <ColorSwatchButton
                    key={index}
                    color={colorThresholds[0]?.color || [0, 0, 0, 0]}
                    colorThresholds={colorThresholds}
                    index={index}
                    selectedIndex={selectedRegionHeatmapSwatchIndex}
                    onClick={() => onSettingChange('selectedRegionHeatmapSwatchIndex', index)}
                  />
                ))}
              </SimpleGrid>
              <Group gap="xs" wrap="nowrap">
                <ColorSwatchButton
                  color={selectedHeatmapColorThresholds[0]?.color || [0, 0, 0, 0]}
                  colorThresholds={selectedHeatmapColorThresholds}
                  ariaLabel="Edit region heatmap colors"
                >
                  <IconEdit
                    size={16}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      filter: 'drop-shadow(0 0 2px rgb(0, 0, 0, 0.5))',
                    }}
                  />
                </ColorSwatchButton>
                <Button size="xs" variant="default" onClick={handleHeatmapCopy}>
                  COPY
                </Button>
                <Button size="xs" variant="default" onClick={handleHeatmapPaste}>
                  PASTE
                </Button>
              </Group>
            </>
          )}
        </Stack>
        {clipboardError && (
          <Notification
            color="red"
            onClose={() => setClipboardError(null)}
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000 }}
          >
            {clipboardError}
          </Notification>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
