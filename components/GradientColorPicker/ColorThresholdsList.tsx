import { useEffect } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

interface ColorThresholdsListProps {
  colorThresholds: ColorThreshold[];
  onChange: (index: number) => void;
  activeIndex: number;
}

export function ColorThresholdsList({
  colorThresholds,
  onChange,
  activeIndex,
}: ColorThresholdsListProps) {
  useEffect(() => {
    const activeElement = document.querySelector(`[data-index="${activeIndex}"]`);
    activeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex]);

  return (
    <Stack
      style={{
        flex: '1 1 auto',
      }}
      gap="sm"
    >
      {/*<Text size="lg">Select color</Text>*/}
      <Stack
        style={{
          // maxHeight: '172px',
          overflow: 'auto',
          flex: '0 0 100%',
        }}
        gap={0}
      >
        {colorThresholds.map((threshold, index) => (
          <Group
            key={index}
            data-index={index}
            onClick={() => onChange(index)}
            p={6}
            style={{
              borderBottom: `1px solid #ccc`,
              cursor: 'pointer',
              backgroundColor: index === activeIndex ? '#e9e9e9' : 'transparent',
              '&:hover': { backgroundColor: index === activeIndex ? '#e5e5e5' : '#f5f5f5' },
            }}
          >
            <Box
              style={{
                backgroundColor: `rgba(${threshold.color.join(', ')})`,
                border: '1px black solid',
              }}
              p="8"
            />
            <Text
              style={{
                userSelect: 'none',
              }}
              size="sm"
            >
              Threshold: {threshold.threshold}
            </Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
