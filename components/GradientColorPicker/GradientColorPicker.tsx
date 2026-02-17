'use client';

import { useState } from 'react';
import { Button, ColorPicker, Modal, toRgba } from '@mantine/core';
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
          // Convert string value of the ColorPicker to an RGBA type object
          const rgba = toRgba(color);

          // Update the ColorThreshold color value
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
      <Button onClick={() => {
        // Add a new color threshold to the array (by coping the last color) and set the color on the ColorPicker to the last added color
        setColorThresholds((prev)  => [...prev, prev[prev.length - 1]])
        setActiveThresholdIndex(colorThresholds.length - 1);
      }}>Add Color</Button>
    </Modal>
  );
}