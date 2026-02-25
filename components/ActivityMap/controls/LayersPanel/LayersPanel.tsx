'use client';

import { Accordion, Card } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  ActivitiesSection,
  MapStyleSection,
  RegionsSection,
} from '@/components/ActivityMap/controls/LayersPanel/SettingsSections';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState, useMapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import styles from './LayersPanel.module.css';

function LayersPanelContent({
  settings,
  onSettingChange,
  viewState,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & { viewState: MapViewState | null }) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Accordion multiple>
        <RegionsSection settings={settings} onSettingChange={onSettingChange} />

        <ActivitiesSection settings={settings} onSettingChange={onSettingChange} />

        <MapStyleSection settings={settings} onSettingChange={onSettingChange} viewState={viewState} />
      </Accordion>
    </Card>
  );
}

export default function LayersPanel(props: LayersPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);
  const viewState = useMapViewState(props.map ?? null);

  const isSatellite = props.settings.tileLayerUrl === TILE_PRESETS.satellite.url;
  const layerButtonPreset = isSatellite ? TILE_PRESETS.standard : TILE_PRESETS.satellite;

  const layerButtonImageUrl =
    viewState
      ? resolveTileUrl(layerButtonPreset.url, viewState.center[0], viewState.center[1], viewState.zoom)
      : props.placeholderImageUrl ??
        'https://img.freepik.com/free-vector/map-city-perspective-with-pin-maps_23-2147624234.jpg?semt=ais_hybrid&w=740&q=80';

  return (
    <div className={styles.container}>
      <MapStyleButton
        imageUrl={layerButtonImageUrl}
        label="Layers"
        onClick={toggle}
        fullWidth
        active={opened}
      />
      <div className={`${styles.panelWrapper} ${opened ? styles.panelWrapperOpen : ''}`}>
        <LayersPanelContent
          settings={props.settings}
          onSettingChange={props.onSettingChange}
          viewState={viewState}
        />
      </div>
    </div>
  );
}
