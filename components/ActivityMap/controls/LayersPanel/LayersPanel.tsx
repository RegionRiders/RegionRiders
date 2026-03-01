'use client';

import { useMemo } from 'react';
import { Accordion, Card, Drawer } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import {
  ActivitiesSection,
  MapStyleSection,
  RegionsSection,
} from '@/components/ActivityMap/controls/LayersPanel/SettingsSections';
import { LayersPanelProps } from '@/components/ActivityMap/controls/LayersPanel/types';
import MapStyleButton from '@/components/ActivityMap/controls/LayersPanel/utils/MapStyleButton/MapStyleButton';
import { MapViewState, useMapViewState } from '@/components/ActivityMap/hooks/map/useMapViewState';
import { resolveTileUrl } from '@/components/ActivityMap/utils/resolveTileUrl';
import styles from './LayersPanel.module.css';

const PLACEHOLDER_MAP_IMAGE = 'https://a.tile.opentopomap.org/12/2260/1307.png';
const MOBILE_BREAKPOINT = '(max-width: 768px)';
const DRAWER_Z_INDEX = 10000;

function LayersPanelContent({
  settings,
  onSettingChange,
  viewState,
  isMobile = false,
}: Pick<LayersPanelProps, 'settings' | 'onSettingChange'> & {
  viewState: MapViewState | null;
  isMobile?: boolean;
}) {
  return (
    <Card
      shadow={isMobile ? undefined : 'sm'}
      radius={isMobile ? 0 : 'md'}
      className={isMobile ? styles.mobilePanel : styles.panel}
      withBorder={!isMobile}
    >
      <Accordion>
        <RegionsSection settings={settings} onSettingChange={onSettingChange} />

        <ActivitiesSection settings={settings} onSettingChange={onSettingChange} />

        <MapStyleSection
          settings={settings}
          onSettingChange={onSettingChange}
          viewState={viewState}
        />
      </Accordion>
    </Card>
  );
}

export default function LayersPanel(props: LayersPanelProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const viewState = useMapViewState(props.map ?? null);
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT, false);

  const isSatellite = props.settings.tileLayerUrl === TILE_PRESETS.satellite.url;
  const layerButtonPreset = isSatellite ? TILE_PRESETS.standard : TILE_PRESETS.satellite;

  const layerButtonImageUrl = useMemo(
    () =>
      viewState
        ? resolveTileUrl(
            layerButtonPreset.url,
            viewState.center[0],
            viewState.center[1],
            viewState.zoom
          )
        : (props.placeholderImageUrl ?? PLACEHOLDER_MAP_IMAGE),
    [viewState, layerButtonPreset.url, props.placeholderImageUrl, props.settings.tileLayerUrl]
  );

  return (
    <div className={styles.container}>
      <MapStyleButton
        imageUrl={layerButtonImageUrl}
        label="Layers"
        onClick={toggle}
        fullWidth
        active={opened}
      />

      {/* Desktop: Show dropdown panel */}
      {!isMobile && (
        <div className={`${styles.panelWrapper} ${opened ? styles.panelWrapperOpen : ''}`}>
          <LayersPanelContent
            settings={props.settings}
            onSettingChange={props.onSettingChange}
            viewState={viewState}
          />
        </div>
      )}

      {/* Mobile: Show full-screen drawer */}
      {isMobile && (
        <Drawer
          opened={opened}
          onClose={close}
          title="Layers"
          position="bottom"
          size="100%"
          zIndex={DRAWER_Z_INDEX}
          classNames={{
            body: styles.drawerBody,
            content: styles.drawerContent,
          }}
        >
          <LayersPanelContent
            settings={props.settings}
            onSettingChange={props.onSettingChange}
            viewState={viewState}
            isMobile
          />
        </Drawer>
      )}
    </div>
  );
}
