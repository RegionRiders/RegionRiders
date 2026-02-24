'use client';

import React, { useState } from 'react';
import { ColorPicker, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';
import { hslaToRgba, parseHslaString, rgbaToHsla } from '../../../../utils/hslaUtils';
import { ColorHslaInput } from './ColorHslaInput';
import { ColorRgbaInput } from './ColorRgbaInput';
import { ColorSlider } from './ColorSlider';

export type SliderMode = 'hsla' | 'rgba';

export interface ExtendedColorPickerProps {
  color: RGBA;
  onChange: (color: RGBA) => void;
  defaultMode?: SliderMode;
}

export function ExtendedColorPicker({
  color,
  onChange,
  defaultMode = 'hsla',
}: ExtendedColorPickerProps) {
  const [mode, setMode] = useState<SliderMode>(defaultMode);
  const [hsla, setHsla] = useState(() => rgbaToHsla(...color));
  const [rgba, setRgba] = useState<RGBA>(color);

  function syncFromHsla(next: typeof hsla) {
    setHsla(next);
    const derived = hslaToRgba(next.h, next.s, next.l, next.a);
    setRgba(derived);
    onChange(derived);
  }

  function syncFromRgba(next: RGBA) {
    setRgba(next);
    setHsla(rgbaToHsla(...next));
    onChange(next);
  }

  function handlePickerChange(value: string) {
    const parsed = parseHslaString(value);
    if (parsed) {
      syncFromHsla(parsed);
      return;
    }
    const parsedRgba = parseColorToRgba(value);
    if (parsedRgba) {
      syncFromRgba(parsedRgba);
    }
  }

  function handleHslaChange(key: keyof typeof hsla, value: number) {
    syncFromHsla({ ...hsla, [key]: value });
  }

  function handleRgbaChange(index: 0 | 1 | 2 | 3, value: number) {
    const next = [...rgba] as RGBA;
    next[index] = value;
    syncFromRgba(next);
  }

  const { h, s, l, a } = hsla;
  const hD = Math.round(h),
    sD = Math.round(s),
    lD = Math.round(l);
  const [r, g, b] = rgba;
  const pickerValue = `hsla(${hD}, ${sD}%, ${lD}%, ${a})`;

  return (
    <Stack gap="calc(0.375rem * var(--mantine-scale))">
      <ColorPicker
        format="hsla"
        value={pickerValue}
        onChange={handlePickerChange}
        fullWidth
        p={0}
      />

      <Stack gap="calc(0.375rem * var(--mantine-scale))">
        {mode === 'hsla' && (
          <>
            <SliderRow label={`S: ${sD}%`}>
              <ColorSlider
                aria-label="Saturation"
                value={s / 100}
                onChange={(v) => handleHslaChange('s', v * 100)}
                gradient={`linear-gradient(to right, hsl(${hD},0%,${lD}%), hsl(${hD},100%,${lD}%))`}
              />
            </SliderRow>
            <SliderRow label={`L: ${lD}%`}>
              <ColorSlider
                aria-label="Lightness"
                value={l / 100}
                onChange={(v) => handleHslaChange('l', v * 100)}
                gradient={`linear-gradient(to right, #000, hsl(${hD},${sD}%,50%), #fff)`}
              />
            </SliderRow>
          </>
        )}

        {mode === 'rgba' && (
          <>
            <SliderRow label={`R: ${r}`}>
              <ColorSlider
                aria-label="Red"
                value={r / 255}
                onChange={(v) => handleRgbaChange(0, Math.round(v * 255))}
                gradient={`linear-gradient(to right, rgba(0,${g},${b},1), rgba(255,${g},${b},1))`}
              />
            </SliderRow>
            <SliderRow label={`G: ${g}`}>
              <ColorSlider
                aria-label="Green"
                value={g / 255}
                onChange={(v) => handleRgbaChange(1, Math.round(v * 255))}
                gradient={`linear-gradient(to right, rgba(${r},0,${b},1), rgba(${r},255,${b},1))`}
              />
            </SliderRow>
            <SliderRow label={`B: ${b}`}>
              <ColorSlider
                aria-label="Blue"
                value={b / 255}
                onChange={(v) => handleRgbaChange(2, Math.round(v * 255))}
                gradient={`linear-gradient(to right, rgba(${r},${g},0,1), rgba(${r},${g},255,1))`}
              />
            </SliderRow>
          </>
        )}
      </Stack>

      <SegmentedControl
        value={mode}
        onChange={(v) => setMode(v as SliderMode)}
        data={[
          { label: 'HSLA', value: 'hsla' },
          { label: 'RGBA', value: 'rgba' },
        ]}
        fullWidth
        size="xs"
      />

      {mode === 'rgba' && <ColorRgbaInput color={rgba} onChange={syncFromRgba} />}
      {mode === 'hsla' && (
        <ColorHslaInput
          h={h}
          s={s}
          l={l}
          a={a}
          onChange={(h, s, l, a) => syncFromHsla({ h, s, l, a })}
        />
      )}
    </Stack>
  );
}

function SliderRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <Text size="xs" c="dimmed" w={42} ta="left" style={{ flexShrink: 0 }}>
        {label}
      </Text>
    </Group>
  );
}
