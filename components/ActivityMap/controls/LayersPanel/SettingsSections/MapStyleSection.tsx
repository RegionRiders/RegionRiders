import { Accordion, Text } from '@mantine/core';

export function MapStyleSection() {
  return (
    <Accordion.Item value="mapstyle">
      <Accordion.Control>
        <Text fw={600} size="sm" mr="auto">
          Map Style
        </Text>
      </Accordion.Control>
      <Accordion.Panel>hello</Accordion.Panel>
    </Accordion.Item>
  );
}
