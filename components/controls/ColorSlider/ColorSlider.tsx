'use client';

import { useCallback } from 'react';
import { useMove } from '@mantine/hooks';
import classes from './ColorSlider.module.css';

interface ColorSliderProps {
  value: number; // normalised 0–1
  onChange: (value: number) => void;
  gradient: string;
  orientation?: 'horizontal' | 'vertical';
  'aria-label'?: string;
}

export function ColorSlider({
  value,
  onChange,
  gradient,
  orientation = 'horizontal',
  'aria-label': ariaLabel,
}: ColorSliderProps) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const isVertical = orientation === 'vertical';

  // For vertical: track y, invert so bottom = 0, top = 1
  const { ref } = useMove(({ x, y }) => onChange(clamp(isVertical ? 1 - y : x)));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      const incKey = isVertical ? 'ArrowUp' : 'ArrowRight';
      const decKey = isVertical ? 'ArrowDown' : 'ArrowLeft';
      if (e.key === incKey) {
        e.preventDefault();
        onChange(clamp(value + step));
      }
      if (e.key === decKey) {
        e.preventDefault();
        onChange(clamp(value - step));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        onChange(1);
      }
    },
    [value, onChange, isVertical]
  );

  const thumbStyle = isVertical
    ? { bottom: `calc(${value * 100}% - var(--cp-thumb-size, 16px) / 2)` }
    : { left: `calc(${value * 100}% - var(--cp-thumb-size, 16px) / 2)` };

  const gradientStyle = isVertical
    ? { backgroundImage: gradient.replace('to right', 'to top') }
    : { backgroundImage: gradient };

  return (
    <div
      ref={ref as unknown as React.RefObject<HTMLDivElement>}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-orientation={orientation}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={isVertical ? `${classes.slider} ${classes.sliderVertical}` : classes.slider}
    >
      <div
        className={isVertical ? `${classes.track} ${classes.trackVertical}` : classes.track}
        style={gradientStyle}
      />
      <div
        className={isVertical ? `${classes.thumb} ${classes.thumbVertical}` : classes.thumb}
        style={thumbStyle}
      />
    </div>
  );
}
