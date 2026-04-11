import { ReactNode } from 'react';
import { IconClipboard, IconCopy } from '@tabler/icons-react';
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
  onCopy?: () => void;
  onPaste?: () => void;
  renderEditorPanel?: (editorCols: number) => ReactNode;
};

type StaticColorSchemeSwatchesGridProps = {
  mode: 'static';
  label: string;
  swatches: StaticSwatch[];
  selectedIndex: number;
  onSwatchSelect: (index: number) => void;
  renderEditButton: () => ReactNode;
  onCopy?: () => void;
  onPaste?: () => void;
  renderEditorPanel?: (editorCols: number) => ReactNode;
};

type ColorSchemeSwatchesGridProps =
  | ThresholdedColorSchemeSwatchesGridProps
  | StaticColorSchemeSwatchesGridProps;

export function ColorSchemeSwatchesGrid(props: ColorSchemeSwatchesGridProps) {
  const {
    mode,
    label,
    swatches,
    selectedIndex,
    onSwatchSelect,
    renderEditButton,
    renderEditorPanel,
  } = props;
  const editorCols = swatches.length > 2 ? swatches.length : 2;
  const swatchKeyCounts = new Map<string, number>();
  const getUniqueSwatchKey = (baseKey: string): string => {
    const currentCount = swatchKeyCounts.get(baseKey) ?? 0;
    swatchKeyCounts.set(baseKey, currentCount + 1);
    return currentCount === 0 ? baseKey : `${baseKey}-${currentCount}`;
  };

  if (swatches.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Stack gap={0}>
        <Text size="sm">{label}</Text>
        <SimpleGrid cols={swatches.length} spacing="xs">
          {mode === 'thresholded'
            ? swatches.map((thresholds, index) => (
                <ColorSwatchButton
                  key={getUniqueSwatchKey(JSON.stringify(thresholds))}
                  color={thresholds[0]?.color || [0, 0, 0, 0]}
                  colorThresholds={thresholds}
                  index={index}
                  selectedIndex={selectedIndex}
                  onClick={() => onSwatchSelect(index)}
                />
              ))
            : swatches.map((swatch, index) => (
                <ColorSwatchButton
                  key={getUniqueSwatchKey(
                    `${swatch.color.join(',')}|${swatch.secondaryColor?.join(',') ?? ''}`
                  )}
                  color={swatch.color}
                  secondaryColor={swatch.secondaryColor}
                  index={index}
                  selectedIndex={selectedIndex}
                  onClick={() => onSwatchSelect(index)}
                />
              ))}
        </SimpleGrid>
      </Stack>
      <SimpleGrid cols={editorCols} spacing="xs">
        {renderEditButton()}
        {renderEditorPanel ? (
          renderEditorPanel(editorCols)
        ) : (
          <Box style={{ gridColumn: `span ${editorCols - 1}` }}>
            <SimpleGrid cols={2} spacing="xs">
              <Button leftSection={<IconCopy />} onClick={props.onCopy} fullWidth p={0}>
                Copy
              </Button>
              <Button leftSection={<IconClipboard />} onClick={props.onPaste} fullWidth p={0}>
                Paste
              </Button>
            </SimpleGrid>
          </Box>
        )}
      </SimpleGrid>
    </Stack>
  );
}
