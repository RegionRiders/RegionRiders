import { useMemo } from 'react';
import { Accordion, SimpleGrid, Stack, Text } from '@mantine/core';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';

const PLACEHOLDER_IMAGE =
  'https://img.freepik.com/free-vector/map-city-perspective-with-pin-maps_23-2147624234.jpg?semt=ais_hybrid&w=740&q=80';

const presetEntries = Object.entries(TILE_PRESETS);

export function MapStyleSection({
  settings,
  onSettingChange,
  viewState,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & { viewState?: MapViewState | null }) {
  const handleStyleChange = (url: string, attribution: string) => {
    onSettingChange('tileLayerUrl', url);
    onSettingChange('attribution', attribution);
  };

  const tileUrls = useMemo(() => {
    if (!viewState) {
      return null;
    }
    const { center, zoom } = viewState;
    return Object.fromEntries(
      presetEntries.map(([key, preset]) => [
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
          <SimpleGrid cols={3} spacing="xs">
            {presetEntries.map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl={tileUrls?.[key] ?? PLACEHOLDER_IMAGE}
                label={preset.name}
                onClick={() => handleStyleChange(preset.url, preset.attribution)}
                active={settings.tileLayerUrl === preset.url}
                aria-label={`Switch to ${preset.name.toLowerCase()} map style`}
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
