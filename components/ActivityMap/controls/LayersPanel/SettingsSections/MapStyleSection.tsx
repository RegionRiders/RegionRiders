import { useMemo, useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { Accordion, Box, Button, Group, Modal, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DEFAULT_MAP_TINT_SWATCHES } from '@/components/ActivityMap/config/mapConfig';
import {
  MAP_OVERLAY_PRESET_KEYS,
  MAP_SOURCE_PRESET_KEYS,
  TILE_PRESETS,
} from '@/components/ActivityMap/config/tilePresets';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';
import { ColorRgbaTextInput } from '@/components/controls/ColorTextInputs/ColorRgbaTextInput';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import { ExtendedColorPicker, SliderMode } from '@/components/controls/ExtendedColorPicker/ExtendedColorPicker';

const sourcePresetEntries = MAP_SOURCE_PRESET_KEYS.map((key) => [key, TILE_PRESETS[key]] as const);
const overlayPresetEntries = MAP_OVERLAY_PRESET_KEYS.map((key) => [key, TILE_PRESETS[key]] as const);
const TRANSPARENT_PLACEHOLDER_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export function MapStyleSection({
  settings,
  onSettingChange,
  viewState,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & {
  viewState?: MapViewState | null;
}) {
  const mapTintSwatches = settings.mapTintSwatches ?? DEFAULT_MAP_TINT_SWATCHES;
  const selectedMapTintSwatchIndex = settings.selectedMapTintSwatchIndex ?? 0;
  const selectedTintColor = mapTintSwatches[selectedMapTintSwatchIndex] ?? DEFAULT_MAP_TINT_SWATCHES[0];
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
          <Text size="sm">Map source</Text>
          <SimpleGrid
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 78px))' }}
            spacing="xs"
          >
            {sourcePresetEntries.map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl={tileUrls?.[key]}
                label={preset.name}
                onClick={() => handleStyleChange(preset.url, preset.attribution)}
                active={settings.tileLayerUrl === preset.url}
                aria-label={`Switch to ${preset.name.toLowerCase()} map style`}
              />
            ))}
          </SimpleGrid>
          <Switch
            checked={settings.mapSourceMonochrome ?? false}
            onChange={(e) => onSettingChange('mapSourceMonochrome', e.currentTarget.checked)}
            label="Monochromatic source"
            aria-label="Toggle monochromatic map source"
          />
          <Text size="sm">Map overlay</Text>
          <SimpleGrid
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 78px))' }}
            spacing="xs"
          >
            <MapStyleButton
              label="None"
              imageUrl={TRANSPARENT_PLACEHOLDER_IMAGE}
              onClick={() => handleOverlayChange('', '')}
              active={!settings.overlayTileLayerUrl}
              aria-label="Disable map overlay"
            />
            {overlayPresetEntries.map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl={tileUrls?.[key]}
                label={preset.name}
                onClick={() => handleOverlayChange(preset.url, preset.attribution)}
                active={settings.overlayTileLayerUrl === preset.url}
                aria-label={`Switch to ${preset.name.toLowerCase()} map overlay`}
              />
            ))}
          </SimpleGrid>
          <Switch
            checked={settings.mapOverlayMonochrome ?? false}
            onChange={(e) => onSettingChange('mapOverlayMonochrome', e.currentTarget.checked)}
            label="Monochromatic overlay"
            aria-label="Toggle monochromatic map overlay"
          />
          <Stack gap={0}>
            <Text size="sm">Map Tint</Text>
            <SimpleGrid cols={mapTintSwatches.length} spacing="xs">
              {mapTintSwatches.map((swatch, index) => (
                <ColorSwatchButton
                  key={`${swatch.join(',')}-${index}`}
                  color={swatch}
                  index={index}
                  selectedIndex={selectedMapTintSwatchIndex}
                  onClick={() => onSettingChange('selectedMapTintSwatchIndex', index)}
                />
              ))}
            </SimpleGrid>
          </Stack>
          <SimpleGrid cols={mapTintSwatches.length} spacing="xs">
            <Box>
              <ColorSwatchButton color={selectedTintColor} onClick={handleOpenTintEditor}>
                <IconEdit
                  color="white"
                  stroke={3}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'drop-shadow(0 0 2px rgb(0, 0, 0, 0.8))',
                  }}
                />
              </ColorSwatchButton>
            </Box>
            <Box style={{ gridColumn: `span ${Math.max(mapTintSwatches.length - 1, 1)}` }}>
              <ColorRgbaTextInput
                color={selectedTintColor}
                label="Map tint color"
                onChange={(nextColor) => {
                  const newSwatches = [...mapTintSwatches];
                  newSwatches[selectedMapTintSwatchIndex] = nextColor;
                  onSettingChange('mapTintSwatches', newSwatches);
                }}
              />
            </Box>
          </SimpleGrid>
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
