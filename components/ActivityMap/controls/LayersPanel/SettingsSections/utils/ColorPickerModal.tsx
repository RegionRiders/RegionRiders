'use client';

import { useState } from 'react';
import { Button, ColorPicker, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';
import { ColorSlider } from './_ColorSlider';
import { ColorRgbaInput } from './ColorRgbaInput';
import { ColorSwatchButton } from './ColorSwatchButton';

// ─── Conversions ──────────────────────────────────────────────────────────────

type HSLA = { h: number; s: number; l: number; a: number };

function rgbaToHsla(r: number, g: number, b: number, a: number): HSLA {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a };
}

function hslaToRgba(h: number, s: number, l: number, a: number): RGBA {
  const sl = s / 100,
    ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * sl;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a];
}

function rgbaToString([r, g, b, a]: RGBA) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ColorPickerModalProps {
  color: RGBA;
  onColorChange: (color: RGBA) => void;
}

type SliderMode = 'hsla' | 'rgba';

export function ColorPickerModal({ color, onColorChange }: ColorPickerModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<RGBA>(color);
  const [mode, setMode] = useState<SliderMode>('hsla');

  function handleOpen() {
    setDraft(color);
    open();
  }

  function handlePickerChange(value: string) {
    // Mantine emits "hsla(h, s%, l%, a)" — parseColorToRgba doesn't handle this format
    const hslaMatch = value.match(
      /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (hslaMatch) {
      const h = parseFloat(hslaMatch[1]);
      const s = parseFloat(hslaMatch[2]);
      const l = parseFloat(hslaMatch[3]);
      const a = hslaMatch[4] !== undefined ? parseFloat(hslaMatch[4]) : 1;
      setDraft(hslaToRgba(h, s, l, a));
      return;
    }
    // Fallback for any other format the picker might emit
    const parsed = parseColorToRgba(value);
    if (parsed) {
      setDraft(parsed);
    }
  }

  function handleHslaChange(key: keyof HSLA, value: number) {
    const next = { ...rgbaToHsla(...draft), [key]: value };
    setDraft(hslaToRgba(next.h, next.s, next.l, next.a));
  }

  function handleRgbaChange(index: 0 | 1 | 2 | 3, value: number) {
    const next = [...draft] as RGBA;
    next[index] = value;
    setDraft(next);
  }

  function handleOk() {
    onColorChange(draft);
    close();
  }

  const [r, g, b, a] = draft;
  const { h, s, l } = rgbaToHsla(r, g, b, a);
  const colorString = rgbaToString(draft);

  // Keep the native ColorPicker in hsla format so its built-in
  // hue + alpha sliders stay fully functional and unduplicated.
  const pickerValue = `hsla(${h}, ${s}%, ${l}%, ${a})`;

  return (
    <>
      {/* Trigger */}
      <ColorSwatchButton color={draft} onClick={handleOpen} />

      <Modal
        opened={opened}
        onClose={close}
        title="Pick a colour"
        size="xs"
        centered
        zIndex={9999}
        portalProps={{ target: document.body }}
      >
        <Stack gap="xs">
          {/* Native Mantine picker — includes the 2D gradient, hue slider, and alpha slider */}
          <ColorPicker format="hsla" value={pickerValue} onChange={handlePickerChange} fullWidth />

          {/* Mode toggle for the extra custom sliders below */}
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

          {/* HSLA: only Saturation and Lightness — hue & alpha are native above */}
          {mode === 'hsla' && (
            <>
              <SliderRow label={`S — ${s}%`}>
                <ColorSlider
                  aria-label="Saturation"
                  value={s / 100}
                  onChange={(v) => handleHslaChange('s', Math.round(v * 100))}
                  gradient={`linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`}
                />
              </SliderRow>
              <SliderRow label={`L — ${l}%`}>
                <ColorSlider
                  aria-label="Lightness"
                  value={l / 100}
                  onChange={(v) => handleHslaChange('l', Math.round(v * 100))}
                  gradient={`linear-gradient(to right, #000, hsl(${h},${s}%,50%), #fff)`}
                />
              </SliderRow>
            </>
          )}

          {/* RGBA: only R, G, B — alpha is native above */}
          {mode === 'rgba' && (
            <>
              <SliderRow label={`R — ${r}`}>
                <ColorSlider
                  aria-label="Red"
                  value={r / 255}
                  onChange={(v) => handleRgbaChange(0, Math.round(v * 255))}
                  gradient={`linear-gradient(to right, rgba(0,${g},${b},1), rgba(255,${g},${b},1))`}
                />
              </SliderRow>
              <SliderRow label={`G — ${g}`}>
                <ColorSlider
                  aria-label="Green"
                  value={g / 255}
                  onChange={(v) => handleRgbaChange(1, Math.round(v * 255))}
                  gradient={`linear-gradient(to right, rgba(${r},0,${b},1), rgba(${r},255,${b},1))`}
                />
              </SliderRow>
              <SliderRow label={`B — ${b}`}>
                <ColorSlider
                  aria-label="Blue"
                  value={b / 255}
                  onChange={(v) => handleRgbaChange(2, Math.round(v * 255))}
                  gradient={`linear-gradient(to right, rgba(${r},${g},0,1), rgba(${r},${g},255,1))`}
                />
              </SliderRow>
            </>
          )}

          {/* Text readout */}
          <ColorRgbaInput color={draft} onChange={setDraft} />

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

function SliderRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}
