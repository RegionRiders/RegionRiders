import { useMemo, useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import {
  Accordion,
  Box,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DEFAULT_MAP_TINT_SWATCHES } from '@/components/ActivityMap/config/mapConfig';
import {
  MAP_OVERLAY_PRESET_KEYS,
  MAP_SOURCE_PRESET_KEYS,
  TILE_PRESETS,
} from '@/components/ActivityMap/config/tilePresets';
import { ColorSchemeSwatchesGrid } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorSchemeSwatchesGrid';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ColorRgbaTextInput } from '@/components/controls/ColorTextInputs/ColorRgbaTextInput';
import {
  ExtendedColorPicker,
  SliderMode,
} from '@/components/controls/ExtendedColorPicker/ExtendedColorPicker';

const sourcePresetEntries = MAP_SOURCE_PRESET_KEYS.map((key) => [key, TILE_PRESETS[key]] as const);
const overlayPresetEntries = MAP_OVERLAY_PRESET_KEYS.map(
  (key) => [key, TILE_PRESETS[key]] as const
);

export function MapStyleSection({
  settings,
  onSettingChange,
  viewState,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & {
  viewState?: MapViewState | null;
}) {
  const mapTintSwatches = settings.mapTintSwatches ?? DEFAULT_MAP_TINT_SWATCHES;
  const selectedMapTintSwatchIndex = settings.selectedMapTintSwatchIndex ?? 0;
  const selectedTintColor =
    mapTintSwatches[selectedMapTintSwatchIndex] ?? DEFAULT_MAP_TINT_SWATCHES[0];
  const [tintModalOpened, { open: openTintModal, close: closeTintModal }] = useDisclosure(false);
  const [draftTint, setDraftTint] = useState(selectedTintColor);
  const [sliderMode, setSliderMode] = useState<SliderMode>('hsla');

  const handleStyleChange = (url: string, attribution: string) => {
    onSettingChange('tileLayerUrl', url);
    onSettingChange('attribution', attribution);
  };

  const handleOverlayChange = (url: string, attribution: string) => {
    onSettingChange('overlayTileLayerUrl', url);
    onSettingChange('overlayAttribution', attribution);
  };

  const tileUrls = useMemo(() => {
    if (!viewState) {
      return null;
    }
    const { center, zoom } = viewState;
    return Object.fromEntries(
      Object.entries(TILE_PRESETS).map(([key, preset]) => [
        key,
        resolveTileUrl(preset.url, center[0], center[1], zoom),
      ])
    ) as Record<string, string>;
  }, [viewState]);

  const handleOpenTintEditor = () => {
    setDraftTint(selectedTintColor);
    openTintModal();
  };

  const handleSaveTint = () => {
    const newSwatches = [...mapTintSwatches];
    newSwatches[selectedMapTintSwatchIndex] = draftTint;
    onSettingChange('mapTintSwatches', newSwatches);
    closeTintModal();
  };

  return (
    <Accordion.Item value="mapstyle">
      <Accordion.Control>
        <Text fw={600} size="sm" mr="auto">
          Map Style
        </Text>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          {/* ── Map source header row ── */}
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm">Map source</Text>
            <Switch
              checked={settings.mapSourceMonochrome ?? false}
              onChange={(e) => onSettingChange('mapSourceMonochrome', e.currentTarget.checked)}
              label="Monochromatic"
              labelPosition="left"
              size="xs"
              aria-label="Toggle monochromatic map source"
            />
          </Group>
          <SimpleGrid
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 78px))' }}
            spacing="xs"
          >
            {sourcePresetEntries.map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl={tileUrls?.[key] ?? undefined}
                label={preset.name}
                onClick={() => handleStyleChange(preset.url, preset.attribution)}
                active={settings.tileLayerUrl === preset.url}
                aria-label={`Switch to ${preset.name.toLowerCase()} map style`}
              />
            ))}
          </SimpleGrid>

          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm">Map overlay</Text>
            <Switch
              checked={settings.mapOverlayMonochrome ?? false}
              onChange={(e) => onSettingChange('mapOverlayMonochrome', e.currentTarget.checked)}
              label="Monochromatic"
              labelPosition="left"
              size="xs"
              aria-label="Toggle monochromatic map overlay"
            />
          </Group>
          <SimpleGrid
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 78px))' }}
            spacing="xs"
          >
            {overlayPresetEntries.map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl={tileUrls?.[key] ?? undefined}
                label={preset.name}
                onClick={() => handleOverlayChange(preset.url, preset.attribution)}
                active={settings.overlayTileLayerUrl === preset.url}
                aria-label={`Switch to ${preset.name.toLowerCase()} map overlay`}
              />
            ))}
          </SimpleGrid>

          <ColorSchemeSwatchesGrid
            mode="static"
            label="Map Tint"
            swatches={mapTintSwatches.map((swatch) => ({ color: swatch }))}
            selectedIndex={selectedMapTintSwatchIndex}
            onSwatchSelect={(index) => onSettingChange('selectedMapTintSwatchIndex', index)}
            renderEditButton={() => (
              <ColorSwatchButton
                color={selectedTintColor}
                ariaLabel="Map tint color"
                onClick={handleOpenTintEditor}
              >
                <IconEdit
                  color="black"
                  stroke={3}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))',
                  }}
                />
                <IconEdit
                  color="white"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))',
                  }}
                />
              </ColorSwatchButton>
            )}
            renderEditorPanel={(editorCols) => (
              <Box style={{ gridColumn: `span ${Math.max(editorCols - 1, 1)}` }}>
                <ColorRgbaTextInput
                  color={selectedTintColor}
                  onChange={(nextColor) => {
                    const newSwatches = [...mapTintSwatches];
                    newSwatches[selectedMapTintSwatchIndex] = nextColor;
                    onSettingChange('mapTintSwatches', newSwatches);
                  }}
                />
              </Box>
            )}
          />

          <Modal
            opened={tintModalOpened}
            onClose={closeTintModal}
            title="Pick map tint color"
            centered
            zIndex={10000}
            portalProps={{ target: document.body }}
            size="xs"
          >
            <Stack gap="xs">
              <ExtendedColorPicker
                color={draftTint}
                onChange={setDraftTint}
                mode={sliderMode}
                onModeChange={setSliderMode}
              />
              <Group justify="flex-end" gap="xs">
                <Button variant="default" size="xs" onClick={closeTintModal}>
                  Cancel
                </Button>
                <Button size="xs" onClick={handleSaveTint}>
                  OK
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
