'use client';

import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { Button, Group, Modal, SegmentedControl, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { ColorSwatch } from '@/components/ActivityMap/controls/LayersPanel/types';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';
import {
  ExtendedColorPicker,
  SliderMode,
} from '@/components/controls/ExtendedColorPicker/ExtendedColorPicker';
import classes from './ColorPickerModalButton.module.css';

interface ColorPickerModalProps {
  colorSwatch: ColorSwatch;
  onColorChange: (colorSwatch: ColorSwatch) => void;
}

type ColorMode = 'normal' | 'hover';

export function ColorPickerModalButton({ colorSwatch, onColorChange }: ColorPickerModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [draftNormal, setDraftNormal] = useState<RGBA>(colorSwatch.normal);
  const [draftHover, setDraftHover] = useState<RGBA>(colorSwatch.hover);
  const [colorMode, setColorMode] = useState<ColorMode>('normal');
  const [sliderMode, setSliderMode] = useState<SliderMode>('hsla');

  function handleOpen() {
    setDraftNormal(colorSwatch.normal);
    setDraftHover(colorSwatch.hover);
    setColorMode('normal');
    open();
  }

  function handleOk() {
    onColorChange({
      normal: draftNormal,
      hover: draftHover,
    });
    close();
  }

  function handleColorChange(newColor: RGBA) {
    if (colorMode === 'normal') {
      setDraftNormal(newColor);
    } else {
      setDraftHover(newColor);
    }
  }

  const currentColor = colorMode === 'normal' ? draftNormal : draftHover;

  return (
    <>
      <ColorSwatchButton color={colorSwatch.normal} onClick={handleOpen}>
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
                { label: 'Normal Color', value: 'normal' },
                { label: 'Hover Color', value: 'hover' },
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
