import { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import classes from './ColorSwatchButton.module.css';

interface ColorSwatchButtonProps {
  color: RGBA;
  secondaryColor?: RGBA;
  colorThresholds?: ColorThreshold[];
  index?: number;
  selectedIndex?: number;
  ariaLabel?: string;
  onClick?: () => void;
  children?: ReactNode;
}

const VERTICAL_MASK = 'linear-gradient(to bottom, transparent 0%, black 100%)';

export function ColorSwatchButton({
  color,
  secondaryColor,
  colorThresholds,
  index,
  selectedIndex,
  ariaLabel,
  onClick = () => {},
  children,
}: ColorSwatchButtonProps) {
  const rgbaColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
  const rgbaFilledColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;

  const checkerboard = `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px`;

  const sharedButtonProps = {
    onClick,
    variant: selectedIndex === index ? ('filled' as const) : ('default' as const),
    className: classes.button,
    'aria-label': ariaLabel || `Select color ${index !== undefined ? index + 1 : 'preview'}`,
  };

  if (colorThresholds && colorThresholds.length > 0) {
    const minThreshold = colorThresholds[0].threshold;
    const maxThreshold = colorThresholds[colorThresholds.length - 1].threshold;
    const thresholdRange = maxThreshold - minThreshold;

    const toPosition = (threshold: number) =>
      thresholdRange === 0 ? 0 : ((threshold - minThreshold) / thresholdRange) * 100;

    const gradientStops = colorThresholds
      .map(({ threshold, color: c }) => {
        return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}) ${toPosition(threshold)}%`;
      })
      .join(', ');

    const gradientStopsOpaque = colorThresholds
      .map(({ threshold, color: c }) => {
        return `rgba(${c[0]}, ${c[1]}, ${c[2]}, 1) ${toPosition(threshold)}%`;
      })
      .join(', ');

    return (
      <Button
        {...sharedButtonProps}
        style={{ background: checkerboard, position: 'relative', overflow: 'hidden' }}
      >
        {/* Bottom layer: opaque gradient, masked to fade in from bottom */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, ${gradientStopsOpaque})`,
            maskImage: VERTICAL_MASK,
            WebkitMaskImage: VERTICAL_MASK,
            pointerEvents: 'none',
          }}
        />
        {/* Top layer: original gradient with native alpha (checkerboard visible at top) */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, ${gradientStops})`,
            pointerEvents: 'none',
          }}
        />
        {children}
      </Button>
    );
  }

  let background: string;

  if (secondaryColor) {
    const rgbaSecondary = `rgba(${secondaryColor[0]}, ${secondaryColor[1]}, ${secondaryColor[2]}, ${secondaryColor[3]})`;
    const rgbaSecondaryFilled = `rgba(${secondaryColor[0]}, ${secondaryColor[1]}, ${secondaryColor[2]}, 1)`;

    background = `
      linear-gradient(to bottom right, ${rgbaColor}, ${rgbaFilledColor} 50%, transparent 50%),
      linear-gradient(to top left, ${rgbaSecondary}, ${rgbaSecondaryFilled} 50%, transparent 50%),
      ${checkerboard}
    `;
  } else {
    background = `
      linear-gradient(to bottom, ${rgbaColor}, ${rgbaFilledColor}),
      ${checkerboard}
    `;
  }

  return (
    <Button {...sharedButtonProps} style={{ background }}>
      {children}
    </Button>
  );
}
