import { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import classes from './ColorSwatchButton.module.css';

interface ColorSwatchButtonProps {
  color: RGBA;
  secondaryColor?: RGBA;
  index?: number;
  selectedIndex?: number;
  onClick?: () => void;
  children?: ReactNode;
}

export function ColorSwatchButton({
  color,
  secondaryColor,
  index,
  selectedIndex,
  onClick = () => {},
  children,
}: ColorSwatchButtonProps) {
  const rgbaColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
  const rgbaFilledColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;

  const checkerboard = `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px`;

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
    <Button
      key={index}
      onClick={onClick}
      variant={selectedIndex === index ? 'filled' : 'default'}
      className={classes.button}
      style={{ background }}
      aria-label={`Select color ${index !== undefined ? index + 1 : 'preview'}`}
    >
      {children}
    </Button>
  );
}
