import { useMemo } from 'react';
import { Accordion, Box, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import {
  MAP_OVERLAY_PRESET_KEYS,
  MAP_SOURCE_PRESET_KEYS,
  TILE_PRESETS,
} from '@/components/ActivityMap/config/tilePresets';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorPickerModalButton } from '@/components/ActivityMap/controls/LayersPanel/SettingsSections/utils/ColorPickerModalButton/ColorPickerModalButton';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';

const sourcePresetEntries = MAP_SOURCE_PRESET_KEYS.map((key) => [key, TILE_PRESETS[key]] as const);
const overlayPresetEntries = MAP_OVERLAY_PRESET_KEYS.map((key) => [key, TILE_PRESETS[key]] as const);
const defaultMapTintSwatches: RGBA[] = [
  [0, 0, 0, 0],
  [70, 70, 70, 0.18],
  [210, 70, 70, 0.16],
  [80, 80, 170, 0.16],
  [255, 200, 90, 0.14],
];

export function MapStyleSection({
  settings,
  onSettingChange,
  viewState,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & {
  viewState?: MapViewState | null;
}) {
  const mapTintSwatches = settings.mapTintSwatches ?? defaultMapTintSwatches;
  const selectedMapTintSwatchIndex = settings.selectedMapTintSwatchIndex ?? 0;
  const selectedTintColor = mapTintSwatches[selectedMapTintSwatchIndex] ?? defaultMapTintSwatches[0];

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

  return (
    <Accordion.Item value="mapstyle">
      <Accordion.Control>
        <Text fw={600} size="sm" mr="auto">
          Map Style
        </Text>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          <Text size="sm">Map overlay</Text>
          <SimpleGrid
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(25px, 78px))' }}
            spacing="xs"
          >
            <MapStyleButton
              label="None"
              imageUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
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
            checked={settings.monochromeMap ?? false}
            onChange={(e) => onSettingChange('monochromeMap', e.currentTarget.checked)}
            label="Monochromatic"
            aria-label="Toggle monochromatic map style"
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
              <ColorPickerModalButton
                primaryColor={selectedTintColor}
                secondaryColor={selectedTintColor}
                primaryLabel="Tint"
                secondaryLabel="Tint"
                onColorChange={(primaryColor) => {
                  const newSwatches = [...mapTintSwatches];
                  newSwatches[selectedMapTintSwatchIndex] = primaryColor;
                  onSettingChange('mapTintSwatches', newSwatches);
                }}
              />
            </Box>
          </SimpleGrid>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
