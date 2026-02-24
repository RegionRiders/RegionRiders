'use client';

import { useCallback } from 'react';
import { useMove } from '@mantine/hooks';

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

  // Mirrors .slider: height = thumbSize + 2px, margin-inline = thumbSize / 2
  // thumbSize at default (sm) = 16px → height: 18px, margin-inline: 6px
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
      style={{
        // .slider
        position: 'relative',
        height: 'calc(var(--cp-thumb-size, 16px) + 2px)',
        marginInline: 'calc(var(--cp-thumb-size, 16px) / 2)',
        outline: 'none',
        cursor: 'crosshair',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* .sliderOverlay — the actual visible track, wider than the wrapper */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          insetInline: 'calc(var(--cp-thumb-size, 16px) * -1 / 2 - 1px)',
          borderRadius: '10000rem',
          backgroundImage: gradient,
        }}
      />

      {/* .thumb — positioned inside the wrapper coordinate space */}
      <div
        style={{
          overflow: 'hidden',
          position: 'absolute',
          boxShadow: '0 0 1px rgba(0, 0, 0, 0.6)',
          border: '2px solid var(--mantine-color-white)',
          width: 'var(--cp-thumb-size, 16px)',
          height: 'var(--cp-thumb-size, 16px)',
          borderRadius: 'var(--cp-thumb-size, 16px)',
          // mirrors: left: calc(var(--thumb-x-offset) - thumbSize / 2)
          // --thumb-x-offset is a percentage of the slider width
          left: `calc(${value * 100}% - var(--cp-thumb-size, 16px) / 2)`,
          top: 'calc(50% - var(--cp-thumb-size, 16px) / 2)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}
