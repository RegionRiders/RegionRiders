'use client';

import { useState } from 'react';
import { ColorPicker, Modal, toRgba } from '@mantine/core';
import { ColorThreshold } from '../ActivityMap/mapTypes';


export function GradientColorPicker() {

  const [colorThresholds, setColorThresholds] = useState([
    {threshold: 1, color: [139, 0, 0, 1]}
  ] as ColorThreshold[]);
  const [activeThresholdIndex, setActiveThresholdIndex] = useState(0);
  return (
    <Modal
      opened
      onClose={function (): void {
        throw new Error('Function not implemented.');
      }}
    >
      <ColorPicker
        format="rgba"
        value={`rgba(${colorThresholds[activeThresholdIndex].color.join(', ')})`}
        onChange={(color) => {
          const rgba = toRgba(color);
          setColorThresholds((prev) => {
            const newThresholds = [...prev];
            newThresholds[activeThresholdIndex] = {
              ...newThresholds[activeThresholdIndex],
              color: [rgba.r, rgba.g, rgba.b, rgba.a],
            };
            return newThresholds;
          });
        }}
      />
    </Modal>
  );
}