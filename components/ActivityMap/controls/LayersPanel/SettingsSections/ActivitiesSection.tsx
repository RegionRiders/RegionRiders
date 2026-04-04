import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { Accordion, Button, Group, Notification, Slider, Stack, Switch, Text } from '@mantine/core';
import {
  DEFAULT_ACTIVITY_HEATMAP_COLOR_SWATCHES,
  DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES,
} from '@/components/ActivityMap/config/mapConfig';
import { ColorPickerModalButton } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorPickerModalButton/ColorPickerModalButton';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ColorSchemeSwatchesGrid } from './utils/ColorSchemeSwatchesGrid';
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

  const lineColorSwatches =
    settings.lineColorSwatches?.length && settings.lineColorSwatches.length > 0
      ? settings.lineColorSwatches
      : DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES;

  const selectedLineSwatchIndex =
    settings.selectedLineSwatchIndex >= 0 &&
    settings.selectedLineSwatchIndex < lineColorSwatches.length
      ? settings.selectedLineSwatchIndex
      : 0;

  const activityHeatmapColorSwatches =
    settings.activityHeatmapColorSwatches?.length &&
    settings.activityHeatmapColorSwatches.length > 0
      ? settings.activityHeatmapColorSwatches
      : DEFAULT_ACTIVITY_HEATMAP_COLOR_SWATCHES;

  const selectedActivityHeatmapSwatchIndex =
    typeof settings.selectedActivityHeatmapSwatchIndex === 'number' &&
    settings.selectedActivityHeatmapSwatchIndex >= 0 &&
    settings.selectedActivityHeatmapSwatchIndex < activityHeatmapColorSwatches.length
      ? settings.selectedActivityHeatmapSwatchIndex
      : 0;

  const selectedLineSwatch =
    lineColorSwatches[selectedLineSwatchIndex] ??
    lineColorSwatches[0] ??
    DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES[0];

  const selectedHeatmapColorThresholds =
    activityHeatmapColorSwatches[selectedActivityHeatmapSwatchIndex] ??
    activityHeatmapColorSwatches[0] ??
    [];

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

  const handleLinesCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        serializeColorThresholds([
          { threshold: 0, color: selectedLineSwatch.normal },
          { threshold: 1, color: selectedLineSwatch.hover },
        ])
      );
    } catch {
      showClipboardErrorToast('Could not copy lines colors to clipboard');
    }
  };

  const handleLinesPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsedThresholds = parseColorThresholds(text);
      const normal = parsedThresholds.find((threshold) => threshold.threshold === 0)?.color;
      const hover = parsedThresholds.find((threshold) => threshold.threshold === 1)?.color;
      if (!normal || !hover) {
        throw new Error('Clipboard data must include both threshold 0 and 1 colors');
      }
      const newSwatches = [...lineColorSwatches];
      newSwatches[selectedLineSwatchIndex] = { normal, hover };
      onSettingChange('lineColorSwatches', newSwatches);
    } catch (error) {
      showClipboardErrorToast(getClipboardErrorMessage(error, 'Could not paste lines colors'));
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

          <div>
            <Text size="sm">
              Layer transparency: {Math.round((settings.activityLayerTransparency ?? 1) * 100)}%
            </Text>
            <Slider
              w="100%"
              min={0}
              max={1}
              step={0.05}
              value={settings.activityLayerTransparency ?? 1}
              onChange={(value) => onSettingChange('activityLayerTransparency', value)}
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
            <ColorSchemeSwatchesGrid
              mode="static"
              label="Lines ColorScheme"
              swatches={lineColorSwatches.map((swatch) => ({
                color: swatch.normal,
                secondaryColor: swatch.hover,
              }))}
              selectedIndex={selectedLineSwatchIndex}
              onSwatchSelect={(index) => onSettingChange('selectedLineSwatchIndex', index)}
              onCopy={handleLinesCopy}
              onPaste={handleLinesPaste}
              renderEditButton={() => (
                <ColorPickerModalButton
                  primaryColor={selectedLineSwatch.normal}
                  secondaryColor={selectedLineSwatch.hover}
                  primaryLabel="Normal Color"
                  secondaryLabel="Hover Color"
                  onColorChange={(normal, hover) => {
                    const newSwatches = [...lineColorSwatches];
                    newSwatches[selectedLineSwatchIndex] = { normal, hover };
                    onSettingChange('lineColorSwatches', newSwatches);
                  }}
                />
              )}
            />
          )}

          {settings.activityMode === 'heatmap' && (
            <div>
              <ColorSchemeSwatchesGrid
                mode="thresholded"
                label="Heatmap Color Scheme"
                swatches={activityHeatmapColorSwatches}
                selectedIndex={selectedActivityHeatmapSwatchIndex}
                onSwatchSelect={(index) =>
                  onSettingChange('selectedActivityHeatmapSwatchIndex', index)
                }
                onCopy={handleHeatmapCopy}
                onPaste={handleHeatmapPaste}
                renderEditButton={() => (
                  <ColorSwatchButton
                    color={selectedHeatmapColorThresholds[0]?.color || [0, 0, 0, 0]}
                    colorThresholds={selectedHeatmapColorThresholds}
                    ariaLabel="Edit activity heatmap colors"
                  >
                    <IconEdit
                      color="black"
                      stroke={3}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        filter: 'drop-shadow(0 0 2px rgb(0, 0, 0, 0.5))',
                      }}
                    />
                  </ColorSwatchButton>
                )}
              />
            </div>
          )}
        </Stack>
      </Accordion.Panel>
      {clipboardError && (
        <Notification
          color="red"
          onClose={() => setClipboardError(null)}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000 }}
        >
          {clipboardError}
        </Notification>
      )}
    </Accordion.Item>
  );
}
