'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconGripVertical } from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  NumberInput,
  Stack,
  useMantineTheme,
} from '@mantine/core';
import { ExtendedColorPicker } from '@/components/controls/ExtendedColorPicker/ExtendedColorPicker';
import { ColorThreshold } from '../ActivityMap/mapTypes';
import { ColorNumberInput } from './ColorNumberInput';

interface GradientColorPickerProps {
  value: ColorThreshold[];
  onChange: (thresholds: ColorThreshold[]) => void;
}

export function GradientColorPicker({ value, onChange }: GradientColorPickerProps) {
  const theme = useMantineTheme();
  const [colorThresholds, setColorThresholds] = useState(value);
  const [activeThresholdIndex, setActiveThresholdIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const gradientBoxRef = useRef<HTMLDivElement>(null);
  const min = 1;
  const MAX_TO_LAST_THRESHOLD_RATIO = 1.1;

  const stableMaxRef = useRef<number>(
    Math.max(...value.map((t) => t.threshold)) * MAX_TO_LAST_THRESHOLD_RATIO
  );

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
    if (!isDragging) {
      onChange(colorThresholds);
    }
  }, [colorThresholds]);

  useEffect(() => {
    if (!isDragging) {
      stableMaxRef.current =
        Math.max(...colorThresholds.map((t) => t.threshold)) * MAX_TO_LAST_THRESHOLD_RATIO;
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
      const currentColor = prev[activeThresholdIndex].color;
      const nextColor = [...currentColor] as [number, number, number, number?];
      nextColor[index] = Number(v);
      newThresholds[activeThresholdIndex] = {
        ...newThresholds[activeThresholdIndex],
        color: [nextColor[0], nextColor[1], nextColor[2], nextColor[3] ?? 1],
      };
      return newThresholds;
    });
  };

  return (
    <Stack gap="md" style={{ overflowX: 'hidden' }}>
      <Group align="center" wrap="nowrap" justify="space-around">
        <ExtendedColorPicker
          layout="horizontal"
          color={colorThresholds[activeThresholdIndex].color}
          onChange={(color) => {
            // Update the ColorThreshold color value
            setColorThresholds((prev) => {
              const newThresholds = [...prev];
              newThresholds[activeThresholdIndex] = {
                ...newThresholds[activeThresholdIndex],
                color,
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
                if (colorThresholds.length <= 1) {
                  return;
                }
                const next = colorThresholds.filter((_, i) => i !== activeThresholdIndex);
                setColorThresholds(next);
                setActiveThresholdIndex((prev) => Math.min(prev, next.length - 1));
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
              overflow: 'visible',
            }}
          >
            {colorThresholds.map((threshold, index) => (
              <>
                <ActionIcon
                  key={index}
                  style={{
                    position: 'absolute',
                    left: `${(threshold.threshold / (stableMaxRef.current - min)) * 100}%`,
                    bottom: '0',
                    transform: 'translate(-50%, 50%) scale(0.5625)',
                  }}
                  aria-label={`Edit threshold ${index + 1}`}
                  tabIndex={0}
                  onClick={() => {
                    setActiveThresholdIndex(index);
                  }}
                  onKeyDown={(e) => {
                    const isActivation = e.key === 'Enter' || e.key === ' ';
                    const isArrowKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                      e.key
                    );

                    if (isActivation) {
                      e.preventDefault();
                      setActiveThresholdIndex(index);
                    }

                    if (isArrowKey) {
                      e.preventDefault();
                      const step = e.shiftKey ? 10 : 1;
                      const direction = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
                      const newThreshold = Math.round(
                        Math.min(
                          stableMaxRef.current,
                          Math.max(min, threshold.threshold + direction * step)
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
                    }
                  }}
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startThreshold = threshold.threshold;
                    setIsDragging(true);
                    setActiveThresholdIndex(index);

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
                  <IconGripVertical />
                </ActionIcon>
                <Divider
                  key={`divider-${index}`}
                  orientation="vertical"
                  style={{
                    position: 'absolute',
                    left: `${(threshold.threshold / (stableMaxRef.current - min)) * 100}%`,
                    transform: 'translateX(-50%)',
                    top: 0,
                    bottom: 0,
                    borderWidth: 2,
                    borderColor: theme.colors.green[9],
                  }}
                />

                <Badge
                  size="xs"
                  key={`badge-${index}`}
                  style={{
                    position: 'absolute',
                    left: `${(threshold.threshold / (stableMaxRef.current - min)) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    top: '0',
                  }}
                >
                  {threshold.threshold}
                </Badge>
              </>
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
            setActiveThresholdIndex(colorThresholds.length);
          }}
        >
          Add Color
        </Button>
      </Group>
    </Stack>
  );
}
