import { Accordion, Group, Stack, Text } from '@mantine/core';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';

export function MapStyleSection({
  settings,
  onSettingChange,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'>) {
  const handleStyleChange = (url: string, attribution: string) => {
    onSettingChange('tileLayerUrl', url);
    onSettingChange('attribution', attribution);
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
          <Group gap="xs">
            <MapStyleButton
              imageUrl="/map-previews/standard.png"
              label="Standard"
              onClick={() =>
                handleStyleChange(TILE_PRESETS.standard.url, TILE_PRESETS.standard.attribution)
              }
              active={settings.tileLayerUrl === TILE_PRESETS.standard.url}
              aria-label="Switch to standard map style"
            />
            <MapStyleButton
              imageUrl="/map-previews/satellite.png"
              label="Satellite"
              onClick={() =>
                handleStyleChange(TILE_PRESETS.satellite.url, TILE_PRESETS.satellite.attribution)
              }
              active={settings.tileLayerUrl === TILE_PRESETS.satellite.url}
              aria-label="Switch to satellite map style"
            />
            <MapStyleButton
              imageUrl="/map-previews/terrain.png"
              label="Terrain"
              onClick={() =>
                handleStyleChange(TILE_PRESETS.terrain.url, TILE_PRESETS.terrain.attribution)
              }
              active={settings.tileLayerUrl === TILE_PRESETS.terrain.url}
              aria-label="Switch to terrain map style"
            />
          </Group>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
