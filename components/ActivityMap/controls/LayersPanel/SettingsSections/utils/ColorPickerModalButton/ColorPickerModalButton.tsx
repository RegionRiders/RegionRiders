'use client';

import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { Button, Group, Modal, SegmentedControl, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import {
  ExtendedColorPicker,
  SliderMode,
} from '@/components/controls/ExtendedColorPicker/ExtendedColorPicker';
import classes from './ColorPickerModalButton.module.css';

interface ColorPickerModalProps {
  primaryColor: RGBA;
  secondaryColor: RGBA;
  primaryLabel: string;
  secondaryLabel: string;
  onColorChange: (primaryColor: RGBA, secondaryColor: RGBA) => void;
}

type ColorMode = 'primary' | 'secondary';

export function ColorPickerModalButton({
  primaryColor,
  secondaryColor,
  primaryLabel,
  secondaryLabel,
  onColorChange,
}: ColorPickerModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [draftPrimary, setDraftPrimary] = useState<RGBA>(primaryColor);
  const [draftSecondary, setDraftSecondary] = useState<RGBA>(secondaryColor);
  const [colorMode, setColorMode] = useState<ColorMode>('primary');
  const [sliderMode, setSliderMode] = useState<SliderMode>('hsla');

  function handleOpen() {
    setDraftPrimary(primaryColor);
    setDraftSecondary(secondaryColor);
    setColorMode('primary');
    open();
  }

  function handleOk() {
    onColorChange(draftPrimary, draftSecondary);
    close();
  }

  function handleColorChange(newColor: RGBA) {
    if (colorMode === 'primary') {
      setDraftPrimary(newColor);
    } else {
      setDraftSecondary(newColor);
    }
  }

  const currentColor = colorMode === 'primary' ? draftPrimary : draftSecondary;

  return (
    <>
      <ColorSwatchButton color={primaryColor} secondaryColor={secondaryColor} onClick={handleOpen}>
        <IconEdit className={classes.editIcon} color="black" stroke={3} />
        <IconEdit className={classes.editIcon} />
      </ColorSwatchButton>

      <Modal
        opened={opened}
        onClose={close}
        title="Pick a color"
        centered
        zIndex={10000}
        portalProps={{ target: document.body }}
        size="xs"
      >
        <Stack gap="xs">
          <div>
            <SegmentedControl
              value={colorMode}
              onChange={(value) => setColorMode(value as ColorMode)}
              data={[
                { label: primaryLabel, value: 'primary' },
                { label: secondaryLabel, value: 'secondary' },
              ]}
              fullWidth
            />
          </div>

          <ExtendedColorPicker
            key={colorMode}
            color={currentColor}
            onChange={handleColorChange}
            mode={sliderMode}
            onModeChange={setSliderMode}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={close}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleOk}>
              OK
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
