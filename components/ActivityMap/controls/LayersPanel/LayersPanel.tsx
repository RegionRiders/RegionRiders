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

function IconBoxMultiple(props: { size: number; stroke: number }) {
  return null;
}
function LayersPanelContent({ settings, onSettingChange, placeholderImageUrl }: LayersPanelProps) {
  return (
    <Card shadow="sm" radius="md" className={styles.panel} withBorder>
      <Accordion multiple>
        <RegionsSection settings={settings} onSettingsChange={onSettingChange} />

        <ActivitiesSection settings={settings} onSettingsChange={onSettingChange} />

        <MapStyleSection />
      </Accordion>
    </Card>
  );
}

export default function LayersPanel(props: LayersPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <div className={styles.container}>
      <MapStyleButton
        imageUrl={props.placeholderImageUrl}
        label="Layers"
        icon={<IconBoxMultiple size={16} stroke={2} />}
        onClick={toggle}
        active={opened}
      />
      <div className={`${styles.panelWrapper} ${opened ? styles.panelWrapperOpen : ''}`}>
        <LayersPanelContent {...props} />
      </div>
    </div>
  );
}
