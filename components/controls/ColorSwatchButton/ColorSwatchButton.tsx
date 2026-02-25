import { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import classes from './ColorSwatchButton.module.css';

interface ColorSwatchButtonProps {
  color: RGBA;
  index?: number;
  selectedIndex?: number;
  onClick?: () => void;
  children?: ReactNode;
}

export function ColorSwatchButton({
  color,
  index,
  selectedIndex,
  onClick = () => {},
  children,
}: ColorSwatchButtonProps) {
  const rgbaColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
  const rgbaFilledColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;

  return (
    <Button
      key={index}
      onClick={onClick}
      variant={selectedIndex === index ? 'filled' : 'default'}
      className={classes.button}
      style={{
        background: `
          linear-gradient(to bottom, ${rgbaColor}, ${rgbaFilledColor}),
          repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px
        `,
      }}
      aria-label={`Select color ${index !== undefined ? index + 1 : 'preview'}`}
    >
      {children}
    </Button>
  );
}
