'use client';

import React, { useEffect, useState } from 'react';
import { ColorPicker, SegmentedControl, Stack, Text } from '@mantine/core';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';
import { hslaToRgba, parseHslaString, rgbaToHsla } from '../../ActivityMap/utils/hslaUtils';
import { ColorSlider } from '../ColorSlider/ColorSlider';
import { ColorHslaTextInput } from '../ColorTextInputs/ColorHslaTextInput';
import { ColorRgbaTextInput } from '../ColorTextInputs/ColorRgbaTextInput';
import classes from './ExtendedColorPicker.module.css';

export type SliderMode = 'hsla' | 'rgba';
export type SliderLayout = 'vertical' | 'horizontal';

export interface ExtendedColorPickerProps {
  color: RGBA;
  onChange: (color: RGBA) => void;
  defaultMode?: SliderMode;
  layout?: SliderLayout;
  mode?: SliderMode;
  onModeChange?: (mode: SliderMode) => void;
}

export function ExtendedColorPicker({
  color,
  onChange,
  defaultMode = 'hsla',
  layout = 'vertical',
  mode: controlledMode,
  onModeChange,
}: ExtendedColorPickerProps) {
  const [internalMode, setInternalMode] = useState<SliderMode>(defaultMode);
  const [hsla, setHsla] = useState(() => rgbaToHsla(...color));
  const [rgba, setRgba] = useState<RGBA>(color);

  useEffect(() => {
    setRgba(color);
    setHsla(rgbaToHsla(...color));
  }, [color]);

  // Use controlled mode if provided, otherwise use internal mode
  const mode = controlledMode !== undefined ? controlledMode : internalMode;
  const setMode = (newMode: SliderMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

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

  const isSide = layout === 'horizontal';
  const orientation = isSide ? 'vertical' : 'horizontal';
  const dir = isSide ? 'to top' : 'to right';

  const hslaSliders = (
    <>
      <SliderCol letter="S" value={`${sD}%`} layout={layout}>
        <ColorSlider
          aria-label="Saturation"
          orientation={orientation}
          value={s / 100}
          onChange={(v) => handleHslaChange('s', v * 100)}
          gradient={`linear-gradient(${dir}, hsl(${hD},0%,${lD}%), hsl(${hD},100%,${lD}%))`}
        />
      </SliderCol>
      <SliderCol letter="L" value={`${lD}%`} layout={layout}>
        <ColorSlider
          aria-label="Lightness"
          orientation={orientation}
          value={l / 100}
          onChange={(v) => handleHslaChange('l', v * 100)}
          gradient={`linear-gradient(${dir}, #000, hsl(${hD},${sD}%,50%), #fff)`}
        />
      </SliderCol>
    </>
  );

  const rgbaSliders = (
    <>
      <SliderCol letter="R" value={String(r)} layout={layout}>
        <ColorSlider
          aria-label="Red"
          orientation={orientation}
          value={r / 255}
          onChange={(v) => handleRgbaChange(0, Math.round(v * 255))}
          gradient={`linear-gradient(${dir}, rgba(0,${g},${b},1), rgba(255,${g},${b},1))`}
        />
      </SliderCol>
      <SliderCol letter="G" value={String(g)} layout={layout}>
        <ColorSlider
          aria-label="Green"
          orientation={orientation}
          value={g / 255}
          onChange={(v) => handleRgbaChange(1, Math.round(v * 255))}
          gradient={`linear-gradient(${dir}, rgba(${r},0,${b},1), rgba(${r},255,${b},1))`}
        />
      </SliderCol>
      <SliderCol letter="B" value={String(b)} layout={layout}>
        <ColorSlider
          aria-label="Blue"
          orientation={orientation}
          value={b / 255}
          onChange={(v) => handleRgbaChange(2, Math.round(v * 255))}
          gradient={`linear-gradient(${dir}, rgba(${r},${g},0,1), rgba(${r},${g},255,1))`}
        />
      </SliderCol>
    </>
  );

  const textInput =
    mode === 'rgba' ? (
      <ColorRgbaTextInput color={rgba} onChange={syncFromRgba} />
    ) : (
      <ColorHslaTextInput
        h={h}
        s={s}
        l={l}
        a={a}
        onChange={(h, s, l, a) => syncFromHsla({ h, s, l, a })}
      />
    );

  const modeToggle = (
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
  );

  if (isSide) {
    return (
      <Stack className={classes.stack}>
        {/* Top row: ColorPicker + vertical sliders */}
        <div className={classes.horizontalLayout}>
          <div className={classes.horizontalLayoutPicker}>
            <ColorPicker
              format="hsla"
              value={pickerValue}
              onChange={handlePickerChange}
              p={0}
              style={{ width: '100%' }}
            />
          </div>
          <div className={classes.horizontalLayoutSliders}>
            {mode === 'hsla' ? hslaSliders : rgbaSliders}
          </div>
        </div>

        <div className={classes.bottomRow}>
          <div className={classes.bottomRowInput}>{textInput}</div>
          <div className={classes.bottomRowToggle}>{modeToggle}</div>
        </div>
      </Stack>
    );
  }

  return (
    <Stack className={classes.stack}>
      <ColorPicker
        format="hsla"
        value={pickerValue}
        onChange={handlePickerChange}
        fullWidth
        p={0}
      />
      <Stack className={classes.stack}>{mode === 'hsla' ? hslaSliders : rgbaSliders}</Stack>
      {modeToggle}
      {textInput}
    </Stack>
  );
}

interface SliderColProps {
  letter: string;
  value: string;
  layout: SliderLayout;
  children: React.ReactNode;
}

function SliderCol({ letter, value, layout, children }: SliderColProps) {
  if (layout === 'vertical') {
    return (
      <div className={classes.sliderRow}>
        <div className={classes.sliderRowTrack}>{children}</div>
        <Text size="xs" c="dimmed" className={classes.sliderRowLabel}>
          {letter}: {value}
        </Text>
      </div>
    );
  }

  // horizontal
  return (
    <div className={classes.verticalSliderCol}>
      <Text size="xs" c="dimmed" className={classes.verticalSliderLetter}>
        {letter}
      </Text>
      <div className={classes.verticalSliderTrack}>{children}</div>
    </div>
  );
}
