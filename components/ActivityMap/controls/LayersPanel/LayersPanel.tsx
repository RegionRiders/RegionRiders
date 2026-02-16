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
import styles from './LayersPanel.module.css';

function LayersPanelContent({ settings, onSettingChange }: LayersPanelProps) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Accordion multiple>
        <RegionsSection settings={settings} onSettingChange={onSettingChange} />

        <ActivitiesSection settings={settings} onSettingChange={onSettingChange} />

        <MapStyleSection settings={settings} onSettingChange={onSettingChange} />
      </Accordion>
    </Card>
  );
}

export default function LayersPanel(props: LayersPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <div className={styles.container}>
      <MapStyleButton
        imageUrl={
          props.placeholderImageUrl ??
          'https://img.freepik.com/free-vector/map-city-perspective-with-pin-maps_23-2147624234.jpg?semt=ais_hybrid&w=740&q=80'
        }
        label="Layers"
        onClick={toggle}
        active={opened}
      />
      <div className={`${styles.panelWrapper} ${opened ? styles.panelWrapperOpen : ''}`}>
        <LayersPanelContent {...props} />
      </div>
    </div>
  );
}
