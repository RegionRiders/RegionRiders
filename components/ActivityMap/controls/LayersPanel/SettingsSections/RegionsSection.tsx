import { Accordion, Group, Switch, Text } from '@mantine/core';

export function RegionsSection({
  showBorders,
  onShowBordersChange,
}: Pick<LayersPanelProps, 'onShowBordersChange' | 'showBorders'>) {
  return (
    <Accordion.Item value="regions">
      <Accordion.Control>
        <Group justify="space-between" w="100%">
          <Switch
            checked={showBorders}
            onChange={(e) => onShowBordersChange?.(e.currentTarget.checked)}
            aria-label="Toggle region borders"
          />
          <Text fw={600} size="sm" mr="auto">
            Regions
          </Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>{/* Add future Regions content here */}</Accordion.Panel>
    </Accordion.Item>
  );
}
