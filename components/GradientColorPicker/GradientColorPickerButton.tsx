'use client';

import { useState } from 'react';
import { Button, Modal } from '@mantine/core';
import type { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { GradientColorPicker } from './GradientColorPicker';

interface GradientColorPickerButtonProps {
  value: ColorThreshold[];
  onChange: (thresholds: ColorThreshold[]) => void;
  buttonLabel?: string;
  buttonVariant?: 'filled' | 'light' | 'outline' | 'default';
}

export function GradientColorPickerButton({
  value,
  onChange,
  buttonLabel = 'Edit Gradient',
  buttonVariant = 'light',
}: GradientColorPickerButtonProps) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button variant={buttonVariant} onClick={() => setOpened(true)}>
        {buttonLabel}
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Gradient Color Picker"
        size="lg"
        centered
        styles={{
          root: { zIndex: 999999 },
          inner: { zIndex: 999999 },
        }}
      >
        <GradientColorPicker value={value} onChange={onChange} />
      </Modal>
    </>
  );
}
