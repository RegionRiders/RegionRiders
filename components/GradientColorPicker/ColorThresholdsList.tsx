import { Box, Group, Text, Title } from '@mantine/core';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

interface ColorThresholdsListProps {
  colorThresholds: ColorThreshold[];
  onChange: (index: number) => void;
}

export function ColorThresholdsList({ colorThresholds, onChange }: ColorThresholdsListProps) {
  return (
    <Box w={192}>
      <Title order={3}>Select color</Title>
      <Box
        mah="172px"
        style={{
          overflowY: 'scroll',
        }}
      >
        {colorThresholds.map((threshold, index) => (
          <Group key={index} onClick={() => onChange(index)}>
            <Box
              style={{
                backgroundColor: `rgba(${threshold.color.join(', ')})`,
                padding: '8px',
                border: '1px black solid',
              }}
            />
            <Text>Threshold: {threshold.threshold}</Text>
          </Group>
        ))}
      </Box>
    </Box>
  );
}
