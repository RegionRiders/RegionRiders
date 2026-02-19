import { useState } from 'react';
import {
  Button,
  ColorPicker,
  ColorSwatch,
  Group,
  Modal,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';

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

// ─── Slider style helper ──────────────────────────────────────────────────────

function gradientTrack(gradient: string) {
  return {
    track: {
      background: gradient,
      '&::before': { background: 'transparent' },
    },
    bar: { background: 'transparent' },
  };
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
    setDraft(color); // always reset draft to current committed color
    open();
  }

  function handlePickerChange(value: string) {
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
  const cssOpaque = `rgba(${r}, ${g}, ${b}, 1)`;
  const colorString = rgbaToString(draft);

  return (
    <>
      <ColorSwatch
        color={rgbaToString(color)}
        onClick={handleOpen}
        style={{ cursor: 'pointer' }}
        size={28}
        withShadow
      />

      <Modal
        opened={opened}
        onClose={close}
        title="Pick a color"
        size="xs"
        centered
        zIndex={9999}
        portalProps={{ target: document.body }}
      >
        <Stack gap="md">
          {/* 2D picker synced with draft */}
          <ColorPicker format="rgba" value={colorString} onChange={handlePickerChange} fullWidth />

          {/* Slider mode toggle */}
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as SliderMode)}
            data={[
              { label: 'HSLA', value: 'hsla' },
              { label: 'RGBA', value: 'rgba' },
            ]}
            fullWidth
          />

          {/* HSLA sliders */}
          {mode === 'hsla' && (
            <Stack gap="xs">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Hue — {h}°
                </Text>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={h}
                  onChange={(v) => handleHslaChange('h', v)}
                  styles={gradientTrack(
                    'linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))'
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Saturation — {s}%
                </Text>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={s}
                  onChange={(v) => handleHslaChange('s', v)}
                  styles={gradientTrack(
                    `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Lightness — {l}%
                </Text>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={l}
                  onChange={(v) => handleHslaChange('l', v)}
                  styles={gradientTrack(
                    `linear-gradient(to right, #000, hsl(${h},${s}%,50%), #fff)`
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Alpha — {a.toFixed(2)}
                </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={a}
                  onChange={(v) => handleHslaChange('a', v)}
                  styles={gradientTrack(`linear-gradient(to right, transparent, ${cssOpaque})`)}
                />
              </Stack>
            </Stack>
          )}

          {/* RGBA sliders */}
          {mode === 'rgba' && (
            <Stack gap="xs">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Red — {r}
                </Text>
                <Slider
                  min={0}
                  max={255}
                  step={1}
                  value={r}
                  onChange={(v) => handleRgbaChange(0, v)}
                  styles={gradientTrack(
                    `linear-gradient(to right, rgba(0,${g},${b},1), rgba(255,${g},${b},1))`
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Green — {g}
                </Text>
                <Slider
                  min={0}
                  max={255}
                  step={1}
                  value={g}
                  onChange={(v) => handleRgbaChange(1, v)}
                  styles={gradientTrack(
                    `linear-gradient(to right, rgba(${r},0,${b},1), rgba(${r},255,${b},1))`
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Blue — {b}
                </Text>
                <Slider
                  min={0}
                  max={255}
                  step={1}
                  value={b}
                  onChange={(v) => handleRgbaChange(2, v)}
                  styles={gradientTrack(
                    `linear-gradient(to right, rgba(${r},${g},0,1), rgba(${r},${g},255,1))`
                  )}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Alpha — {a.toFixed(2)}
                </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={a}
                  onChange={(v) => handleRgbaChange(3, v)}
                  styles={gradientTrack(`linear-gradient(to right, transparent, ${cssOpaque})`)}
                />
              </Stack>
            </Stack>
          )}

          {/* RGBA readout */}
          <Text size="sm" ta="center" c="dimmed" ff="monospace">
            {colorString}
          </Text>

          {/* Actions */}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button onClick={handleOk}>OK</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
