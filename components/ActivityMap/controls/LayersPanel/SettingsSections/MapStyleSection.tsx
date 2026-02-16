import { Accordion, SimpleGrid, Stack, Text } from '@mantine/core';
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
          <SimpleGrid cols={3} spacing="xs">
            {Object.entries(TILE_PRESETS).map(([key, preset]) => (
              <MapStyleButton
                key={key}
                imageUrl="https://img.freepik.com/free-vector/map-city-perspective-with-pin-maps_23-2147624234.jpg?semt=ais_hybrid&w=740&q=80"
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
