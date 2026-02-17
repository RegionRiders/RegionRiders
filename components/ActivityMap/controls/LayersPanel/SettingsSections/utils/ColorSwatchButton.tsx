import { Button } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';

interface ColorSwatchButtonProps {
  color: RGBA;
  index: number;
  selectedIndex: number;
  onClick?: () => void;
}

export function ColorSwatchButton({
  color,
  index,
  selectedIndex,
  onClick = () => {},
}: ColorSwatchButtonProps) {
  const rgbaColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
  const rgbaFilledColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;

  return (
    <Button
      key={index}
      onClick={onClick}
      variant={selectedIndex === index ? 'filled' : 'default'}
      style={{
        background: `
                          linear-gradient(to bottom, ${rgbaColor}, ${rgbaFilledColor}),
                          repeating-conic-gradient(
                            #ccc 0% 25%, 
                            #fff 0% 50%
                          ) 50% / 10px 10px
                        `,
        border:
          selectedIndex === index
            ? '2px solid var(--mantine-primary-color-filled)'
            : '1px solid var(--mantine-color-default-border)',
        padding: 0,
        borderRadius: '3px',
      }}
      aria-label={`Select color ${index + 1}`}
    />
  );
}
