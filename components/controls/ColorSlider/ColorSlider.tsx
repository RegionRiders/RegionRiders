'use client';

import React, { useCallback } from 'react';
import { useMove } from '@mantine/hooks';
import classes from './ColorSlider.module.css';

interface ColorSliderProps {
  value: number; // normalised 0–1
  onChange: (value: number) => void;
  gradient: string;
  'aria-label'?: string;
}

export function ColorSlider({
  value,
  onChange,
  gradient,
  'aria-label': ariaLabel,
}: ColorSliderProps) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const { ref } = useMove(({ x }) => onChange(clamp(x)));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(clamp(value + step));
      }
      if (e.key === 'ArrowLeft') {
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
    [value, onChange]
  );

  return (
    <div
      ref={ref as unknown as React.RefObject<HTMLDivElement>}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={classes.slider}
    >
      <div className={classes.track} style={{ backgroundImage: gradient }} />

      <div
        className={classes.thumb}
        style={{ left: `calc(${value * 100}% - var(--cp-thumb-size, 16px) / 2)` }}
      />
    </div>
  );
}
