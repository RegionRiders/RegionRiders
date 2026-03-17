import { ReactNode } from 'react';
import { Box, Button, SimpleGrid, Stack, Text } from '@mantine/core';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { ColorSwatchButton } from '@/components/controls/ColorSwatchButton/ColorSwatchButton';

type StaticSwatch = {
  color: RGBA;
  secondaryColor?: RGBA;
};

type ThresholdedColorSchemeSwatchesGridProps = {
  mode: 'thresholded';
  label: string;
  swatches: ColorThreshold[][];
  selectedIndex: number;
  onSwatchSelect: (index: number) => void;
  renderEditButton: () => ReactNode;
  onCopy: () => void;
  onPaste: () => void;
};

type StaticColorSchemeSwatchesGridProps = {
  mode: 'static';
  label: string;
  swatches: StaticSwatch[];
  selectedIndex: number;
  onSwatchSelect: (index: number) => void;
  renderEditButton: () => ReactNode;
  renderStaticEditor: () => ReactNode;
};

type ColorSchemeSwatchesGridProps =
  | ThresholdedColorSchemeSwatchesGridProps
  | StaticColorSchemeSwatchesGridProps;

export function ColorSchemeSwatchesGrid(props: ColorSchemeSwatchesGridProps) {
  const { mode, label, swatches, selectedIndex, onSwatchSelect, renderEditButton } = props;
  const editorCols = swatches.length > 2 ? swatches.length : 2;

  return (
    <Stack gap="xs">
      <Text size="sm">{label}</Text>
      <SimpleGrid cols={swatches.length} spacing="xs">
        {mode === 'thresholded'
          ? swatches.map((thresholds, index) => (
              <ColorSwatchButton
                key={index}
                color={thresholds[0]?.color || [0, 0, 0, 0]}
                colorThresholds={thresholds}
                index={index}
                selectedIndex={selectedIndex}
                onClick={() => onSwatchSelect(index)}
              />
            ))
          : swatches.map((swatch, index) => (
              <ColorSwatchButton
                key={index}
                color={swatch.color}
                secondaryColor={swatch.secondaryColor}
                index={index}
                selectedIndex={selectedIndex}
                onClick={() => onSwatchSelect(index)}
              />
            ))}
      </SimpleGrid>
      <SimpleGrid cols={editorCols} spacing="xs">
        {renderEditButton()}
        <Box style={{ gridColumn: `span ${editorCols - 1}` }}>
          {mode === 'thresholded' ? (
            <SimpleGrid cols={2} spacing="xs">
              <Button size="xs" variant="default" onClick={props.onCopy} fullWidth>
                COPY
              </Button>
              <Button size="xs" variant="default" onClick={props.onPaste} fullWidth>
                PASTE
              </Button>
            </SimpleGrid>
          ) : (
            props.renderStaticEditor()
          )}
        </Box>
      </SimpleGrid>
    </Stack>
  );
}
