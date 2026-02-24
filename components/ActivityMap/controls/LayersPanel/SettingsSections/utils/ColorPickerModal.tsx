'use client';

import { useState } from 'react';
import { IconEdit } from '@tabler/icons-react';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { ColorSwatchButton } from './ColorSwatchButton';
import { ExtendedColorPicker } from './ExtendedColorPicker';

interface ColorPickerModalProps {
  color: RGBA;
  onColorChange: (color: RGBA) => void;
}

export function ColorPickerModal({ color, onColorChange }: ColorPickerModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<RGBA>(color);

  function handleOpen() {
    setDraft(color);
    open();
  }

  function handleOk() {
    onColorChange(draft);
    close();
  }

  return (
    <>
      <ColorSwatchButton color={color} onClick={handleOpen}>
        <IconEdit
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: 2,
            right: 2,
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
        />
      </ColorSwatchButton>

      <Modal
        opened={opened}
        onClose={close}
        title="Pick a colour"
        centered
        zIndex={9999}
        portalProps={{ target: document.body }}
        size="xs"
      >
        <Stack gap="xs">
          <ExtendedColorPicker color={draft} onChange={setDraft} />

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
