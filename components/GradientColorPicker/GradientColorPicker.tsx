'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconGripVertical } from '@tabler/icons-react';
import {
  ActionIcon,
  Box,
  Button,
  ColorPicker,
  Group,
  NumberInput,
  Stack,
  toRgba,
} from '@mantine/core';
import { ColorThreshold } from '../ActivityMap/mapTypes';
import { ColorNumberInput } from './ColorNumberInput';

interface GradientColorPickerProps {
  value: ColorThreshold[];
  onChange: (thresholds: ColorThreshold[]) => void;
}

export function GradientColorPicker({ value, onChange }: GradientColorPickerProps) {
  const [colorThresholds, setColorThresholds] = useState(value);
  const [activeThresholdIndex, setActiveThresholdIndex] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const gradientBoxRef = useRef<HTMLDivElement>(null);
  const min = 1;

  const stableMaxRef = useRef<number>(Math.max(...value.map((t) => t.threshold)) * 1.1);

  const gradientBackground = useMemo(
    () =>
      `linear-gradient(to right, ${colorThresholds
        .map(
          (t) =>
            `rgba(${t.color.join(', ')}) ${(t.threshold / (stableMaxRef.current - min)) * 100}%`
        )
        .join(', ')})`,
    [colorThresholds]
  );

  useEffect(() => {
    onChange(colorThresholds);
  }, [colorThresholds]);

  useEffect(() => {
    if (!isDragging) {
      stableMaxRef.current = Math.max(...colorThresholds.map((t) => t.threshold)) * 1.1;
    }
  }, [isDragging, colorThresholds]);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const sorted = [...colorThresholds].sort((a, b) => a.threshold - b.threshold);

    const isSameOrder =
      sorted.length === colorThresholds.length && sorted.every((t, i) => t === colorThresholds[i]);

    if (!isSameOrder) {
      const activeItem = colorThresholds[activeThresholdIndex];
      const newIndex = activeItem ? sorted.findIndex((t) => t === activeItem) : -1;

      setColorThresholds(sorted);

      if (newIndex !== -1) {
        setActiveThresholdIndex(newIndex);
      } else {
        setActiveThresholdIndex(Math.max(0, Math.min(activeThresholdIndex, sorted.length - 1)));
      }
    }
  }, [colorThresholds, isDragging, activeThresholdIndex]);

  const handleColorNumberInputChange = (v: number | string, index: number) => {
    setColorThresholds((prev) => {
      const newThresholds = [...prev];
      const currentColor = newThresholds[activeThresholdIndex].color;
      currentColor[index] = +v; // Quick conversion to number
      newThresholds[activeThresholdIndex] = {
        ...newThresholds[activeThresholdIndex],
        color: [currentColor[0], currentColor[1], currentColor[2], currentColor[3] ?? 1],
      };
      return newThresholds;
    });
  };

  return (
    <Stack gap="md" style={{ overflow: 'hidden' }}>
      <Group align="center" wrap="nowrap" justify="space-around">
        <ColorPicker
          size="xl"
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
        <Stack>
          <Group wrap="nowrap" align="center">
            <ColorNumberInput
              label="R"
              index={0}
              value={colorThresholds[activeThresholdIndex].color[0]}
              onChange={handleColorNumberInputChange}
            />
            <ColorNumberInput
              label="G"
              index={1}
              value={colorThresholds[activeThresholdIndex].color[1]}
              onChange={handleColorNumberInputChange}
            />
            <ColorNumberInput
              label="B"
              index={2}
              value={colorThresholds[activeThresholdIndex].color[2]}
              onChange={handleColorNumberInputChange}
            />
          </Group>
          <Group wrap="nowrap" align="center">
            <ColorNumberInput
              label="Opacity"
              index={3}
              value={colorThresholds[activeThresholdIndex].color[3] ?? 1}
              onChange={handleColorNumberInputChange}
            />
            <NumberInput
              size="xs"
              label="Threshold"
              min={min}
              value={colorThresholds[activeThresholdIndex].threshold}
              onChange={(v) => {
                setColorThresholds((prev) => {
                  const newThresholds = [...prev];
                  newThresholds[activeThresholdIndex] = {
                    ...newThresholds[activeThresholdIndex],
                    threshold: +v,
                  };
                  return newThresholds;
                });
              }}
            />
            <Button
              onClick={() => {
                setColorThresholds((prev) => prev.filter((_, i) => i !== activeThresholdIndex));
                if (activeThresholdIndex >= colorThresholds.length) {
                  setActiveThresholdIndex(colorThresholds.length - 1);
                }
              }}
            >
              Remove color
            </Button>
          </Group>
        </Stack>
      </Group>
      <Group align="center" wrap="nowrap">
        <Box
          style={{
            flex: 1,
            position: 'relative',
          }}
        >
          <Box
            ref={gradientBoxRef}
            h={40}
            style={{
              background: gradientBackground,
              borderRadius: 4,
              position: 'relative',
              border: '1px solid var(--mantine-color-gray-4)',
              userSelect: 'none',
            }}
          >
            {colorThresholds.map((threshold, index) => (
              <Box
                key={index}
                style={{
                  position: 'absolute',
                  left: `${(threshold.threshold / (stableMaxRef.current - min)) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  top: '50%',
                  cursor: 'grab',
                }}
                onClick={() => {
                  setActiveThresholdIndex(index);
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startThreshold = threshold.threshold;
                  setIsDragging(true);

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const newThreshold = Math.round(
                      Math.min(
                        stableMaxRef.current,
                        Math.max(
                          min,
                          startThreshold +
                            (deltaX / (gradientBoxRef.current?.clientWidth ?? 300)) *
                              (stableMaxRef.current - min)
                        )
                      )
                    );

                    setColorThresholds((prev) => {
                      const newThresholds = [...prev];
                      newThresholds[index] = {
                        ...newThresholds[index],
                        threshold: newThreshold,
                      };
                      return newThresholds;
                    });
                  };

                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    setIsDragging(false);
                    stableMaxRef.current =
                      Math.max(...colorThresholds.map((t) => t.threshold)) * 1.1;
                  };

                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              >
                <ActionIcon>
                  <IconGripVertical />
                </ActionIcon>
              </Box>
            ))}
          </Box>
        </Box>
        <Button
          onClick={() => {
            // Add a new color threshold to the array (by coping the last color) and set the color on the ColorPicker to the last added color
            setColorThresholds((prev) => [
              ...prev,
              {
                ...prev[prev.length - 1],
                threshold: prev[prev.length - 1].threshold + 10,
              },
            ]);
            setActiveThresholdIndex(colorThresholds.length - 1);
          }}
        >
          Add Color
        </Button>
      </Group>
    </Stack>
  );
}
