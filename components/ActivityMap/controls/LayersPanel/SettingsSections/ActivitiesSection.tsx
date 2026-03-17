import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
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
import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorPickerModalButton } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorPickerModalButton/ColorPickerModalButton';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import {
  getClipboardErrorMessage,
  parseColorThresholds,
  serializeColorThresholds,
} from './utils/colorThresholdClipboard';

export function ActivitiesSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const activityHeatmapColorSwatches = settings.activityHeatmapColorSwatches || [
    ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  ];
  const selectedActivityHeatmapSwatchIndex = settings.selectedActivityHeatmapSwatchIndex || 0;
  const selectedHeatmapColorThresholds =
    activityHeatmapColorSwatches[selectedActivityHeatmapSwatchIndex] || [];
  const selectedLineSwatch = settings.lineColorSwatches[settings.selectedLineSwatchIndex] || {
    normal: [0, 0, 0, 1] as [number, number, number, number],
    hover: [0, 0, 0, 1] as [number, number, number, number],
  };

  const showClipboardErrorToast = (message: string) => {
    setClipboardError(message);
    setTimeout(() => setClipboardError(null), 10000);
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
      const newSwatches = [...activityHeatmapColorSwatches];
      newSwatches[selectedActivityHeatmapSwatchIndex] = parsedThresholds;
      onSettingChange('activityHeatmapColorSwatches', newSwatches);
    } catch (error) {
      showClipboardErrorToast(
        getClipboardErrorMessage(error, 'Could not paste heatmap colors from clipboard')
      );
    }
  };

  const handleLineCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        serializeColorThresholds([
          { threshold: 0, color: selectedLineSwatch.normal },
          { threshold: 1, color: selectedLineSwatch.hover },
        ])
      );
    } catch {
      showClipboardErrorToast('Could not copy line colors to clipboard');
    }
  };

  const handleLinePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsedThresholds = parseColorThresholds(text);
      const normal = parsedThresholds.find((ct) => ct.threshold === 0)?.color;
      const hover = parsedThresholds.find((ct) => ct.threshold === 1)?.color;

      if (!normal || !hover) {
        throw new Error('Clipboard data must contain thresholds 0 and 1 for line colors');
      }

      const newSwatches = [...settings.lineColorSwatches];
      newSwatches[settings.selectedLineSwatchIndex] = { normal, hover };
      onSettingChange('lineColorSwatches', newSwatches);
    } catch (error) {
      showClipboardErrorToast(
        getClipboardErrorMessage(error, 'Could not paste line colors from clipboard')
      );
    }
  };

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
            <Stack gap="xs">
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
              {(() => {
                const lineEditorCols =
                  settings.lineColorSwatches.length > 2 ? settings.lineColorSwatches.length : 2;
                return (
                  <SimpleGrid cols={lineEditorCols} spacing="xs">
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
                    <Box style={{ gridColumn: `span ${lineEditorCols - 1}` }}>
                      <SimpleGrid cols={2} spacing="xs">
                        <Button size="xs" variant="default" onClick={handleLineCopy} fullWidth>
                          COPY
                        </Button>
                        <Button size="xs" variant="default" onClick={handleLinePaste} fullWidth>
                          PASTE
                        </Button>
                      </SimpleGrid>
                    </Box>
                  </SimpleGrid>
                );
              })()}
            </Stack>
          )}

          {settings.activityMode === 'heatmap' && (
            <div>
              <Text size="sm"> Heatmap Color Scheme</Text>
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
              {(() => {
                const heatmapEditorCols =
                  activityHeatmapColorSwatches.length > 2 ? activityHeatmapColorSwatches.length : 2;
                return (
                  <SimpleGrid cols={heatmapEditorCols} spacing="xs" mt="xs">
                    <ColorSwatchButton
                      color={selectedHeatmapColorThresholds[0]?.color || [0, 0, 0, 0]}
                      colorThresholds={selectedHeatmapColorThresholds}
                      ariaLabel="Edit activity heatmap colors"
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
                    <Box style={{ gridColumn: `span ${heatmapEditorCols - 1}` }}>
                      <SimpleGrid cols={2} spacing="xs">
                        <Button size="xs" variant="default" onClick={handleHeatmapCopy} fullWidth>
                          COPY
                        </Button>
                        <Button size="xs" variant="default" onClick={handleHeatmapPaste} fullWidth>
                          PASTE
                        </Button>
                      </SimpleGrid>
                    </Box>
                  </SimpleGrid>
                );
              })()}
            </div>
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
