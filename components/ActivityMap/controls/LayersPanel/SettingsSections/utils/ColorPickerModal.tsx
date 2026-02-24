'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  ColorPicker,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
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
  return { h: h * 360, s: s * 100, l: l * 100, a };
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
  const [mode, setMode] = useState<SliderMode>('hsla');

  // HSLA stored at full float — authoritative source for HSLA mode
  const [hsla, setHsla] = useState<HSLA>(() => rgbaToHsla(...color));

  // RGBA stored as integers — authoritative source for RGBA mode
  const [rgba, setRgba] = useState<RGBA>(color);

  // Derived RGBA from current hsla — used for preview swatch and output in HSLA mode
  const rgbaFromHsla: RGBA = hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a);

  function handleOpen() {
    setHsla(rgbaToHsla(...color));
    setRgba(color);
    open();
  }

  function handleClose() {
    close();
  }

  // Native picker emits hsla(...) strings — set hsla directly, sync rgba
  function handlePickerChange(value: string) {
    const match = value.match(
      /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (match) {
      const next: HSLA = {
        h: parseFloat(match[1]),
        s: parseFloat(match[2]),
        l: parseFloat(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
      setHsla(next);
      setRgba(hslaToRgba(next.h, next.s, next.l, next.a));
      return;
    }
    const parsed = parseColorToRgba(value);
    if (parsed) {
      setRgba(parsed);
      setHsla(rgbaToHsla(...parsed));
    }
  }

  // HSLA sliders — write directly to hsla, sync rgba
  function handleHslaChange(key: keyof HSLA, value: number) {
    setHsla((prev) => {
      const next = { ...prev, [key]: value };
      setRgba(hslaToRgba(next.h, next.s, next.l, next.a));
      return next;
    });
  }

  // RGBA sliders — write directly to rgba, sync hsla
  function handleRgbaChange(index: 0 | 1 | 2 | 3, value: number) {
    setRgba((prev) => {
      const next = [...prev] as RGBA;
      next[index] = value;
      setHsla(rgbaToHsla(...next));
      return next;
    });
  }

  // Text input — syncs both
  function handleTextInput(parsed: RGBA) {
    setRgba(parsed);
    setHsla(rgbaToHsla(...parsed));
  }

  function handleOk() {
    onColorChange(mode === 'hsla' ? rgbaFromHsla : rgba);
    close();
  }

  // Display values — rounded only for labels and slider positions
  const { h, s, l, a } = hsla;
  const hD = Math.round(h);
  const sD = Math.round(s);
  const lD = Math.round(l);
  const [r, g, b] = rgba;

  const pickerValue = `hsla(${hD}, ${sD}%, ${lD}%, ${a})`;

  return (
    <>
      <ColorSwatchButton color={mode === 'hsla' ? rgbaFromHsla : rgba} onClick={handleOpen} />

      <Modal
        opened={opened}
        onClose={handleClose}
        title="Pick a color"
        centered
        zIndex={9999}
        portalProps={{ target: document.body }}
        size="xs"
      >
        <Stack gap="calc(0.375rem * var(--mantine-scale))">
          <ColorPicker
            format="hsla"
            value={pickerValue}
            onChange={handlePickerChange}
            fullWidth
            p={0}
          />

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

          {mode === 'rgba' && <ColorRgbaInput color={rgba} onChange={handleTextInput} />}
          {mode === 'hsla' && (
            <ColorHslaInput
              hsla={hsla}
              onChange={(parsed) => {
                setHsla(parsed);
                setRgba(hslaToRgba(parsed.h, parsed.s, parsed.l, parsed.a));
              }}
            />
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={handleClose}>
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
    <Group gap="xs" wrap="nowrap" align="center">
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <Text size="xs" c="dimmed" w={42} ta="left" style={{ flexShrink: 0 }}>
        {label}
      </Text>
    </Group>
  );
}

function hslaToString({ h, s, l, a }: HSLA): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${+a.toFixed(2)})`;
}

function ColorHslaInput({ hsla, onChange }: { hsla: HSLA; onChange: (hsla: HSLA) => void }) {
  const [inputValue, setInputValue] = useState(() => hslaToString(hsla));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setInputValue(hslaToString(hsla));
    }
  }, [hsla]);

  const apply = () => {
    isFocused.current = false;
    const match = inputValue.match(
      /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (match) {
      onChange({
        h: parseFloat(match[1]),
        s: parseFloat(match[2]),
        l: parseFloat(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      });
      return;
    }
    // Reset on invalid input
    setInputValue(hslaToString(hsla));
  };

  return (
    <TextInput
      value={inputValue}
      onChange={(e) => setInputValue(e.currentTarget.value)}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={apply}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
